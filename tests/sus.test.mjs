// Sus chords have no single parent scale (David, 2026-11-24): every plain
// Lydian scale that holds the chord, its tonics in tonal-gravity order (a
// ladder of fifths). See docs/superpowers/specs/2026-11-24-sus-chords-design.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, lydianAnalysis, lydianTonics, chordNotes, QUALITIES } from '../public/js/theory/chords.js';
import { parseNote, noteName, pc } from '../public/js/theory/notes.js';
import { scaleNotes } from '../public/js/theory/scales.js';

const c = (t) => parseChord(t);
const names = (ns) => ns.map(noteName);
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

test('the Lydian tonics of C sus chords, most ingoing first', () => {
  assert.deepEqual(names(lydianTonics(c('Csus2'))), ['C', 'F', 'B♭', 'E♭', 'A♭']);
  assert.deepEqual(names(lydianTonics(c('Csus4'))), ['F', 'B♭', 'E♭', 'A♭', 'D♭']);
  assert.deepEqual(names(lydianTonics(c('C7sus2'))), ['B♭', 'E♭', 'A♭']);
  assert.deepEqual(names(lydianTonics(c('C7sus4'))), ['B♭', 'E♭', 'A♭', 'D♭']);
});

test('on every root: the right count, each tonic’s Lydian holds the chord, tonics run down in fifths, no double accidentals', () => {
  const counts = { sus2: 5, sus4: 5, '7sus2': 3, '7sus4': 4 };
  for (const [q, n] of Object.entries(counts)) {
    for (const root of ROOTS) {
      const chord = c(`${root}${q}`);
      assert.ok(!chord.error, `${root}${q}: ${chord.error}`);
      const tonics = lydianTonics(chord);
      assert.equal(tonics.length, n, `${chord.symbol}: ${names(tonics)}`);
      const tones = chordNotes(chord).map(pc);
      for (const t of tonics) {
        const scale = scaleNotes(t, 'lydian').map(pc);
        assert.ok(tones.every((p) => scale.includes(p)), `${chord.symbol} in ${noteName(t)} Lydian`);
        assert.ok(scaleNotes(t, 'lydian').every((x) => Math.abs(x.acc) <= 1) && Math.abs(t.acc) <= 1, `${chord.symbol}: ${noteName(t)} Lydian spelled simply`);
      }
      tonics.slice(1).forEach((t, i) => assert.equal((pc(t) + 7) % 12, pc(tonics[i]), `${chord.symbol}: ${names(tonics)} run down in fifths`));
    }
  }
});

test('the drone picks the tonic heard; otherwise the most ingoing one', () => {
  const sus4 = c('Csus4');
  const a = lydianAnalysis(sus4);
  assert.equal(noteName(a.tonic), 'F');
  assert.equal(a.noSingleParent, true);
  assert.equal(a.parentScale, 'lydian');
  assert.deepEqual(names(a.tonics), ['F', 'B♭', 'E♭', 'A♭', 'D♭']);
  assert.equal(noteName(lydianAnalysis(sus4, { centre: parseNote('Bb') }).tonic), 'B♭');
  assert.equal(noteName(lydianAnalysis(sus4, { centre: parseNote('A#') }).tonic), 'B♭', 'matched by pitch class');
  assert.equal(noteName(lydianAnalysis(sus4, { centre: parseNote('D') }).tonic), 'F', 'D is not a tonic of Csus4');
  assert.deepEqual(names(lydianAnalysis(sus4, { centre: parseNote('Bb') }).parentNotes), ['B♭', 'C', 'D', 'E', 'F', 'G', 'A']);
});

test('other chords keep one parent, whatever the centre', () => {
  const a = lydianAnalysis(c('Cmaj7'), { centre: parseNote('G') });
  assert.equal(noteName(a.tonic), 'C');
  assert.equal(a.noSingleParent, false);
  assert.deepEqual(names(a.tonics), ['C']);
});

test('sus names: sus means sus4, 7sus means 7sus4; all four are verified with sources', () => {
  assert.equal(c('Csus').quality, 'sus4');
  assert.equal(c('C7sus').quality, '7sus4');
  assert.equal(c('Csus2').quality, 'sus2');
  assert.equal(c('C7sus2').quality, '7sus2');
  for (const id of ['sus2', 'sus4', '7sus2', '7sus4']) {
    assert.equal(QUALITIES[id].status, 'verified', id);
    assert.equal(QUALITIES[id].noSingleParent, true, id);
    assert.ok(QUALITIES[id].sources.length >= 2, id);
  }
  assert.deepEqual(chordNotes(c('C7sus2')).map(noteName), ['C', 'D', 'G', 'B♭']);
});
