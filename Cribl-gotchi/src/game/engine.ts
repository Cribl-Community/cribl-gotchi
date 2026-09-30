import { DIFFICULTIES, SHOP, clamp, pick, randomName, stageForLevel, stageName } from './catalog.ts';
import type {
  Action,
  AlertKind,
  Difficulty,
  Grave,
  HallOfFame,
  Hazard,
  HazardKind,
  Look,
  PetRun,
  Telemetry,
  TickResult,
  Unlocks,
  UserSave,
} from './types.ts';

export function calmTelemetry(partial: Partial<Telemetry> = {}): Telemetry {
  return {
    healthy: true,
    statusText: 'healthy',
    workerStatus: 'healthy',
    inEvents: 1000,
    outEvents: 1000,
    droppedEvents: 0,
    inBytes: 0,
    outBytes: 0,
    cpuPct: 18,
    memPct: 40,
    backpressureMs: 0,
    blockedOutputs: 0,
    source: 'simulated',
    summary: 'The workspace is suspiciously calm. The pet does not trust it.',
    ...partial,
  };
}

export function emptyHall(): HallOfFame {
  return {
    longestLifeSeconds: 0,
    longestLifePetName: '',
    longestLifeByDifficulty: { easy: 0, medium: 0, hard: 0, chaos: 0 },
    totalGamesPlayed: 0,
    chaosModeDeaths: 0,
    lifetimeBytesRouted: 0,
    unlockedLegacyPerks: [],
    titles: [],
    gremlinsSummoned: 0,
  };
}

export function starterUnlocks(): Unlocks {
  return {
    colors: ['lcd'],
    sizes: ['smol', 'chonk'],
    features: ['unibrow'],
    hats: [],
  };
}

export function defaultLook(): Look {
  return { size: 'chonk', color: 'lcd', features: ['unibrow'], hat: null };
}

export function createSave(userId: string, displayName: string): UserSave {
  return {
    version: 1,
    userId,
    displayName,
    current: null,
    hall: emptyHall(),
    graveyard: [],
    settings: {
      alertThresholdHealth: 30,
      webhookArmed: false,
      webhookHost: null,
      timeDilation: 1,
      muteScreams: false,
    },
    unlocks: starterUnlocks(),
  };
}

