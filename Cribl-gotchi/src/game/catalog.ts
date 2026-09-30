import type { ColorId, Difficulty, FeatureId, HatId, SizeId } from './types.ts';

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  tagline: string;
  multiplier: number;
  hungerPerMinute: number;
  backpressureThresholdMs: number;
  coinBonus: number;
  blurb: string;
}

export interface Palette {
  id: ColorId;
  name: string;
  body: string;
  dark: string;
  light: string;
  ink: string;
}

export interface ShopItem {
  id: string;
  kind: 'color' | 'size' | 'feature' | 'hat';
  name: string;
  price: number;
  blurb: string;
  color?: ColorId;
  size?: SizeId;
  feature?: FeatureId;
  hat?: HatId;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'Dev Environment',
    multiplier: 0.5,
    hungerPerMinute: 1 / 15,
    backpressureThresholdMs: 5000,
    coinBonus: 0.75,
    blurb: 'The pet is unionized. It takes breaks. It still judges your commits.',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'Standard Prod',
    multiplier: 1,
    hungerPerMinute: 1 / 5,
    backpressureThresholdMs: 2000,
    coinBonus: 1,
    blurb: 'It has a pager. The pager is you. This is not a promotion.',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'SOC Crisis',
    multiplier: 2,
    hungerPerMinute: 1 / 2,
    backpressureThresholdMs: 500,
    coinBonus: 1.5,
    blurb: 'Coffee is a rounding error. The pet has opened a bridge and named it after you.',
  },
  chaos: {
    id: 'chaos',
    label: 'Chaos',
    tagline: 'Gremlin Unleashed',
    multiplier: 3.5,
    hungerPerMinute: 1,
    backpressureThresholdMs: 100,
    coinBonus: 3,
    blurb: 'Hazards. Crown. Regret. The pet has seen your regex and taken notes.',
  },
};

export const PALETTES: Record<ColorId, Palette> = {
  lcd: { id: 'lcd', name: 'Gangrene LCD', body: '#306230', dark: '#0f380f', light: '#c4e07a', ink: '#0f380f' },
  magenta: { id: 'magenta', name: 'Chaos Magenta', body: '#c43b8a', dark: '#5c1240', light: '#ffd0ea', ink: '#3d0a2c' },
  orange: { id: 'orange', name: 'Traffic Cone', body: '#e36a12', dark: '#6a2c04', light: '#ffd7b0', ink: '#4a1c02' },
  blurple: { id: 'blurple', name: 'Blurple Menace', body: '#5865f2', dark: '#1e2260', light: '#d5d9ff', ink: '#16183f' },
  sorrow: { id: 'sorrow', name: '3am Sorrow Blue', body: '#3d7ea6', dark: '#102838', light: '#c5e4f5', ink: '#0c1e2c' },
  beige: { id: 'beige', name: 'Tax Audit Beige', body: '#c2a36b', dark: '#5c4a28', light: '#f3e6c8', ink: '#3e3218' },
};

export const SIZES: Record<SizeId, { name: string; blurb: string; scale: number }> = {
  smol: { name: 'Smol Bean', blurb: 'Fits in a log line. Emotionally, it does not.', scale: 0.72 },
  chonk: { name: 'Regulation Chonk', blurb: 'Standard issue. Still takes two seats in the incident bridge.', scale: 1 },
  unit: { name: 'Absolute Unit', blurb: 'Occupies a worker process spiritually.', scale: 1.16 },
  forbidden: { name: 'Forbidden Density', blurb: 'Does not fit in the LCD. That is the feature. Do not lick.', scale: 1.38 },
};

export const FEATURES: Record<FeatureId, { name: string; blurb: string }> = {
  unibrow: { name: 'Unibrow of Doubt', blurb: 'One eyebrow. Infinite suspicion.' },
  lasers: { name: 'Laser Eyes', blurb: 'They do not parse. They vaporize.' },
  mustache: { name: 'Pipeline Mustache', blurb: 'Adds zero throughput and tremendous authority.' },
  eyeball: { name: 'Extra Eyeball', blurb: 'It watches the route you forgot.' },
  sweat: { name: 'Permanent Sweat', blurb: 'Pre-installed anxiety. Cannot be patched.' },
  party: { name: 'Party Hat', blurb: 'For outages. Obviously.' },
  fangs: { name: 'Snack Fangs', blurb: 'Your dropped events called. They are scared.' },
  void: { name: 'Void Mouth', blurb: 'It ate a capture group and gained its power.' },
  halo: { name: 'Halo of Unprocessed Logs', blurb: 'Holy, in the way a 4am page is holy.' },
};

