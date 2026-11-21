import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, pc, noteName, transpose, ascendingMidis, midiToFreq } from '../public/js/theory/notes.js';

const n = (s) => parseNote(s);
const names = (notes) => notes.map(noteName).join(' ');

test('parseNote reads letters and accidentals', () => {
  assert.deepEqual(n('Bb'), { letter: 'B', acc: -1 });
  assert.deepEqual(n(' f# '), { letter: 'F', acc: 1 });
  assert.equal(n('Cx').acc, 2);
  assert.equal(n('C##').acc, 2);
  assert.equal(n('D𝄫').acc, -2);
  assert.equal(n('E♭').acc, -1);
  assert.equal(n('H'), null);
  assert.equal(n(''), null);
  assert.equal(n('C#b'), null);
});

test('pc wraps around the octave', () => {
  assert.equal(pc(n('Cb')), 11);
  assert.equal(pc(n('E#')), 5);
  assert.equal(pc(n('B#')), 0);
});

test('noteName uses Unicode accidentals', () => {
  assert.equal(noteName({ letter: 'C', acc: 2 }), 'C𝄪');
  assert.equal(noteName({ letter: 'G', acc: -1 }), 'G♭');
  assert.equal(noteName({ letter: 'A', acc: 0 }), 'A');
});

test('transpose spells by scale degree', () => {
  assert.equal(noteName(transpose(n('C'), '#4')), 'F♯');
  assert.equal(noteName(transpose(n('D'), 'b3')), 'F');
  assert.equal(noteName(transpose(n('F#'), '#5')), 'C𝄪');
  assert.equal(noteName(transpose(n('C'), 'bb7')), 'B𝄫');
  assert.equal(noteName(transpose(n('Gb'), '1')), 'G♭');
  assert.equal(noteName(transpose(n('C'), '#2')), 'D♯');
});

test('transpose refuses triple accidentals', () => {
  assert.throws(() => transpose(n('Cx'), '#4'), RangeError);
});

test('ascendingMidis climbs from octave 4 and closes on the octave', () => {
  assert.deepEqual(ascendingMidis(['C', 'D', 'E', 'F#', 'G', 'A', 'B'].map(n)), [60, 62, 64, 66, 67, 69, 71, 72]);
  assert.deepEqual(ascendingMidis(['A', 'C', 'E'].map(n)), [69, 72, 76, 81]);
});

test('midiToFreq uses A4 = 440 Hz', () => {
  assert.equal(midiToFreq(69), 440);
  assert.equal(midiToFreq(60).toFixed(2), '261.63');
});
