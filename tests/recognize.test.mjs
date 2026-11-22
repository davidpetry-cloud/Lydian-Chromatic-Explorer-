import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recognizeChord } from '../public/js/input/recognize.js';

const sym = (notes) => recognizeChord(notes).chord.symbol;

test('recognizes a root-position chord', () => {
  assert.equal(sym([60, 64, 67, 71]), 'Cmaj7');
});

test('recognizes an inversion by trying other roots after the bass', () => {
  assert.equal(sym([64, 67, 71, 72]), 'Cmaj7');
});

test('the bass decides between twin chords (C6 vs Am7)', () => {
  assert.equal(sym([60, 64, 67, 69]), 'C6');
  assert.equal(sym([57, 60, 64, 67]), 'Am7');
});

test('recognizes a ii-V', () => {
  assert.equal(sym([62, 65, 69, 72]), 'Dm7');
  assert.equal(sym([55, 59, 62, 65]), 'G7');
});

test('doubled notes and octaves collapse to the chord', () => {
  const r = recognizeChord([48, 60, 64, 67, 72]);
  assert.equal(r.chord.symbol, 'C');
  assert.equal(r.chord.quality, 'maj');
});

test('fewer than three pitch classes is not a chord yet', () => {
  assert.equal(recognizeChord([60, 64]), null);
  assert.equal(recognizeChord([60, 72, 64]), null);
  assert.equal(recognizeChord([]), null);
});

test('unknown note sets get a friendly message', () => {
  assert.equal(recognizeChord([60, 62, 64, 65]).error, "C D E F isn't a chord I know yet.");
  assert.equal(sym([60, 64, 67, 68]), 'A♭maj7#5'); // C E G A♭ is really A♭maj7♯5
});

test('chords still waiting on sources are not named', () => {
  assert.ok(recognizeChord([60, 63, 66, 69]).error);
});

test('roots are spelled like the root picker', () => {
  assert.equal(sym([66, 70, 73, 76]), 'F♯7');
  assert.equal(recognizeChord([60, 64, 67, 71]).heard, 'C E G B');
});
