export type Difficulty = 'easy' | 'medium' | 'hard' | 'chaos';

export type SizeId = 'smol' | 'chonk' | 'unit' | 'forbidden';

export type ColorId = 'lcd' | 'magenta' | 'orange' | 'blurple' | 'sorrow' | 'beige';

export type FeatureId =
  | 'unibrow'
  | 'lasers'
  | 'mustache'
  | 'eyeball'
  | 'sweat'
  | 'party'
  | 'fangs'
  | 'void'
  | 'halo';

export type HatId = 'top_hat' | 'sunglasses' | 'visor' | 'crown' | 'collar';

export type Anim =
  | 'IDLE'
  | 'HAPPY'
  | 'SICK'
  | 'STRESSED'
  | 'SLEEP'
  | 'DEAD'
  | 'EAT'
  | 'PETTED'
  | 'CLEAN';

export type HazardKind = 'regex' | 'buffer' | 'storm' | 'jam';

export interface Look {
  size: SizeId;
  color: ColorId;
  features: FeatureId[];
  hat: HatId | null;
}

export interface Hazard {
  kind: HazardKind;
  startedAt: number;
  deadline: number;
  detail: string;
  jammed?: string;
  fired?: boolean;
}

export interface MetricMemory {
  droppedEvents: number;
  inEvents: number;
  outEvents: number;
  inBytes: number;
  outBytes: number;
  seen: boolean;
}

export interface PetRun {
  isAlive: boolean;
  petId: string;
  name: string;
  difficulty: Difficulty;
  startedAt: number;
  lastTickAt: number;
  lifespanSeconds: number;
  health: number;
  hunger: number;
  happiness: number;
  level: number;
  xp: number;
  evolutionStage: 1 | 2 | 3;
  byteCoins: number;
  look: Look;
  inventory: string[];
  activeHazard: Hazard | null;
  nextHazardAt: number;
  lastSummonAt: number;
  totalBytesRouted: number;
  totalDropped: number;
  metrics: MetricMemory;
  speech: string;
  anim: Anim;
  animUntil: number;
  deathCause: string;
  epitaph: string;
  deathRecorded: boolean;
  alertLatched: boolean;
  maxLevelReached: number;
}

export interface Grave {
  petId: string;
  name: string;
  difficulty: Difficulty;
  bornAt: number;
  diedAt: number;
  lifespanSeconds: number;
  maxLevelReached: number;
  causeOfDeath: string;
  epitaph: string;
  totalGbProcessed: number;
  look: Look;
}

export interface HallOfFame {
  longestLifeSeconds: number;
  longestLifePetName: string;
  longestLifeByDifficulty: Record<Difficulty, number>;
  totalGamesPlayed: number;
  chaosModeDeaths: number;
  lifetimeBytesRouted: number;
  unlockedLegacyPerks: string[];
  titles: string[];
  gremlinsSummoned: number;
}

export interface Settings {
  alertThresholdHealth: number;
  webhookArmed: boolean;
  webhookHost: 'slack' | 'discord' | null;
  timeDilation: number;
  muteScreams: boolean;
}

export interface Unlocks {
  colors: ColorId[];
  sizes: SizeId[];
  features: FeatureId[];
  hats: HatId[];
}

export interface UserSave {
  version: 1;
  userId: string;
  displayName: string;
  current: PetRun | null;
  hall: HallOfFame;
  graveyard: Grave[];
  settings: Settings;
  unlocks: Unlocks;
}

export interface Telemetry {
  healthy: boolean;
  statusText: string;
  workerStatus: string;
  inEvents: number;
  outEvents: number;
  droppedEvents: number;
  inBytes: number;
  outBytes: number;
  cpuPct: number;
  memPct: number;
  backpressureMs: number;
  blockedOutputs: number;
  source: 'cribl' | 'simulated' | 'gremlin-feed' | 'denied';
  summary: string;
  /** Per-endpoint probe results, surfaced in the Logs tab. Never contains secrets. */
  diag?: string;
}

export type Action =
  | { type: 'hatch'; name: string; difficulty: Difficulty; look: Look }
  | { type: 'feed' }
  | { type: 'pet' }
  | { type: 'clean' }
  | { type: 'fix_regex' }
  | { type: 'pay_jam' }
  | { type: 'summon' }
  | { type: 'buy'; itemId: string }
  | { type: 'style'; look: Look }
  | { type: 'dilation'; factor: number }
  | { type: 'settings'; alertThresholdHealth: number; muteScreams: boolean }
  | { type: 'arm_webhook'; host: 'slack' | 'discord' }
  | { type: 'disarm_webhook' }
  | { type: 'test_scream' }
  | { type: 'abandon' };

export type AlertKind = 'test' | 'health' | 'death';

export interface TickResult {
  save: UserSave;
  events: string[];
  died: boolean;
  shouldAlert: boolean;
  alertKind: AlertKind | null;
}
