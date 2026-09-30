import assert from 'node:assert/strict';
import test from 'node:test';
import { createSave, calmTelemetry, reduce } from '../src/game/engine.ts';

test('hatch customizes the pet and refuses locked looks', () => {
  const save = createSave('user', 'Darren');
  const denied = reduce(
    save,
    calmTelemetry(),
    1_000,
    { type: 'hatch', name: 'Droppy', difficulty: 'chaos', look: { size: 'forbidden', color: 'lcd', features: ['unibrow'], hat: null } },
  );
  assert.equal(denied.save.current, null);
  assert.match(denied.events.join(' '), /size/i);

  const hatched = reduce(
    save,
    calmTelemetry(),
    2_000,
    { type: 'hatch', name: 'Regex Rex', difficulty: 'chaos', look: { size: 'smol', color: 'lcd', features: ['unibrow', 'unibrow'], hat: null } },
  );
  assert.equal(hatched.save.current?.name, 'Regex Rex');
  assert.equal(hatched.save.current?.look.size, 'smol');
  assert.equal(hatched.save.current?.difficulty, 'chaos');
});

test('a blocked workspace can kill a chaos pet', () => {
  let save = createSave('user', 'Darren');
  save = reduce(
    save,
    calmTelemetry(),
    1_000,
    { type: 'hatch', name: 'Byte', difficulty: 'chaos', look: { size: 'chonk', color: 'lcd', features: [], hat: null } },
  ).save;
  const storm = calmTelemetry({
    healthy: false,
    statusText: 'down',
    workerStatus: 'down',
    backpressureMs: 9000,
    blockedOutputs: 2,
    cpuPct: 96,
    source: 'cribl',
  });
  let now = 11_000;
  let dead = false;
  for (let i = 0; i < 8 && !dead; i += 1) {
    const result = reduce(save, storm, now, null);
    save = result.save;
    dead = !save.current?.isAlive;
    now += 10_000;
  }
  assert.equal(dead, true);
  assert.ok(save.graveyard.length === 1);
  const grave = save.graveyard[0];
  assert.ok((grave?.causeOfDeath ?? '').length > 10);
  assert.ok((grave?.epitaph ?? '').length > 10);
});

test('style and shop spend coins and persist unlocks', () => {
  let save = createSave('user', 'Darren');
  save = reduce(
    save,
    calmTelemetry(),
    1_000,
    { type: 'hatch', name: 'Beep', difficulty: 'easy', look: { size: 'chonk', color: 'lcd', features: ['unibrow'], hat: null } },
  ).save;
  save.current!.byteCoins = 50;
  save = reduce(save, calmTelemetry(), 2_000, { type: 'buy', itemId: 'feat_mustache' }).save;
  assert.ok(save.unlocks.features.includes('mustache'));
  assert.ok((save.current?.byteCoins ?? 0) < 50);
  save = reduce(save, calmTelemetry(), 3_000, {
    type: 'style',
    look: { size: 'smol', color: 'lcd', features: ['mustache'], hat: null },
  }).save;
  assert.equal(save.current?.look.size, 'smol');
  assert.deepEqual(save.current?.look.features, ['mustache']);
});
