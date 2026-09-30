import type { Telemetry } from '../src/game/types.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function pickStatus(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) return 'unknown';
  if (typeof record.status === 'string') return record.status;
  const items = record.items;
  if (Array.isArray(items) && items[0] && typeof (items[0] as { status?: unknown }).status === 'string') {
    return (items[0] as { status: string }).status;
  }
  return 'unknown';
}

function collectNumbers(node: unknown, found: Record<string, number>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectNumbers(item, found);
    return;
  }
  const record = asRecord(node);
  if (!record) return;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && Number.isFinite(value)) found[key] = value;
    else if (value && typeof value === 'object') collectNumbers(value, found);
  }
}

function unhealthy(value: number | undefined): boolean {
  if (value == null || Number.isNaN(value)) return false;
  if (value <= 1) return value < 0.95;
  return value < 95;
}

const HEALTHY_TAILS = [
  'The pet remains professionally disappointed.',
  'The pet is bored and considers this a personal attack.',
  'Nothing is on fire. The pet finds this suspicious.',
  'All green. The pet is looking for problems anyway.',
  'Stable. The pet has begun inventing grievances.',
  'No drama detected. The pet will supply its own.',
  'Healthy. The pet remains unimpressed by your competence.',
  'Quiet pipes. The pet is writing a complaint about the quiet.',
];

const SICK_TAILS = [
  'Someone bring a snack and a postmortem.',
  'The pet has started drafting the incident timeline.',
  'This is fine, says nobody, including the pet.',
  'The pet is sweating and it is not the good kind.',
  'Escalate. The pet already has.',
  'The pet would like to speak to whoever owns this.',
  'Bridge call energy detected.',
  'The pet is updating its resume and your runbook.',
];

function tail(pool: string[]): string {
  return pool[Math.floor(Date.now() / 5000) % pool.length] ?? pool[0] ?? '';
}

// Describes why a status could not be read, without echoing payload contents.
function shapeOf(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) return Array.isArray(payload) ? 'bare-array' : 'not-object';
  if (Array.isArray(record.items)) {
    const first = asRecord(record.items[0]);
    if (!first) return record.items.length === 0 ? 'items-empty' : 'items-not-object';
    return `items[0]-keys=${Object.keys(first).slice(0, 6).join(',') || 'none'}`;
  }
  return `keys=${Object.keys(record).slice(0, 6).join(',') || 'none'}`;
}

// Rolls a node list up into one word. Leader-side view, so it sees disconnects too.
function aggregateWorkers(payload: unknown): string | null {
  const record = asRecord(payload);
  const items = record?.items;
  if (!Array.isArray(items)) return null;
  if (items.length === 0) return 'none';
  let disconnected = 0;
  const statuses: string[] = [];
  for (const item of items) {
    const node = asRecord(item);
    if (!node) continue;
    if (node.disconnected === true) disconnected += 1;
    if (typeof node.status === 'string') statuses.push(node.status.toLowerCase());
  }
  if (disconnected > 0) return disconnected === items.length ? 'down' : 'degraded';
  const unhealthyNode = statuses.find((s) => s !== 'healthy');
  if (unhealthyNode) return unhealthyNode;
  return statuses.length > 0 ? 'healthy' : null;
}

async function readWorkerStatus(diag: string[]): Promise<string> {
  try {
    const res = await fetch('/api/v1/health/workers');
    if (res.ok || res.status === 420) {
      const payload = await res.json().catch(() => ({}));
      const status = pickStatus(payload);
      if (status !== 'unknown') {
        diag.push(`workers ${res.status} ${status}`);
        return status;
      }
      diag.push(`workers ${res.status} no-status ${shapeOf(payload)}`);
    } else {
      diag.push(`workers ${res.status} not-ok`);
    }
  } catch (error) {
    diag.push(`workers threw ${error instanceof Error ? error.name : 'unknown'}`);
  }

  // Cloud Leaders do not serve /health/workers; the node list is the supported view.
  try {
    const res = await fetch('/api/v1/master/workers');
    if (!res.ok) {
      diag.push(`master/workers ${res.status} not-ok`);
      return 'unknown';
    }
    const payload = await res.json().catch(() => ({}));
    const status = aggregateWorkers(payload);
    diag.push(
      status ? `master/workers 200 ${status}` : `master/workers 200 no-status ${shapeOf(payload)}`,
    );
    return status ?? 'unknown';
  } catch (error) {
    diag.push(`master/workers threw ${error instanceof Error ? error.name : 'unknown'}`);
    return 'unknown';
  }
}

function workerPhrase(status: string): string {
  if (status === 'none') return 'There are no Worker Nodes to blame';
  if (status === 'unknown') return 'Workers are a mystery';
  if (status === 'degraded') return 'Some Workers have wandered off';
  if (status === 'down') return 'The Workers are gone';
  return `Workers are ${status}`;
}

