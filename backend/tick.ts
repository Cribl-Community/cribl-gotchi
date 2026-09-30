import { createSave, isAction, reduce, safeUserId } from '../src/game/engine.ts';
import type { Action, AlertKind, PetRun, UserSave } from '../src/game/types.ts';
import { readWorkspaceTelemetry, withGremlinFeed } from './telemetry.ts';

interface TickBody {
  mode?: string;
  userId?: string;
  displayName?: string;
  action?: unknown;
  sessionWebhook?: string;
  gremlinFeed?: boolean;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stateKey(userId: string): string {
  return `users/${safeUserId(userId)}/state`;
}

function webhookKey(userId: string): string {
  return `users/${safeUserId(userId)}/webhook`;
}

async function readSave(userId: string, displayName: string): Promise<UserSave> {
  const res = await fetch(`/api/v1/kvstore/${stateKey(userId)}`);
  if (!res.ok) return createSave(safeUserId(userId), displayName);
  try {
    const parsed = JSON.parse(await res.text()) as UserSave;
    if (parsed?.version !== 1) throw new Error('bad save');
    parsed.userId = safeUserId(userId);
    return parsed;
  } catch {
    return createSave(safeUserId(userId), displayName);
  }
}

async function writeSave(save: UserSave): Promise<void> {
  await fetch(`/api/v1/kvstore/${stateKey(save.userId)}`, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(save),
  });
}

function allowedWebhook(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    const hostOk = url.hostname === 'hooks.slack.com' || url.hostname === 'discord.com' || url.hostname === 'discordapp.com';
    const pathOk =
      (url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/')) ||
      (url.hostname !== 'hooks.slack.com' && url.pathname.startsWith('/api/webhooks/'));
    if (url.protocol !== 'https:' || !hostOk || !pathOk) return null;
    return url;
  } catch {
    return null;
  }
}

async function storeWebhook(userId: string, raw: string): Promise<string | null> {
  const url = allowedWebhook(raw);
  if (!url) return 'The pet only screams into Slack or Discord. Other websites are not emotionally available.';
  const res = await fetch(`/api/v1/kvstore/${webhookKey(userId)}?encrypted=true`, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: url.toString(),
  });
  return res.ok ? null : 'The encrypted scream pipe refused the note.';
}

async function deleteWebhook(userId: string): Promise<void> {
  await fetch(`/api/v1/kvstore/${webhookKey(userId)}`, { method: 'DELETE' });
}

async function resolveWebhook(userId: string, sessionWebhook?: string): Promise<URL | null> {
  if (sessionWebhook) {
    const fromSession = allowedWebhook(sessionWebhook);
    if (fromSession) return fromSession;
  }
  // Encrypted values read back redacted, so a plain GET can only ever yield asterisks.
  for (const suffix of ['?encrypted=true', '']) {
    const res = await fetch(`/api/v1/kvstore/${webhookKey(userId)}${suffix}`).catch(() => null);
    if (!res?.ok) continue;
    const text = (await res.text().catch(() => '')).trim();
    if (!text || text.includes('*') || text.toLowerCase().includes('redact')) continue;
    const url = allowedWebhook(text);
    if (url) return url;
  }
  return null;
}

const ART: Record<AlertKind, string> = {
  test: [
    '  .-----------.',
    '  | .-------. |',
    '  | | o   o | |',
    '  | |  ---  | |',
    "  | '-------' |",
    '  |  O  O  O  |',
    "  '-----------'",
    '   PIPE OK',
  ].join('\n'),
  health: [
    '  .-----------.',
    '  | .-------. |',
    '  | | X   X | |',
    '  | |  /\\/  | |',
    "  | '-------' |",
    '  |  O  O  O  |',
    "  '-----------'",
    '   !! SICK !!',
  ].join('\n'),
  death: [
    '      ___',
    '     /   \\',
    '    | R.I.P |',
    '    |  x x  |',
    '    |   _   |',
    '    |_______|',
    '   ~~~~~~~~~~~',
  ].join('\n'),
};

function screamText(kind: AlertKind, pet: PetRun | null): string {
  const art = '```\n' + ART[kind] + '\n```';
  if (kind === 'test') {
    return `${art}\nCribl-gotchi test scream. The pipe works. The pet is already embarrassed.`;
  }
  if (!pet) return `${art}\nCribl-gotchi screamed, but the pet is missing. That is worse.`;
  if (kind === 'death') {
    const lived = Math.floor(pet.lifespanSeconds);
    return [
      art,
      `**${pet.name}** is dead. Level ${pet.maxLevelReached}, ${pet.difficulty} difficulty, lasted ${lived}s.`,
      `Cause: ${pet.deathCause}`,
      `Epitaph: _${pet.epitaph}_`,
    ].join('\n');
  }
  return [
    art,
    `Cribl-gotchi emergency: **${pet.name}** is at ${Math.round(pet.health)}% and making a scene.`,
    `"${pet.speech}"`,
  ].join('\n');
}

