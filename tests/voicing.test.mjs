import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord } from '../public/js/theory/chords.js';
import { voiceChord, voiceProgression } from '../public/js/theory/voicing.js';

const c = (s) => parseChord(s);
const pcs = (midis) => new Set(midis.map((m) => m % 12));

test('the bass sits in octave 2, the chord above it', () => {
  const v = voiceChord(c('Cmaj7/E'));
  assert.equal(v.bass, 40);
  assert.deepEqual(pcs(v.upper), new Set([0, 7, 11]));
  assert.ok(v.upper.every((m) => m >= 60 && m <= 71));
  assert.deepEqual(v.upper, [...v.upper].sort((a, b) => a - b));
});

test('a root-position chord keeps all its tones above the bass', () => {
  const v = voiceChord(c('Dm7'));
  assert.equal(v.bass, 38);
  assert.deepEqual(pcs(v.upper), new Set([2, 5, 9, 0]));
});

test('a ii–V–I moves each upper voice by two semitones or less', () => {
  const vs = voiceProgression(['Dm7', 'G7', 'Cmaj7'].map(c));
  for (let i = 1; i < vs.length; i++) {
    const a = vs[i - 1].upper; const b = vs[i].upper;
    assert.equal(a.length, b.length);
    a.forEach((m, k) => assert.ok(Math.abs(b[k] - m) <= 2, `voice ${k}: ${m} → ${b[k]}`));
  }
});

test('a pedal bass stays put under changing chords', () => {
  const vs = voiceProgression(['Dm7/G', 'G7', 'Cmaj7/G'].map(c));
  assert.deepEqual(vs.map((v) => v.bass), [43, 43, 43]);
});

test('G7 to C resolves the tendency tones: B up to C, F down to E', () => {
  const [g7, c] = voiceProgression([parseChord('G7'), parseChord('C')]);
  const b = g7.upper.find((m) => m % 12 === 11);
  const f = g7.upper.find((m) => m % 12 === 5);
  assert.ok(c.upper.includes(b + 1), `B ${b} → ${c.upper}`);
  assert.ok(c.upper.includes(f - 1), `F ${f} → ${c.upper}`);
});

test('a root-position chord keeps its root above the bass too', () => {
  assert.ok(voiceChord(c('C')).upper.some((m) => m % 12 === 0));
});
