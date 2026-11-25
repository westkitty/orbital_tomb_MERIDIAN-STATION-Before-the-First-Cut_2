import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, LIFE_END, CHAPTERS, SCARS, ENTITY_IDS, stateAt, monthAt, scarsAt, cameraAt, comparisonCamera } from '../src/timeline.js';

test('exact 30/90 boundaries', () => {
  assert.equal(DURATION, 90); assert.equal(LIFE_END, 30);
  assert.equal(monthAt(29.99), 0); assert.equal(monthAt(30), 1);
  assert.equal(monthAt(89.99), 6); assert.equal(monthAt(90), 6);
  assert.equal(CHAPTERS.length, 9);
  assert.equal(CHAPTERS[0].start, 0); assert.equal(CHAPTERS[8].end, 90);
});

test('12 intact arms, stable IDs', () => {
  const arms = ENTITY_IDS.filter(id => id.startsWith('structure.docking.arm'));
  assert.equal(arms.length, 12);
  assert.ok(ENTITY_IDS.includes('structure.docking.arm01'));
  assert.ok(ENTITY_IDS.includes('entity.tiger'));
  assert.equal(new Set(ENTITY_IDS).size, ENTITY_IDS.length);
});

test('no Tiger/damage before 0:30', () => {
  for (const t of [0, 10, 29.9]) {
    const s = stateAt(t);
    assert.equal(s.tigerVisible, 0); assert.equal(s.tigerImplied, 0);
    assert.equal(s.scars.length, 0); assert.equal(s.arm01Attached, 1);
  }
});

test('growing scars, cumulative', () => {
  assert.equal(scarsAt(5).length, 0);
  assert.equal(scarsAt(35).length, 1);
  assert.equal(scarsAt(45).length, 2);
  assert.equal(scarsAt(55).length, 3);
  assert.equal(scarsAt(65).length, 4);
  assert.equal(scarsAt(75).length, 5);
  assert.equal(scarsAt(85).length, 6);
  assert.equal(SCARS.length, 6);
});

test('sealed route and valid bypass', () => {
  const before = stateAt(20), after = stateAt(38);
  assert.equal(before.sealClosed, 0); assert.equal(before.bypassOpen, 0);
  assert.ok(after.sealClosed > 0.9); assert.ok(after.bypassOpen > 0.6);
  assert.equal(after.cartDamaged, 1); assert.equal(before.cartDamaged, 0);
});

test('identical state from linear vs shuffled seeks (determinism)', () => {
  const probes = [0, 8, 20, 30, 38, 50, 66, 75, 88, 90];
  const linear = probes.map(t => JSON.stringify(stateAt(t)));
  const shuffled = [...probes].reverse().map(t => JSON.stringify(stateAt(t))).reverse();
  assert.deepEqual(shuffled, linear);
  // camera determinism incl. recurrence variants
  assert.deepEqual(cameraAt(55, 'audience'), cameraAt(55, 'audience'));
  assert.notDeepEqual(cameraAt(55, 'audience').pos, cameraAt(55, 'witness').pos);
});

test('endpoint composition: hands return', () => {
  const s80 = stateAt(80), s89 = stateAt(89);
  assert.ok(s80.finaleOut >= 0); assert.ok(s89.finaleBack > 0.9);
  assert.ok(stateAt(87).bloom > 0.5);
});

test('comparison cameras matched', () => {
  for (const k of ['dock', 'hydro', 'chapel']) {
    const c = comparisonCamera(k);
    assert.ok(Array.isArray(c.pos) && Array.isArray(c.tgt));
  }
});
