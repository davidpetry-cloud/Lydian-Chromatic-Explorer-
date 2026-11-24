// Reading a voicing by tonal gravity, counted from the centre (the drone
// note): ranks, how far out it reaches, and its mode colour. It describes;
// it never tells the player to resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravityReading } from '../public/js/theory/reading.js';
import { parseChord, lydianAnalysis, chordNotes, QUALITIES } from '../public/js/theory/chords.js';
import { parseNote } from '../public/js/theory/notes.js';

const read = (chordText, midis, centre) => {
  const chord = parseChord(chordText);
  return gravityReading(midis, parseNote(centre), lydianAnalysis(chord).parentNotes, chordNotes(chord));
};

test('D-7 heard from G: G Mixolydian, and the voicing reaches out to C', () => {
  const r = read('Dm7', [57, 62, 65, 72], 'G'); // A D F C
  assert.equal(r.colour, 'G Mixolydian');
  assert.deepEqual(r.ranks, [3, 2, 10, 11]);
  assert.match(r.words, /reaches outward to C/);
  assert.equal(r.reach.rank, 11);
});

test('close Cmaj7 heard from C stays inside', () => {
  const r = read('Cmaj7', [59, 60, 64, 67], 'C');
  assert.equal(r.words, 'inside: nothing past rank 7');
  assert.equal(r.colour, 'C Lydian');
  assert.equal(r.reach, null);
});

test('a centre outside the parent scale has no colour name, and still reads', () => {
  const r = read('Cmaj7', [59, 60, 64, 67], 'Ab');
  assert.equal(r.colour, null);
  assert.equal(r.ranks.length, 4);
});

test('the reading describes and never prescribes', () => {
  const centres = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  for (const root of centres) {
    for (const q of ['maj7', 'm7', '7']) {
      for (const centre of centres) {
        const r = read(root + QUALITIES[q].aliases[0], [60, 64, 67, 70], centre);
        assert.doesNotMatch(r.words, /must|should|resolve/i);
      }
    }
  }
});
