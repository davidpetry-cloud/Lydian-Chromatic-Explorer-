import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, noteName } from '../public/js/theory/notes.js';
import { scaleNotes } from '../public/js/theory/scales.js';
import { MAJOR_MODE_NAMES, modeFrom } from '../public/js/theory/modes.js';

const n = parseNote;
const names = (notes) => notes.map(noteName).join(' ');

test('the seven major-scale modes, named by the Lydian degree they start on', () => {
  assert.deepEqual(MAJOR_MODE_NAMES, ['Lydian', 'Mixolydian', 'Aeolian', 'Locrian', 'Ionian', 'Dorian', 'Phrygian']);
});

test('E♭ Lydian from C is C Dorian', () => {
  const m = modeFrom(scaleNotes(n('Eb'), 'lydian'), n('C'));
  assert.equal(names(m.notes), 'C D E♭ F G A B♭');
  assert.equal(m.name, 'Dorian');
});

test('F Lydian from G is G Mixolydian; C Lydian from C is C Lydian', () => {
  assert.equal(modeFrom(scaleNotes(n('F'), 'lydian'), n('G')).name, 'Mixolydian');
  assert.equal(modeFrom(scaleNotes(n('C'), 'lydian'), n('C')).name, 'Lydian');
  assert.equal(modeFrom(scaleNotes(n('F'), 'lydian'), n('B')).name, 'Locrian');
});

test('scales that are not major-scale modes get notes but no name', () => {
  const m = modeFrom(scaleNotes(n('Eb'), 'lydian-augmented'), n('C'));
  assert.equal(names(m.notes), 'C D E♭ F G A B');
  assert.equal(m.name, null);
});

test('a root that is not in the scale gives null', () => {
  assert.equal(modeFrom(scaleNotes(n('C'), 'lydian'), n('Eb')), null);
});
