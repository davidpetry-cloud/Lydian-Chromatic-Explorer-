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

test('the heard line spells notes the way the chord spells them', () => {
  assert.equal(recognizeChord([64, 68, 71]).heard, 'E G♯ B');
  assert.equal(recognizeChord([69, 73, 76]).heard, 'A C♯ E');
  assert.equal(recognizeChord([62, 65, 69, 72]).heard, 'D F A C');
});

test('an augmented triad is named from the bass', () => {
  assert.equal(sym([60, 64, 68]), 'Caug');
  assert.equal(sym([64, 68, 72]), 'Eaug');
});

test('a missing 5th is allowed for seventh-family chords', () => {
  assert.equal(sym([55, 59, 65, 69]), 'G9');     // G B F A
  assert.equal(sym([55, 59, 65]), 'G7');          // G B F shell
  assert.equal(sym([60, 64, 71]), 'Cmaj7');       // C E B
  assert.equal(sym([60, 63, 70]), 'Cm7');         // C E♭ B♭
  assert.equal(sym([55, 59, 64, 65, 69]), 'G13'); // G B E F A
});

test('exact matches still win over a missing-5th reading', () => {
  assert.equal(sym([60, 64, 67, 71]), 'Cmaj7');
  assert.equal(sym([57, 60, 64, 67]), 'Am7');
});

test('rootless voicings are still not guessed', () => {
  assert.ok(recognizeChord([65, 71, 76]).error); // F B E
});

test('the heard line lists only the notes actually played', () => {
  assert.equal(recognizeChord([55, 59, 65, 69]).heard, 'G B F A');
});

test('MIDI recognizes the new chord types', () => {
  assert.equal(sym([60, 64, 67, 70, 66]), 'C7#11');
  assert.equal(sym([60, 64, 67, 71, 74]), 'Cmaj9');
  assert.equal(sym([60, 63, 67, 70, 74]), 'Cm9');
  assert.equal(sym([60, 64, 67, 74]), 'Cadd9');
});
