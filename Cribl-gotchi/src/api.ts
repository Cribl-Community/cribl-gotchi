import type { CriblUser } from './cribl';
import { debugLog, hostSnapshot, resolveAppId } from './debugLog.ts';
import { calmTelemetry, createSave, reduce, safeUserId } from './game/engine.ts';
import type { Action, Telemetry, UserSave } from './game/types.ts';

export interface TickResponse {
  ok: boolean;
  save: UserSave;
  events: string[];
  telemetrySummary: string;
  telemetryDiag?: string;
  alertSent: boolean;
  died: boolean;
  local?: boolean;
}

export async function currentUser(): Promise<CriblUser> {
  if (window.getCriblUser) {
    try {
      return await window.getCriblUser();
    } catch {
      /* live preview can boot before the host injects identity */
    }
  }
  return { id: 'local-gremlin', username: 'local-gremlin', firstName: 'Local' };
}

export function displayName(user: CriblUser): string {
  const named = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return named || user.username || 'Chaos Junkie';
}

function appBase(): string | null {
  const base = window.CRIBL_API_URL?.replace(/\/$/, '');
  const appId = resolveAppId();
  if (!base || !appId) {
    debugLog('warn', `no app scope. ${hostSnapshot()}`);
    return null;
  }
  if (/\/a\/[^/]+$/.test(base)) return base;
  return `${base}/a/${encodeURIComponent(appId)}`;
}

function endpoint(): string | null {
  const base = appBase();
  return base ? `${base}/endpoints/tick` : null;
}

async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch (error) {
    return error instanceof Error ? error.message : 'unreadable body';
  }
}

function forLog(text: string): string {
  return text.length > 700 ? `${text.slice(0, 700)}...[${text.length} bytes]` : text;
}

export async function loadSave(user: CriblUser): Promise<UserSave> {
  const url = endpoint();
  if (!url) return createSave(safeUserId(user.id), displayName(user));
  debugLog('info', `load POST ${url}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'user', userId: user.id, displayName: displayName(user) }),
    });
    const text = await readBody(res);
    debugLog(res.ok ? 'info' : 'error', `load status ${res.status} ${forLog(text)}`);
    if (!res.ok) return createSave(safeUserId(user.id), displayName(user));
    const body = JSON.parse(text) as TickResponse;
    return body.save ?? createSave(safeUserId(user.id), displayName(user));
  } catch (error) {
    debugLog('error', `load threw ${error instanceof Error ? error.message : String(error)}`);
    return createSave(safeUserId(user.id), displayName(user));
  }
}

function localTick(
  save: UserSave,
  action: Action | null,
  gremlinFeed: boolean,
  note?: string,
): TickResponse & { telemetry: Telemetry } {
  const telemetry = gremlinFeed
    ? calmTelemetry({
        source: 'gremlin-feed',
        healthy: false,
        statusText: 'gremlin feed',
        workerStatus: 'sweating',
        cpuPct: 96,
        backpressureMs: 8000,
        blockedOutputs: 3,
        summary: note ?? 'Local gremlin feed. No Cribl host, no mercy.',
      })
    : calmTelemetry(note ? { summary: note } : {});
  const result = reduce(save, telemetry, Date.now(), action);
  return {
    ok: true,
    save: result.save,
    events: result.events,
    telemetrySummary: telemetry.summary,
    alertSent: false,
    died: result.died,
    local: true,
    telemetry,
  };
}

export async function sendTick(
  user: CriblUser,
  save: UserSave,
  action: Action | null,
  extras: { gremlinFeed?: boolean; sessionWebhook?: string } = {},
): Promise<TickResponse & { telemetry: Telemetry }> {
  const url = endpoint();
  if (!url) return localTick(save, action, Boolean(extras.gremlinFeed));
  const actionName = action?.type ?? (extras.gremlinFeed ? 'storm' : 'poll');
  debugLog('info', `tick ${actionName} POST ${url} webhook=${Boolean(extras.sessionWebhook)} ${hostSnapshot()}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'user',
        userId: user.id,
        displayName: displayName(user),
        action,
        gremlinFeed: extras.gremlinFeed ?? false,
        sessionWebhook: extras.sessionWebhook,
      }),
    });
    const text = await readBody(res);
    debugLog(res.ok ? 'info' : 'error', `tick status ${res.status} ${forLog(text)}`);
    if (!res.ok) return localTick(save, action, Boolean(extras.gremlinFeed), 'Workspace tick missed. Open Logs.');
    const body = JSON.parse(text) as TickResponse;
    if (body.telemetryDiag) debugLog('info', `telemetry ${body.telemetryDiag}`);
    if (!body.save) {
      debugLog('error', 'tick response had no save');
      return localTick(save, action, Boolean(extras.gremlinFeed), 'Workspace tick missed. Open Logs.');
    }
    return { ...body, died: Boolean(body.died), telemetry: calmTelemetry({ source: 'cribl', summary: body.telemetrySummary }) };
  } catch (error) {
    debugLog('error', `tick threw ${error instanceof Error ? error.message : String(error)}`);
    return localTick(save, action, Boolean(extras.gremlinFeed), 'Workspace tick missed. Open Logs.');
  }
}