async function scream(url: URL, text: string): Promise<{ ok: boolean; status: number }> {
  const discord = url.hostname !== 'hooks.slack.com';
  // Slack mrkdwn uses single asterisks for bold.
  const body = discord ? text : text.replace(/\*\*(.+?)\*\*/g, '*$1*');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      discord
        ? { username: 'Cribl-gotchi', content: body.slice(0, 1800) }
        : { text: body.slice(0, 1800) },
    ),
  });
  return { ok: res.ok, status: res.status };
}

async function tickOne(
  userId: string,
  displayName: string,
  action: Action | null,
  gremlinFeed: boolean,
  sessionWebhook?: string,
): Promise<{ save: UserSave; events: string[]; telemetrySummary: string; telemetryDiag: string; alertSent: boolean; died: boolean }> {
  const save = await readSave(userId, displayName);
  let telemetry = await readWorkspaceTelemetry();
  if (gremlinFeed) telemetry = withGremlinFeed(telemetry);
  const result = reduce(save, telemetry, Date.now(), action);
  if (action?.type === 'arm_webhook') {
    if (!sessionWebhook) {
      result.save.settings.webhookArmed = false;
      result.save.settings.webhookHost = null;
      result.events.push('Paste a webhook first. The pet will not guess.');
    } else {
      const error = await storeWebhook(userId, sessionWebhook);
      if (error) {
        result.save.settings.webhookArmed = false;
        result.save.settings.webhookHost = null;
        result.events.push(error);
      }
    }
  }
  if (action?.type === 'disarm_webhook') await deleteWebhook(userId);
  await writeSave(result.save);
  let alertSent = false;
  if (result.shouldAlert && result.alertKind) {
    const url = await resolveWebhook(userId, sessionWebhook);
    const text = screamText(result.alertKind, result.save.current);
    if (!url) {
      result.events.push('No webhook on this tick. Paste it again and test. Encrypted copies cannot be read back.');
    } else {
      const sent = await scream(url, text).catch(() => ({ ok: false, status: 0 }));
      alertSent = sent.ok;
      result.events.push(sent.ok ? `Scream landed (${sent.status}).` : `Scream failed (${sent.status}).`);
    }
  }
  return {
    save: result.save,
    events: result.events.slice(-6),
    telemetrySummary: telemetry.summary,
    telemetryDiag: telemetry.diag ?? `source=${telemetry.source}`,
    alertSent,
    died: result.died,
  };
}

async function listUserIds(): Promise<string[]> {
  const res = await fetch('/api/v1/kvstore/keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prefix: 'users/' }),
  });
  if (!res.ok) return [];
  const payload = (await res.json().catch(() => null)) as unknown;
  const keys: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') keys.push(node);
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(payload);
  return [
    ...new Set(
      keys
        .filter((key) => key.endsWith('/state'))
        .map((key) => key.split('/')[1] ?? '')
        .filter(Boolean),
    ),
  ].slice(0, 40);
}

export async function onRequest(request: Request, context: { appId: string }): Promise<Response> {
  if (request.method === 'GET') {
    return json({ ok: true, appId: context.appId, pet: 'awake', hint: 'POST a tick. The pet is bored.' });
  }
  if (request.method !== 'POST') return json({ error: 'The pet only speaks POST.' }, 405);

  let body: TickBody = {};
  try {
    body = (await request.json()) as TickBody;
  } catch {
    body = {};
  }

  if (body.mode === 'sweep') {
    const ids = await listUserIds();
    let swept = 0;
    for (const userId of ids) {
      await tickOne(userId, 'sweep', null, false);
      swept += 1;
    }
    return json({ ok: true, swept });
  }

  const userId = safeUserId(body.userId ?? 'local_gremlin');
  const action = isAction(body.action) ? body.action : null;
  if (body.action && !action) return json({ error: 'That action is not in the pet manual.' }, 400);
  const result = await tickOne(userId, body.displayName ?? userId, action, Boolean(body.gremlinFeed), body.sessionWebhook);
  return json({ ok: true, ...result });
}