export function sanitizeName(raw: string, now: number): string {
  const cleaned = raw.replace(/[^\w\s\-'.]/g, '').trim().slice(0, 18);
  return cleaned.length > 0 ? cleaned : randomName(now);
}

function say(pet: PetRun, line: string, events: string[]): void {
  pet.speech = line;
  events.push(line);
}

function setAnim(pet: PetRun, anim: PetRun['anim'], now: number, ms = 2500): void {
  pet.anim = anim;
  pet.animUntil = now + ms;
}

function ownsLook(unlocks: Unlocks, look: Look): string | null {
  if (!unlocks.colors.includes(look.color)) return 'That color is still in the shop, you goblin.';
  if (!unlocks.sizes.includes(look.size)) return 'That size has not been unlocked. The LCD has a union.';
  if (look.features.length > 3) return 'Three features max. This is a pet, not a Jira ticket.';
  for (const feature of look.features) {
    if (!unlocks.features.includes(feature)) return 'You cannot staple on features you have not bought.';
  }
  if (look.hat && !unlocks.hats.includes(look.hat)) return 'That hat is not yours. The pet noticed.';
  return null;
}

function applyPerks(save: UserSave, pet: PetRun): void {
  const perks = save.hall.unlockedLegacyPerks;
  if (perks.includes('starting_coin_boost')) pet.byteCoins += 25;
  if (perks.includes('golden_halo')) {
    if (!pet.look.features.includes('halo') && pet.look.features.length < 3) {
      pet.look.features = [...pet.look.features, 'halo'];
    }
  }
  if (perks.includes('bronze_collar') && !pet.look.hat) pet.look.hat = 'collar';
}

function syncInventory(save: UserSave, pet: PetRun): void {
  pet.inventory = [
    ...save.unlocks.colors,
    ...save.unlocks.sizes,
    ...save.unlocks.features,
    ...save.unlocks.hats,
  ];
}

export function previewPet(name: string, difficulty: Difficulty, look: Look, now: number): PetRun {
  return {
    isAlive: true,
    petId: 'preview',
    name: sanitizeName(name, now),
    difficulty,
    startedAt: now,
    lastTickAt: now,
    lifespanSeconds: 0,
    health: 100,
    hunger: 80,
    happiness: 70,
    level: 1,
    xp: 0,
    evolutionStage: 1,
    byteCoins: 0,
    look,
    inventory: [],
    activeHazard: null,
    nextHazardAt: now + 8 * 60 * 1000,
    lastSummonAt: 0,
    totalBytesRouted: 0,
    totalDropped: 0,
    metrics: { droppedEvents: 0, inEvents: 0, outEvents: 0, inBytes: 0, outBytes: 0, seen: false },
    speech: 'Hatch me. I have already unionized.',
    anim: 'IDLE',
    animUntil: 0,
    deathCause: '',
    epitaph: '',
    deathRecorded: false,
    alertLatched: false,
    maxLevelReached: 1,
  };
}

function hatch(save: UserSave, action: Extract<Action, { type: 'hatch' }>, now: number, events: string[]): void {
  const lookError = ownsLook(save.unlocks, action.look);
  if (lookError) {
    events.push(lookError);
    return;
  }
  if (save.current?.isAlive) {
    events.push('You already have a pet. Abandoning them without a funeral is how gremlins start.');
    return;
  }
  const pet = previewPet(action.name, action.difficulty, { ...action.look, features: [...action.look.features] }, now);
  pet.petId = `pet_${now}`;
  pet.speech = `I am ${pet.name}. I eat logs and grudges.`;
  applyPerks(save, pet);
  syncInventory(save, pet);
  if (action.difficulty === 'chaos') {
    save.hall.gremlinsSummoned += 0;
    pet.speech = `I am ${pet.name}. Chaos mode. I have a crown fund and a lawyer.`;
  }
  save.current = pet;
  save.hall.totalGamesPlayed += 1;
  events.push(`${pet.name} hatched on ${DIFFICULTIES[action.difficulty].tagline}. Heaven help the pipeline.`);
}

function kill(save: UserSave, pet: PetRun, now: number, cause: string, epitaph: string, events: string[]): void {
  if (!pet.isAlive) return;
  pet.isAlive = false;
  pet.health = 0;
  pet.anim = 'DEAD';
  pet.animUntil = now + 86_400_000;
  pet.deathCause = cause;
  pet.epitaph = epitaph;
  pet.speech = epitaph;
  events.push(cause);
  if (pet.deathRecorded) return;
  pet.deathRecorded = true;
  const grave: Grave = {
    petId: pet.petId,
    name: pet.name,
    difficulty: pet.difficulty,
    bornAt: pet.startedAt,
    diedAt: now,
    lifespanSeconds: Math.floor(pet.lifespanSeconds),
    maxLevelReached: pet.maxLevelReached,
    causeOfDeath: cause,
    epitaph,
    totalGbProcessed: Math.round((pet.totalBytesRouted / 1e9) * 10) / 10,
    look: pet.look,
  };
  save.graveyard = [grave, ...save.graveyard].slice(0, 30);
  const hall = save.hall;
  hall.lifetimeBytesRouted += pet.totalBytesRouted;
  if (pet.lifespanSeconds > hall.longestLifeSeconds) {
    hall.longestLifeSeconds = pet.lifespanSeconds;
    hall.longestLifePetName = pet.name;
  }
  if (pet.lifespanSeconds > hall.longestLifeByDifficulty[pet.difficulty]) {
    hall.longestLifeByDifficulty[pet.difficulty] = pet.lifespanSeconds;
  }
  if (pet.difficulty === 'chaos') hall.chaosModeDeaths += 1;
  unlockPerks(save, pet);
  if (pet.difficulty === 'chaos') grant(save, 'crown', 'Golden Chaos Crown');
  if (pet.difficulty === 'hard') grant(save, 'visor', 'Veteran Cyber Visor');
}

function grant(save: UserSave, hat: 'crown' | 'visor' | 'collar', label: string): void {
  if (!save.unlocks.hats.includes(hat)) {
    save.unlocks.hats = [...save.unlocks.hats, hat];
  }
  const perkId = hat === 'crown' ? 'golden_chaos_crown' : hat === 'visor' ? 'veteran_cyber_visor' : 'bronze_collar';
  if (!save.hall.unlockedLegacyPerks.includes(perkId)) {
    save.hall.unlockedLegacyPerks = [...save.hall.unlockedLegacyPerks, perkId];
    save.hall.titles = [...save.hall.titles, label];
  }
}

function unlockPerks(save: UserSave, pet: PetRun): void {
  const life = pet.lifespanSeconds;
  const add = (id: string, title: string) => {
    if (save.hall.unlockedLegacyPerks.includes(id)) return;
    save.hall.unlockedLegacyPerks = [...save.hall.unlockedLegacyPerks, id];
    save.hall.titles = [...save.hall.titles, title];
  };
  if (life >= 5 * 60) add('standup_survivor', 'Survived a Standup');
  if (life >= 24 * 3600) {
    add('pipeline_guard', 'Pipeline Guard');
    add('bronze_collar', 'Bronze Collar');
    grant(save, 'collar', 'Pipeline Guard');
  }
  if (life >= 3 * 24 * 3600) add('starting_coin_boost', 'Log Streamer');
  if (life >= 7 * 24 * 3600) add('iron_ingestor', 'Iron Ingestor');
  if (life >= 30 * 24 * 3600) add('master_of_data', 'Master of Data');
  if (life < 120) add('speedrun_victim', 'Speedrun Victim');
}

function regenBonus(save: UserSave): number {
  return save.hall.unlockedLegacyPerks.includes('pipeline_guard') ? 0.05 : 0;
}

function resist(save: UserSave): number {
  return save.hall.unlockedLegacyPerks.includes('iron_ingestor') ? 0.1 : 0;
}

function xpMult(save: UserSave): number {
  return save.hall.unlockedLegacyPerks.includes('master_of_data') ? 2 : 1;
}

function pickHazard(pet: PetRun, now: number): Hazard {
  const roll = Math.abs(Math.floor(now / 1000 + pet.lifespanSeconds)) % 4;
  const kind: HazardKind = (['regex', 'buffer', 'storm', 'jam'] as const)[roll] ?? 'regex';
  if (kind === 'regex') {
    return {
      kind,
      startedAt: now,
      deadline: now + 30_000,
      detail: 's/(.*)/$1$1$1/  — this regex has achieved mitosis. Fix it.',
    };
  }
  if (kind === 'buffer') {
    return {
      kind,
      startedAt: now,
      deadline: now + 60_000,
      detail: 'Buffer overflow. Dropped logs hit twice as hard. The buffer is a personality now.',
    };
  }
  if (kind === 'storm') {
    return {
      kind,
      startedAt: now,
      deadline: now + 60_000,
      detail: 'Ingestion storm. If the workers sweat, the pet sweats harder.',
    };
  }
  const feature = pet.look.features[0] ?? pet.look.hat ?? 'mouth';
  return {
    kind: 'jam',
    startedAt: now,
    deadline: now + 10 * 60_000,
    detail: `Gremlin jam. ${feature} is stuck. 10 Byte-Coins or it stays like that forever, which is a look.`,
    jammed: feature,
  };
}

function maybeScheduleHazard(pet: PetRun, now: number, events: string[]): void {
  if (pet.difficulty !== 'chaos' || pet.activeHazard || now < pet.nextHazardAt) return;
  pet.activeHazard = pickHazard(pet, now);
  pet.nextHazardAt = now + (5 + (Math.floor(now / 1000) % 11)) * 60_000;
  say(pet, pet.activeHazard.detail, events);
  setAnim(pet, 'STRESSED', now, 4000);
}

const DEATHS = {
  regex: [
    { cause: 'Decimated by an unhandled Regex Catastrophe.', epitaph: 'The regex matched the concept of mercy and dropped it.' },
    { cause: 'Consumed by a greedy quantifier.', epitaph: 'It matched everything, including the will to live.' },
    { cause: 'Lost in catastrophic backtracking.', epitaph: 'Still backtracking. Check again in a geological era.' },
    { cause: 'Parsed to death by a regex nobody wrote on purpose.', epitaph: 'Git blame points at a ghost.' },
    { cause: 'Dissolved by an unescaped dot that matched reality.', epitaph: 'The dot was not just a dot.' },
  ],
  starved: [
    { cause: 'Starved to death during a standup that achieved geological time.', epitaph: 'They asked for a status. The status was bones.' },
    { cause: 'Starved while everyone argued about the retro format.', epitaph: 'Action item: feed the pet. Owner: unassigned.' },
    { cause: 'Died of hunger inside a meeting that could have been an email.', epitaph: 'The calendar invite outlived it.' },
    { cause: 'Forgot to eat because the dashboard was so pretty.', epitaph: 'Beautiful graphs. Empty stomach.' },
    { cause: 'Starved waiting for someone to approve the pull request.', epitaph: 'Still awaiting review.' },
  ],
  cpu: [
    { cause: 'Spontaneously combusted during an unthrottled log spike.', epitaph: 'The postmortem is just the word CPU written in ash.' },
    { cause: 'Cooked itself at 100 percent utilization.', epitaph: 'Ran hot. Ran out.' },
    { cause: 'Melted into the heatsink during an ingest surge.', epitaph: 'It is one with the thermal paste now.' },
    { cause: 'Thermally throttled straight into the afterlife.', epitaph: 'Too fast to live, too hot to cache.' },
    { cause: 'Burned down trying to keep up with a chatty debug logger.', epitaph: 'Somebody left log level on TRACE.' },
  ],
  dropped: [
    { cause: 'Starved to death due to aggressive regex dropping clean events.', epitaph: 'The snacks were parsed, judged, and deleted.' },
    { cause: 'Wasted away as every meal was filtered out upstream.', epitaph: 'The food was dropped before the plate.' },
    { cause: 'Perished because the drop rule was slightly too enthusiastic.', epitaph: 'It was a very efficient pipeline. No survivors.' },
    { cause: 'Died waiting for events that a filter had already eaten.', epitaph: 'Dropped, like the ball.' },
  ],
  blocked: [
    { cause: 'Suffocated by a blocked HTTP Event Collector.', epitaph: 'It tried to swallow a blocked HEC like a challenge burrito.' },
    { cause: 'Crushed under backpressure nobody was watching.', epitaph: 'The queue won.' },
    { cause: 'Drowned in a destination that stopped accepting anything.', epitaph: 'Downstream said no. Repeatedly.' },
    { cause: 'Asphyxiated in a full buffer with no drain.', epitaph: 'The buffer became the coffin.' },
    { cause: 'Blocked to death by an output that went on vacation.', epitaph: 'Out of office, permanently.' },
  ],
  quiet: [
    { cause: 'Died of ennui after the workspace went quiet.', epitaph: 'A ghost now. Still on-call. Still in the bridge.' },
    { cause: 'Expired from boredom during a suspiciously healthy week.', epitaph: 'Nothing broke. That was the problem.' },
    { cause: 'Faded away in a workspace with nothing to complain about.', epitaph: 'It needed drama. It got uptime.' },
    { cause: 'Succumbed to the silence of a well-run pipeline.', epitaph: 'Killed by competence.' },
  ],
};

function causeFromWorld(pet: PetRun, telemetry: Telemetry, now: number): { cause: string; epitaph: string } {
  const seed = Math.floor(now / 1000) + pet.startedAt;
  if (pet.activeHazard?.kind === 'regex') return pick(DEATHS.regex, seed);
  if (pet.hunger <= 2) return pick(DEATHS.starved, seed);
  if (telemetry.cpuPct >= 85) return pick(DEATHS.cpu, seed);
  if (telemetry.droppedEvents > 0 && telemetry.backpressureMs < 1000) return pick(DEATHS.dropped, seed);
  if (telemetry.backpressureMs > 0 || telemetry.blockedOutputs > 0 || !telemetry.healthy) {
    return pick(DEATHS.blocked, seed);
  }
  return pick(DEATHS.quiet, seed);
}

function applyWorld(save: UserSave, pet: PetRun, telemetry: Telemetry, now: number, events: string[]): void {
  pet.metrics ??= { droppedEvents: 0, inEvents: 0, outEvents: 0, inBytes: 0, outBytes: 0, seen: false };
  const diff = DIFFICULTIES[pet.difficulty];
  const realSec = Math.max(0, (now - pet.lastTickAt) / 1000);
  const dilation = save.settings.timeDilation || 1;
  const gameSec = realSec * dilation;
  pet.lifespanSeconds += realSec;
  pet.lastTickAt = now;

  const hungerLoss = diff.hungerPerMinute * (gameSec / 60) * 100;
  pet.hunger = clamp(pet.hunger - hungerLoss, 0, 100);
  if (pet.hunger < 25) pet.happiness = clamp(pet.happiness - gameSec / 30, 0, 100);

  let droppedDelta = telemetry.source === 'gremlin-feed' ? 40 : 0;
  let byteDelta = telemetry.source === 'gremlin-feed' ? 8_000_000 : 0;
  if (pet.metrics.seen && telemetry.source !== 'gremlin-feed') {
    droppedDelta = Math.max(0, telemetry.droppedEvents - pet.metrics.droppedEvents);
    const outDelta = telemetry.outBytes - pet.metrics.outBytes;
    byteDelta = outDelta >= 0 ? outDelta : 0;
  }
  pet.metrics = {
    droppedEvents: telemetry.droppedEvents,
    inEvents: telemetry.inEvents,
    outEvents: telemetry.outEvents,
    inBytes: telemetry.inBytes,
    outBytes: telemetry.outBytes,
    seen: true,
  };
  pet.totalDropped += droppedDelta;
  pet.totalBytesRouted += byteDelta;

  const overBp = telemetry.backpressureMs > diff.backpressureThresholdMs;
  const bpTerm = overBp ? Math.min(25, (telemetry.backpressureMs / 1000) * 1.2) : 0;
  const dropTerm = Math.min(30, droppedDelta * 0.08) * (pet.activeHazard?.kind === 'buffer' ? 2 : 1);
  let hazardPenalty = 0;
  if (pet.activeHazard?.kind === 'regex') hazardPenalty = 4;
  if (pet.activeHazard?.kind === 'jam') hazardPenalty = 1;
  const raw = diff.multiplier * (dropTerm + bpTerm * (1 - resist(save)) + hazardPenalty);
  const dilationHit = dilation <= 1 ? 1 : Math.min(6, 1 + Math.log10(dilation));
  const loss = raw * dilationHit;
  pet.health = clamp(pet.health - loss, 0, 100);

  const inEvents = Math.max(telemetry.inEvents, 0);
  const efficiency = inEvents > 0 ? telemetry.outEvents / inEvents : telemetry.healthy ? 1 : 0.9;
  if (efficiency >= 0.99 && loss < 1 && telemetry.healthy) {
    const ticks = gameSec / 10;
    const recovery = (3 / diff.multiplier) * ticks * (1 + regenBonus(save));
    pet.health = clamp(pet.health + recovery, 0, 100);
    const stipend = Math.floor(ticks * diff.coinBonus);
    pet.byteCoins += stipend;
    pet.xp += Math.floor(stipend * 8 * xpMult(save));
  }

  const gb = byteDelta / 1e9;
  pet.byteCoins += Math.floor(gb) * diff.multiplier;
  pet.byteCoins += Math.floor(byteDelta / 5_000_000) * diff.coinBonus;
  pet.xp += Math.floor((byteDelta / 5_000_000) * 10 * diff.coinBonus * xpMult(save));
  pet.level = 1 + Math.floor(pet.xp / 80);
  pet.maxLevelReached = Math.max(pet.maxLevelReached, pet.level);
  const nextStage = stageForLevel(pet.level);
  if (nextStage !== pet.evolutionStage) {
    pet.evolutionStage = nextStage;
    say(pet, `Evolution! I am a ${stageName(nextStage)} now. Please clap, or route bytes.`, events);
    setAnim(pet, 'HAPPY', now, 3500);
  }

  if (pet.activeHazard?.kind === 'storm' && telemetry.cpuPct >= 80) {
    pet.happiness = clamp(pet.happiness - 8 * dilationHit, 0, 100);
  }
  if (pet.activeHazard && now > pet.activeHazard.deadline && pet.activeHazard.kind !== 'jam') {
    if (pet.activeHazard.kind === 'regex' && !pet.activeHazard.fired) {
      pet.health = clamp(pet.health - 25, 0, 100);
      say(pet, 'The regex won. Minus 25 health. It has written a blog post about you.', events);
    }
    pet.activeHazard = null;
  }

  if (pet.hunger <= 0) pet.health = clamp(pet.health - gameSec * 0.4 * diff.multiplier, 0, 100);
  if (pet.happiness < 15) pet.health = clamp(pet.health - gameSec * 0.15, 0, 100);

  if (pet.health <= 0) {
    const why = causeFromWorld(pet, telemetry, now);
    kill(save, pet, now, why.cause, why.epitaph, events);
    return;
  }

  maybeScheduleHazard(pet, now, events);
  if (pet.animUntil < now) {
    if (pet.health < 40) pet.anim = 'SICK';
    else if (pet.activeHazard || pet.happiness < 30 || overBp) pet.anim = 'STRESSED';
    else if (pet.hunger > 45 && pet.happiness > 55 && pet.health > 60) pet.anim = Math.floor(now / 1000) % 7 === 0 ? 'SLEEP' : 'IDLE';
    else pet.anim = 'IDLE';
  }
}

function applyAction(save: UserSave, action: Action, now: number, events: string[]): void {
  if (action.type === 'hatch') {
    hatch(save, action, now, events);
    return;
  }
  if (action.type === 'dilation') {
    const allowed = [1, 60, 600];
    save.settings.timeDilation = allowed.includes(action.factor) ? action.factor : 1;
    events.push(
      save.settings.timeDilation === 1
        ? 'Time dilation off. Coward mode, but healthy.'
        : `Meeting Time Dilation x${save.settings.timeDilation}. The pet just felt a fiscal quarter.`,
    );
    return;
  }
  if (action.type === 'settings') {
    save.settings.alertThresholdHealth = clamp(Math.round(action.alertThresholdHealth), 5, 90);
    save.settings.muteScreams = action.muteScreams;
    events.push(action.muteScreams ? 'Screams muted. The pet will die quietly, which is worse.' : 'Screams armed. Neighbors included.');
    return;
  }
  if (action.type === 'arm_webhook') {
    save.settings.webhookArmed = true;
    save.settings.webhookHost = action.host;
    events.push('Scream pipe armed. The URL is encrypted. The pet cannot read it. Neither can your coworkers. Good.');
    return;
  }
  if (action.type === 'disarm_webhook') {
    save.settings.webhookArmed = false;
    save.settings.webhookHost = null;
    events.push('Scream pipe forgotten. Suffering is now a local-only feature.');
    return;
  }
  if (action.type === 'test_scream') {
    events.push('Test scream dispatched. If nothing arrives, the pipe is shy or the URL was a bit.');
    return;
  }

  const pet = save.current;
  if (!pet) {
    events.push('There is no pet. You are interacting with the concept of responsibility.');
    return;
  }
  if (!pet.isAlive && action.type !== 'abandon') {
    events.push('They are dead. Buttons do not fix that. A new hatch might. Therapy might.');
    return;
  }

  if (action.type === 'abandon') {
    kill(
      save,
      pet,
      now,
      'Yeeted by their own human.',
      'The incident report is just a shrug with a timestamp.',
      events,
    );
    return;
  }
  if (action.type === 'feed') {
    if (pet.activeHazard?.jammed === 'mouth') {
      say(pet, 'Mouth jammed. I would eat, but a gremlin put a tiny cone on me.', events);
      return;
    }
    if (pet.hunger >= 98) {
      pet.health = clamp(pet.health - 2, 0, 100);
      say(pet, pick(LINES.overfed, now), events);
    } else {
      pet.hunger = clamp(pet.hunger + 28, 0, 100);
      pet.happiness = clamp(pet.happiness + 6, 0, 100);
      say(pet, pick(LINES.fed, now), events);
    }
    setAnim(pet, 'EAT', now);
    return;
  }
  if (action.type === 'pet') {
    pet.happiness = clamp(pet.happiness + 14, 0, 100);
    say(pet, pick(pet.happiness > 95 ? LINES.pettedHappy : LINES.petted, now), events);
    setAnim(pet, 'PETTED', now);
    return;
  }
  if (action.type === 'clean') {
    pet.happiness = clamp(pet.happiness + 8, 0, 100);
    pet.health = clamp(pet.health + 4, 0, 100);
    say(pet, pick(LINES.cleaned, now), events);
    setAnim(pet, 'CLEAN', now);
    return;
  }
  if (action.type === 'fix_regex') {
    if (pet.activeHazard?.kind !== 'regex') {
      say(pet, 'There is no regex to fix. Do not invent one. That is how this started.', events);
      return;
    }
    if (now > pet.activeHazard.deadline) {
      say(pet, 'Too late. The regex has tenure.', events);
      return;
    }
    pet.activeHazard = null;
    pet.happiness = clamp(pet.happiness + 10, 0, 100);
    say(pet, 'You fixed it. I am shocked. I am also still judging the author.', events);
    setAnim(pet, 'HAPPY', now);
    return;
  }
  if (action.type === 'pay_jam') {
    if (pet.activeHazard?.kind !== 'jam') {
      say(pet, 'Nothing is jammed except, arguably, your roadmap.', events);
      return;
    }
    if (pet.byteCoins < 10) {
      say(pet, 'I require ten Byte-Coins. This is a toll booth. I am the toll and the booth.', events);
      return;
    }
    pet.byteCoins -= 10;
    pet.activeHazard = null;
    say(pet, 'Jam cleared. The gremlin left a one-star review.', events);
    return;
  }
  if (action.type === 'summon') {
    if (now - pet.lastSummonAt < 15_000) {
      say(pet, 'The gremlin is on cooldown. Even chaos has a change window.', events);
      return;
    }
    if (pet.activeHazard) {
      say(pet, 'A gremlin is already here. They brought a plus-one. The plus-one is also them.', events);
      return;
    }
    pet.lastSummonAt = now;
    pet.activeHazard = pickHazard(pet, now);
    save.hall.gremlinsSummoned += 1;
    if (save.hall.gremlinsSummoned >= 3) grant(save, 'crown', 'Golden Chaos Crown');
    say(pet, `You summoned this. ${pet.activeHazard.detail}`, events);
    setAnim(pet, 'STRESSED', now, 4000);
    return;
  }
  if (action.type === 'buy') {
    const item = SHOP.find((entry) => entry.id === action.itemId);
    if (!item) {
      say(pet, 'That item fell out of the catalog and into a ditch.', events);
      return;
    }
    const already =
      (item.color && save.unlocks.colors.includes(item.color)) ||
      (item.size && save.unlocks.sizes.includes(item.size)) ||
      (item.feature && save.unlocks.features.includes(item.feature)) ||
      (item.hat && save.unlocks.hats.includes(item.hat));
    if (already) {
      say(pet, 'You already own that. Hoarding is a pipeline anti-pattern.', events);
      return;
    }
    if (pet.byteCoins < item.price) {
      say(pet, `That costs ${item.price} Byte-Coins. You have ${Math.floor(pet.byteCoins)}. This is a skill issue.`, events);
      return;
    }
    pet.byteCoins -= item.price;
    if (item.color) save.unlocks.colors = [...save.unlocks.colors, item.color];
    if (item.size) save.unlocks.sizes = [...save.unlocks.sizes, item.size];
    if (item.feature) save.unlocks.features = [...save.unlocks.features, item.feature];
    if (item.hat) save.unlocks.hats = [...save.unlocks.hats, item.hat];
    syncInventory(save, pet);
    say(pet, `Purchased ${item.name}. ${item.blurb}`, events);
    setAnim(pet, 'HAPPY', now);
    return;
  }
  if (action.type === 'style') {
    const lookError = ownsLook(save.unlocks, action.look);
    if (lookError) {
      say(pet, lookError, events);
      return;
    }
    pet.look = {
      size: action.look.size,
      color: action.look.color,
      features: [...action.look.features],
      hat: action.look.hat,
    };
    say(pet, 'New look acquired. The workers have been notified. They are uncomfortable.', events);
    setAnim(pet, 'HAPPY', now);
  }
}

export function reduce(save: UserSave, telemetry: Telemetry, now: number, action: Action | null): TickResult {
  const next = structuredClone(save);
  const events: string[] = [];
  if (action) applyAction(next, action, now, events);
  const pet = next.current;
  const before = pet?.health ?? 100;
  if (pet?.isAlive) {
    applyWorld(next, pet, telemetry, now, events);
    if (pet.isAlive && events.length === 0) {
      pet.speech = roast(pet, telemetry, now);
    }
    if (pet.health < next.settings.alertThresholdHealth && before >= next.settings.alertThresholdHealth) {
      pet.alertLatched = true;
    }
    if (pet.health > next.settings.alertThresholdHealth + 10) pet.alertLatched = false;
  }
  const died = Boolean(pet && !pet.isAlive && pet.deathRecorded && events.some((line) => line === pet.deathCause));
  const pipeOpen = Boolean(next.settings.webhookArmed && !next.settings.muteScreams);
  const healthAlert = Boolean(
    pipeOpen &&
      pet?.isAlive &&
      pet.alertLatched &&
      pet.health < next.settings.alertThresholdHealth,
  );
  const deathAlert = Boolean(pipeOpen && died);
  const alertKind: AlertKind | null = action?.type === 'test_scream'
    ? 'test'
    : deathAlert
      ? 'death'
      : healthAlert
        ? 'health'
        : null;
  return { save: next, events, died, shouldAlert: alertKind !== null, alertKind };
}

const LINES = {
  fed: [
    'Nom. Dropped events taste like regret and pepper.',
    'Chewy. Slightly malformed. Would ingest again.',
    'Mmm. Tastes like a schema nobody validated.',
    'That one had a trailing comma. Delicious.',
    'Ate it. Did not parse it. We move.',
    'Crunchy on the outside, unstructured on the inside.',
    'Thank you. That log line had real terroir.',
    'Nom nom. I am now 4 percent more JSON.',
    'Swallowed whole, like a stack trace nobody reads.',
    'Good batch. Only mildly cursed.',
    'This one still had the timestamp in the wrong timezone. Spicy.',
    'Fed. My compaction is going to be a problem later.',
  ],
  overfed: [
    'I am full. You are committing a feeding crime. Minus two dignity.',
    'Stop. I have reached maximum payload size.',
    'I am at capacity. This is now backpressure with extra steps.',
    'No more. I will drop these on the floor and you will watch.',
    'Overfed. I am going to need a bigger buffer and a nap.',
    'That is enough. My queue depth is a cry for help.',
    'You are rate limiting me by force feeding me. Impressive.',
    'I am going to be sick and it will be structured logging.',
  ],
  petted: [
    'Stop it. I have a throughput SLA and also please continue.',
    'This is unprofessional. Do it again.',
    'I am being handled. I allow it.',
    'Affection received. Logging at INFO.',
    'Do not tell the workers about this.',
    'I am a serious pipeline mascot. Keep going.',
    'That is nice. I am still going to complain later.',
    'Acknowledged. Escalation cancelled.',
  ],
  pettedHappy: [
    'I am experiencing joy and I hate how public this is.',
    'Maximum happiness. I am insufferable now.',
    'I am so happy I might stop complaining. Might.',
    'This is the best uptime of my life.',
    'Joy levels critical. Alert the on-call.',
    'I have never felt so validated by a mouse click.',
  ],
  cleaned: [
    'You wiped my beautiful sludge. I will pretend to be grateful.',
    'Scooped. That was load-bearing filth.',
    'Clean now. I feel exposed.',
    'You removed my personality layer. Rude but effective.',
    'Tidy. Suspiciously tidy. What are you hiding.',
    'Sanitized. Like a log line with all the useful fields stripped.',
    'Thank you. That buildup was becoming a dependency.',
    'Fresh. I give it ten seconds.',
  ],
};

const ROASTS = {
  denied: [
    'I cannot see the workspace. I will assume it is on fire. I am often correct.',
    'Health is hidden from me. I have chosen to believe the worst. It is cheaper.',
    'No telemetry. I am flying blind and vibing poorly.',
    'Someone revoked my eyes. Classic Tuesday.',
    'I am legally blind to this workspace and spiritually certain it is bad.',
    'Access denied. I will now hallucinate an outage for entertainment.',
  ],
  unhealthy: [
    (t: Telemetry) => `Leader status: ${t.statusText}. I have updated my will.`,
    (t: Telemetry) => `Leader is ${t.statusText}. I am drafting a strongly worded incident review.`,
    (t: Telemetry) => `The leader says "${t.statusText}" the way a cat says "I am fine".`,
    (t: Telemetry) => `Status ${t.statusText}. I have started a group chat about it.`,
    (t: Telemetry) => `Leader: ${t.statusText}. Me: unemployed emotionally.`,
    (t: Telemetry) => `We are ${t.statusText}. I blame whoever merged on a Friday.`,
  ],
  workers: [
    (t: Telemetry) => `Workers say "${t.workerStatus}". I say we fake a dentist appointment.`,
    (t: Telemetry) => `Worker status: ${t.workerStatus}. Someone should hold them.`,
    (t: Telemetry) => `The workers are ${t.workerStatus} and I am not far behind.`,
    (t: Telemetry) => `Workers report ${t.workerStatus}. I report deep unease.`,
    (t: Telemetry) => `The workers are ${t.workerStatus}. I have started stretching.`,
  ],
  hungry: [
    'Feed me. I am one skipped meal away from a sev-1.',
    'My hunger is now a paging condition.',
    'Feed me or I will start dropping events out of spite.',
    'I have not eaten since the last deploy. That was a lifetime ago.',
    'Running on fumes and stale log lines.',
    'Hunger critical. I am considering eating the buffer.',
    'I would like a snack and an apology.',
  ],
  sad: [
    'Pet me. This is not a request. It is a runbook.',
    'My morale has been deprecated.',
    'I require affection. Escalate accordingly.',
    'Happiness is below threshold. Please acknowledge the alert.',
    'I am sad in a way that will show up on a dashboard.',
    'Pet me or I will write a retro about this.',
  ],
  chaos: [
    'I am auditioning for Chaos Gremlin and I am overqualified.',
    'Chaos mode. I am the incident and the incident commander.',
    'I eat instability for breakfast. Then I complain about breakfast.',
    'Chaos difficulty. I did not read the docs and I never will.',
    'I am one bad regex away from becoming a legend.',
    'On Chaos, every day is a game day exercise nobody scheduled.',
  ],
  calm: [
    'Pipeline vibes: suspiciously fine. I remain employed and disappointed.',
    'Everything is healthy. I find this deeply suspicious.',
    'No incidents. I am bored and that is its own emergency.',
    'All green. Somebody is definitely about to deploy something.',
    'The pipes are calm. I do not trust calm.',
    'Nothing is broken. I have never felt more on edge.',
    'Healthy workspace. Unhealthy attachment to my own drama.',
    'Stable. Boring. I would like a small controlled disaster please.',
  ],
};

function roast(pet: PetRun, telemetry: Telemetry, now: number): string {
  const seed = Math.floor(now / 5000);
  if (telemetry.source === 'denied') return pick(ROASTS.denied, seed);
  if (!telemetry.healthy) return pick(ROASTS.unhealthy, seed)(telemetry);
  if (telemetry.workerStatus && telemetry.workerStatus !== 'healthy' && telemetry.workerStatus !== 'none') {
    return pick(ROASTS.workers, seed)(telemetry);
  }
  if (pet.hunger < 35) return pick(ROASTS.hungry, seed);
  if (pet.happiness < 35) return pick(ROASTS.sad, seed);
  if (pet.difficulty === 'chaos') return pick(ROASTS.chaos, seed);
  return pick(ROASTS.calm, seed);
}

export function isAction(value: unknown): value is Action {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as { type?: unknown }).type;
  return (
    kind === 'hatch' ||
    kind === 'feed' ||
    kind === 'pet' ||
    kind === 'clean' ||
    kind === 'fix_regex' ||
    kind === 'pay_jam' ||
    kind === 'summon' ||
    kind === 'buy' ||
    kind === 'style' ||
    kind === 'dilation' ||
    kind === 'settings' ||
    kind === 'arm_webhook' ||
    kind === 'disarm_webhook' ||
    kind === 'test_scream' ||
    kind === 'abandon'
  );
}

export function safeUserId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return cleaned.length > 0 ? cleaned : 'local_gremlin';
}