export const HATS: Record<HatId, { name: string; blurb: string }> = {
  top_hat: { name: 'Top Hat', blurb: 'Formalwear for informal data loss.' },
  sunglasses: { name: 'Log Streamer Shades', blurb: '+0 stats. +100 attitude. Cannot see the pager. Perfect.' },
  visor: { name: 'Veteran Cyber Visor', blurb: 'Earned in a SOC crisis, or bought by a coward with coins.' },
  crown: { name: 'Golden Chaos Crown', blurb: 'The crown respects commitment to bad ideas.' },
  collar: { name: 'Bronze Collar', blurb: 'Pipeline Guard merch. It jingles when the leader sneezes.' },
};

export const SHOP: ShopItem[] = [
  { id: 'color_magenta', kind: 'color', color: 'magenta', name: 'Chaos Magenta', price: 40, blurb: 'Hot pink. HR has questions. The pet has answers, and they are worse.' },
  { id: 'color_orange', kind: 'color', color: 'orange', name: 'Traffic Cone', price: 40, blurb: 'High visibility. Zero authority. The pet will still walk into traffic.' },
  { id: 'color_blurple', kind: 'color', color: 'blurple', name: 'Blurple Menace', price: 40, blurb: 'Will @everyone your feelings.' },
  { id: 'color_sorrow', kind: 'color', color: 'sorrow', name: '3am Sorrow Blue', price: 30, blurb: 'The color of a dashboard you should not have opened.' },
  { id: 'color_beige', kind: 'color', color: 'beige', name: 'Tax Audit Beige', price: 80, blurb: 'Even the gremlin files an extension.' },
  { id: 'size_unit', kind: 'size', size: 'unit', name: 'Absolute Unit', price: 60, blurb: SIZES.unit.blurb },
  { id: 'size_forbidden', kind: 'size', size: 'forbidden', name: 'Forbidden Density', price: 150, blurb: SIZES.forbidden.blurb },
  { id: 'feat_lasers', kind: 'feature', feature: 'lasers', name: FEATURES.lasers.name, price: 70, blurb: FEATURES.lasers.blurb },
  { id: 'feat_mustache', kind: 'feature', feature: 'mustache', name: FEATURES.mustache.name, price: 25, blurb: FEATURES.mustache.blurb },
  { id: 'feat_eyeball', kind: 'feature', feature: 'eyeball', name: FEATURES.eyeball.name, price: 45, blurb: FEATURES.eyeball.blurb },
  { id: 'feat_sweat', kind: 'feature', feature: 'sweat', name: FEATURES.sweat.name, price: 10, blurb: FEATURES.sweat.blurb },
  { id: 'feat_party', kind: 'feature', feature: 'party', name: FEATURES.party.name, price: 35, blurb: FEATURES.party.blurb },
  { id: 'feat_fangs', kind: 'feature', feature: 'fangs', name: FEATURES.fangs.name, price: 40, blurb: FEATURES.fangs.blurb },
  { id: 'feat_void', kind: 'feature', feature: 'void', name: FEATURES.void.name, price: 90, blurb: FEATURES.void.blurb },
  { id: 'feat_halo', kind: 'feature', feature: 'halo', name: FEATURES.halo.name, price: 120, blurb: FEATURES.halo.blurb },
  { id: 'hat_top', kind: 'hat', hat: 'top_hat', name: HATS.top_hat.name, price: 50, blurb: HATS.top_hat.blurb },
  { id: 'hat_sun', kind: 'hat', hat: 'sunglasses', name: HATS.sunglasses.name, price: 55, blurb: HATS.sunglasses.blurb },
  { id: 'hat_visor', kind: 'hat', hat: 'visor', name: HATS.visor.name, price: 100, blurb: 'Knockoff visor. The real one is earned by suffering on Hard.' },
  { id: 'hat_crown', kind: 'hat', hat: 'crown', name: HATS.crown.name, price: 400, blurb: 'Buy the crown, or earn it by being a chaos gremlin. The pet knows which.' },
];