export async function readWorkspaceTelemetry(): Promise<Telemetry> {
  const base = calmShell();
  const diag: string[] = [];
  try {
    const healthRes = await fetch('/api/v1/health');
    if (healthRes.status === 403 || healthRes.status === 401) {
      return { ...denied(), diag: `health ${healthRes.status} denied` };
    }
    if (healthRes.ok || healthRes.status === 420) {
      const payload = await healthRes.json().catch(() => ({}));
      base.statusText = pickStatus(payload);
      base.healthy = base.statusText.toLowerCase() === 'healthy';
      diag.push(
        base.statusText === 'unknown'
          ? `health ${healthRes.status} no-status ${shapeOf(payload)}`
          : `health ${healthRes.status} ${base.statusText}`,
      );
    } else {
      diag.push(`health ${healthRes.status} not-ok`);
    }
  } catch (error) {
    base.summary = 'Health endpoint hid under the desk. Simulating a nervous workspace.';
    base.source = 'simulated';
    base.diag = `health threw ${error instanceof Error ? error.name : 'unknown'}`;
    return base;
  }

  base.workerStatus = await readWorkerStatus(diag);

  const metrics = await queryMetrics(diag);
  const dropped = num(metrics, ['dropped_events', 'dropped', 'total.dropped_events']);
  const inEvents = num(metrics, ['in_events', 'total.in_events']);
  const outEvents = num(metrics, ['out_events', 'total.out_events']);
  const inBytes = num(metrics, ['in_bytes', 'total.in_bytes']);
  const outBytes = num(metrics, ['out_bytes', 'total.out_bytes']);
  const healthInputs = metrics.health_inputs ?? metrics.health;
  const healthOutputs = metrics.health_outputs;

  if (!base.healthy || base.workerStatus === 'down' || base.workerStatus === 'shutting down') {
    base.backpressureMs = 9000;
    base.blockedOutputs = 2;
    base.cpuPct = 88;
  } else if (base.workerStatus !== 'healthy' && base.workerStatus !== 'unknown' && base.workerStatus !== 'none') {
    base.backpressureMs = 3500;
    base.cpuPct = 72;
  }
  if (unhealthy(healthInputs) || unhealthy(healthOutputs)) {
    base.backpressureMs = Math.max(base.backpressureMs, 2500);
    base.blockedOutputs = Math.max(base.blockedOutputs, 1);
  }

  base.droppedEvents = dropped;
  base.inEvents = inEvents;
  base.outEvents = outEvents;
  base.inBytes = inBytes;
  base.outBytes = outBytes;
  base.source = 'cribl';
  base.diag = diag.join(' | ');
  base.summary = base.healthy
    ? `Leader is ${base.statusText}. ${workerPhrase(base.workerStatus)}. ${tail(HEALTHY_TAILS)}`
    : `Leader is ${base.statusText}. ${workerPhrase(base.workerStatus)}. ${tail(SICK_TAILS)}`;
  return base;
}

function num(metrics: Record<string, number>, keys: string[]): number {
  for (const key of keys) {
    if (typeof metrics[key] === 'number') return metrics[key];
  }
  return 0;
}

async function queryMetrics(notes: string[]): Promise<Record<string, number>> {
  const bodies = [
    {
      earliest: '-5m',
      latest: 'now',
      aggs: {
        aggregations: [
          'max("health.inputs").as(health_inputs)',
          'max("health.outputs").as(health_outputs)',
          'sum("total.in_events").as(in_events)',
          'sum("total.out_events").as(out_events)',
          'sum("total.dropped_events").as(dropped_events)',
          'sum("total.in_bytes").as(in_bytes)',
          'sum("total.out_bytes").as(out_bytes)',
        ],
        cumulative: true,
      },
    },
    {
      earliest: '-5m',
      latest: 'now',
      aggs: {
        aggregations: ['max("health.inputs").as(health_inputs)', 'max("health.outputs").as(health_outputs)'],
        cumulative: true,
      },
    },
  ];
  for (const [attempt, body] of bodies.entries()) {
    try {
      const res = await fetch('/api/v1/system/metrics/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        notes.push(`metrics q${attempt} ${res.status} not-ok`);
        continue;
      }
      const found: Record<string, number> = {};
      collectNumbers(await res.json(), found);
      notes.push(`metrics q${attempt} ${res.status} fields=${Object.keys(found).length}`);
      return found;
    } catch (error) {
      notes.push(`metrics q${attempt} threw ${error instanceof Error ? error.name : 'unknown'}`);
      continue;
    }
  }
  return {};
}

function calmShell(): Telemetry {
  return {
    healthy: true,
    statusText: 'unknown',
    workerStatus: 'unknown',
    inEvents: 0,
    outEvents: 0,
    droppedEvents: 0,
    inBytes: 0,
    outBytes: 0,
    cpuPct: 20,
    memPct: 40,
    backpressureMs: 0,
    blockedOutputs: 0,
    source: 'cribl',
    summary: 'Listening to the workspace...',
  };
}

function denied(): Telemetry {
  return {
    ...calmShell(),
    healthy: true,
    source: 'denied',
    statusText: 'hidden',
    summary: 'This pet cannot see workspace health. Ask an admin to share the app. Until then it will invent mild peril.',
    backpressureMs: 400,
    cpuPct: 35,
  };
}

export function withGremlinFeed(telemetry: Telemetry): Telemetry {
  return {
    ...telemetry,
    source: 'gremlin-feed',
    healthy: false,
    statusText: 'gremlin feed',
    workerStatus: 'sweating',
    cpuPct: 96,
    memPct: 91,
    backpressureMs: Math.max(telemetry.backpressureMs, 8000),
    blockedOutputs: Math.max(telemetry.blockedOutputs, 3),
    droppedEvents: telemetry.droppedEvents + 40,
    summary: 'Gremlin Feed engaged. This is a stage prop. Your pipelines were not touched. Your pet was.',
  };
}
