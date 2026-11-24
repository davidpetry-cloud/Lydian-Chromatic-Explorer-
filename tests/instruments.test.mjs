// The instrument format: what each sound is, and how it plays a drone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, DRONE_SOUNDS, droneMidis } from '../public/js/audio/instruments.js';

test('the drone sounds are organ, pad, bass and piano, each described', () => {
  assert.deepEqual(DRONE_SOUNDS, ['organ', 'pad', 'bass', 'piano']);
  for (const id of DRONE_SOUNDS) {
    const i = INSTRUMENTS[id];
    assert.equal(i.id, id);
    assert.match(i.name, /\w/);
    assert.ok(['recorded', 'synth'].includes(i.kind), id);
  }
  assert.deepEqual(DRONE_SOUNDS.map((id) => INSTRUMENTS[id].name), ['Organ', 'Synth pad', 'Upright bass', 'Piano']);
});

test('organ and pad hold; piano and bass die away and are re-struck', () => {
  assert.equal(INSTRUMENTS.organ.holds, true);
  assert.equal(INSTRUMENTS.pad.holds, true);
  assert.equal(INSTRUMENTS.piano.holds, false);
  assert.equal(INSTRUMENTS.piano.restrikeBeats, 4);
  assert.equal(INSTRUMENTS.bass.holds, false);
  assert.equal(INSTRUMENTS.bass.restrikeBeats, 2);
});

test('recorded instruments name their credit', () => {
  assert.match(INSTRUMENTS.piano.credit, /Salamander/);
  assert.match(INSTRUMENTS.bass.credit, /VSCO 2/);
});

test('drone notes: root and fifth in octave 3, but the bass plays the root alone in octave 2', () => {
  assert.deepEqual(droneMidis('organ', 2), [50, 57]);
  assert.deepEqual(droneMidis('pad', 0), [48, 55]);
  assert.deepEqual(droneMidis('piano', 11), [59, 66]);
  assert.deepEqual(droneMidis('bass', 0), [36]);
  assert.deepEqual(droneMidis('bass', 11), [47]);
});
