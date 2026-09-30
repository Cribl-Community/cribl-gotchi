export interface LogLine {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const lines: LogLine[] = [];
const listeners = new Set<() => void>();

export function redact(text: string): string {
  return text
    .replace(/https?:\/\/hooks\.slack\.com\/services\/\S+/gi, 'https://hooks.slack.com/services/[redacted]')
    .replace(/hooks\.slack\.com\/services\/\S+/gi, 'hooks.slack.com/services/[redacted]')
    .replace(/https?:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\S+/gi, 'https://discord.com/api/webhooks/[redacted]')
    .replace(/(?:discord|discordapp)\.com\/api\/webhooks\/\S+/gi, 'discord.com/api/webhooks/[redacted]');
}

export function debugLog(level: LogLine['level'], message: string): void {
  lines.push({
    at: new Date().toISOString().slice(11, 23),
    level,
    message: redact(message),
  });
  if (lines.length > 80) lines.splice(0, lines.length - 80);
  listeners.forEach((listener) => listener());
}

export function getLogs(): LogLine[] {
  return lines.slice();
}

export function subscribeLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearLogs(): void {
  lines.length = 0;
  listeners.forEach((listener) => listener());
}

export function formatLogs(): string {
  return lines.map((line) => `${line.at} ${line.level.toUpperCase()} ${line.message}`).join('\n');
}

const INSTALLED_APP_ID = 'Cribl-gotchi';
const PREVIEW_APP_ID = `__dev__${INSTALLED_APP_ID}`;

function inLivePreview(): boolean {
  return new URLSearchParams(window.location.search).has('init');
}

// Installed apps are served from /app-ui/{appId}, and the platform lowercases the id.
function appIdFromPath(): string | null {
  const source = window.CRIBL_BASE_PATH || window.location.pathname;
  const match = source.match(/^\/app-ui\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function resolveAppId(): string {
  const fromPath = appIdFromPath();
  if (fromPath) return fromPath;
  if (inLivePreview()) return PREVIEW_APP_ID;
  const fromWindow = window.CRIBL_APP_ID;
  if (fromWindow) return fromWindow;
  return INSTALLED_APP_ID;
}

export function hostSnapshot(): string {
  return [
    `CRIBL_API_URL=${window.CRIBL_API_URL ?? '(missing)'}`,
    `CRIBL_APP_ID=${window.CRIBL_APP_ID ?? '(missing)'}`,
    `resolvedApp=${resolveAppId()}`,
    `CRIBL_BASE_PATH=${window.CRIBL_BASE_PATH ?? '(missing)'}`,
    `getCriblUser=${typeof window.getCriblUser}`,
    `href=${window.location.href}`,
  ].join(' | ');
}