const NAMES = [
  'Droppy',
  'Regex Rex',
  'Buffer Bob',
  'Queuezilla',
  'HEC-tor',
  'Packet Potato',
  'Loggy',
  'Gremlin Jr',
  'Byte',
  'Nullbert',
  'Cronenberg',
  'Pipeline Pete',
  'Ack',
  'Captain 404',
  'Chonkzilla',
  'Route Rot',
  'Beep',
  'Margaret',
  'Sir Parsalot',
  'Timestamp Tim',
  'Lord Backpressure',
  'Grep Goblin',
  'Nigel',
  'Payload Patty',
  'Kevin the Unindexed',
  'Stderr Steve',
  'Madame Cardinality',
  'Chunky Ingest',
  'Baron von Buffer',
  'Doctor Dropcount',
  'Sandra',
  'Yaml Yeti',
  'Index Imp',
  'Schema Steve',
  'The Honourable Retry',
  'Wiggles',
  'Cursed Cursor',
  'Verbose Vera',
  'Gary the Gauge',
  'Prof. Percentile',
  'Snacktrace',
  'Dead Letter Dave',
  'Mothra of Metrics',
  'Tiny Throughput',
  'Gigabite',
  'Terabyte Terry',
  'Nibbles',
  'Count Compaction',
  'Boris Backfill',
  'Latency Larry',
  'Sir Loin of Logs',
  'Cache Money',
  'Heap Heap Hooray',
  'Nully McNullface',
  'Panic Pam',
  'Big Endian Ed',
  'Little Endian Lou',
  'Gertrude',
  'Sysadmin Simon',
  'Flush the Younger',
  'Hexley',
  'Daemon Deacon',
  'Rotating Ronald',
  'Syslog Sally',
  'Truncated Trudy',
  'Uncle Uptime',
  'Zombie Zoe',
  'Pager Phil',
  'Oncall Olive',
  'Runbook Randy',
  'Postmortem Polly',
  'Sev-One Sven',
  'Blameless Bill',
  'Escalation Edna',
  'Rollback Rita',
  'Canary Carl',
  'Blue Greengrass',
  'Feature Flagg',
  'Stale Cache Stan',
  'Thundering Herb',
  'Race Condition Rae',
  'Deadlock Dana',
  'Mutex Maxine',
  'Semaphore Sam',
  'Orphan Process Otto',
  'Zombie Reaper Zed',
  'Kernel Karen',
  'Swap Space Spencer',
  'Segfault Seg',
  'Core Dump Cora',
  'Stack Trace Tracy',
  'Off By Juan',
  'Fencepost Fenwick',
  'Null Terminator',
  'Undefined Ursula',
  'NaN the Barbarian',
  'Infinity Ingrid',
  'Floating Point Flo',
  'Rounding Rodney',
  'Overflow Ollie',
  'Underflow Una',
  'Endian Enid',
  'Checksum Chuck',
  'Parity Perry',
  'Bitrot Bruce',
  'Entropy Ethel',
  'Heisenbug',
  'Bohrbug Bobby',
  'Mandelbug Mandy',
  'Schroedinbug',
  'Rubber Duck',
  'Yak Shaver',
  'Bikeshed Betty',
  'Scope Creep',
  'Tech Debt Ted',
  'Legacy Lester',
  'Deprecated Deb',
  'Breaking Change Bree',
  'Semver Sven',
  'Monorepo Moe',
  'Microservice Mickey',
  'Monolith Monty',
  'Sidecar Sid',
  'Service Mesh Mitch',
  'Ingress Inga',
  'Egress Egon',
  'Firewall Fiona',
  'Proxy Roxy',
  'Load Balancer Lance',
  'Sticky Session Sid',
  'Cert Expiry Cecil',
  'TLS Tess',
  'Handshake Hank',
  'Timeout Tina',
  'Retry Storm Rory',
  'Circuit Breaker Bo',
  'Rate Limit Rhonda',
  'Throttle Thelma',
  'Quota Quinn',
  'Cardinality Cliff',
  'High Watermark Hal',
  'Lag Lucy',
  'Offset Oscar',
  'Partition Percy',
  'Replica Reba',
  'Quorum Quincy',
  'Split Brain Sybil',
  'Consensus Connie',
];

export function randomName(seed: number): string {
  const index = Math.abs(Math.floor(seed)) % NAMES.length;
  return NAMES[index] ?? 'Byte';
}

// Rotates through a pool so repeated states do not repeat the same line.
// The seed is hashed because callers pass timestamps, which alias badly against small pools.
export function pick<T>(pool: readonly T[], seed: number): T {
  let h = Math.floor(seed) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return pool[h % pool.length] ?? pool[0] as T;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function stageForLevel(level: number): 1 | 2 | 3 {
  if (level >= 25) return 3;
  if (level >= 10) return 2;
  return 1;
}

export function stageName(stage: 1 | 2 | 3): string {
  if (stage === 1) return 'Log Blob';
  if (stage === 2) return 'Stream Serpent';
  return 'Data Titan';
}
