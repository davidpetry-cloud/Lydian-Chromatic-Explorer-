import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, noteName, pc } from '../public/js/theory/notes.js';
import { PRINCIPAL_SCALES, scaleById, scaleNotes, scalePcs } from '../public/js/theory/scales.js';
import { GRAVITY_DEGREES, gravityOrder, gravityRank, rankScales } from '../public/js/theory/gravity.js';

const C = parseNote('C');
const names = (notes) => notes.map(noteName).join(' ');

test('seven principal scales, ingoing to outgoing', () => {
  assert.deepEqual(PRINCIPAL_SCALES.map((s) => s.id), [
    'lydian', 'lydian-augmented', 'lydian-diminished', 'lydian-flat-seventh',
    'auxiliary-augmented', 'auxiliary-diminished', 'auxiliary-diminished-blues',
  ]);
  assert.ok(Object.isFrozen(PRINCIPAL_SCALES));
});

test('scales are spelled from the tonic', () => {
  assert.equal(names(scaleNotes(C, 'lydian')), 'C D E F♯ G A B');
  assert.equal(names(scaleNotes(C, 'auxiliary-diminished-blues')), 'C D♭ E♭ E F♯ G A B♭');
  assert.equal(names(scaleNotes(C, 'auxiliary-augmented')), 'C D E F♯ G♯ B♭');
  assert.ok(names(scaleNotes(parseNote('F#'), 'lydian-augmented')).includes('C𝄪'));
});

test('scaleById rejects unknown ids', () => {
  assert.throws(() => scaleById('dorian'));
});

test('gravity order stacks fifths, then the outer tones', () => {
  assert.equal(GRAVITY_DEGREES.length, 12);
  assert.equal(names(gravityOrder(C)), 'C G D A E B F♯ G♯ E♭ B♭ F D♭');
});

test('each scale stays inside its nesting depth of the gravity order', () => {
  const depth = [7, 8, 9, 10, 10, 11, 12];
  for (const tonic of ['C', 'Eb', 'F#', 'A'].map(parseNote)) {
    PRINCIPAL_SCALES.forEach((s, i) => {
      for (const p of scalePcs(tonic, s.id)) assert.ok(gravityRank(tonic, p) <= depth[i], `${s.id} on ${noteName(tonic)}`);
    });
  }
});

test('the seven scales together cover all twelve tones', () => {
  const all = new Set();
  for (const s of PRINCIPAL_SCALES) for (const p of scalePcs(C, s.id)) all.add(p);
  assert.equal(all.size, 12);
});

test('rankScales marks which scales hold the chord', () => {
  const cmaj7 = new Set(['C', 'E', 'G', 'B'].map((x) => pc(parseNote(x))));
  const ladder = rankScales(C, cmaj7);
  assert.equal(ladder.length, 7);
  assert.equal(ladder[0].scale.id, 'lydian');
  assert.equal(ladder[0].holdsChord, true);
  assert.deepEqual(ladder.find((r) => r.scale.id === 'lydian-flat-seventh').missing, [11]);
});
