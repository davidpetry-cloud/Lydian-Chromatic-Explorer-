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

// Task 2: everything follows the tonic heard.
import { voiceAs, voicingsFor } from '../public/js/theory/voicings.js';
import { smoothInto, planeInto } from '../public/js/theory/voiceleading.js';
import { resolveDrone } from '../public/js/audio/drone.js';

test('voicings draw their extra notes from the parent heard (F Lydian has B, B♭ Lydian has B♭)', () => {
  const sus4 = c('Csus4');
  const pcsOf = (ms) => new Set(ms.map((m) => m % 12));
  assert.ok(pcsOf(voiceAs('quartal', sus4)).has(11) || !pcsOf(voiceAs('quartal', sus4)).has(10), 'from F Lydian: no B♭');
  const fromBb = voiceAs('quartal', sus4, { centre: parseNote('Bb') });
  assert.ok(fromBb && !pcsOf(fromBb).has(11), `from B♭ Lydian: no B natural: ${fromBb}`);
  assert.deepEqual(voicingsFor(sus4, { centre: parseNote('Bb') }).find((v) => v.id === 'quartal').midis, fromBb);
});

test('leading into a sus chord uses the next chord’s own centre', () => {
  const from = voiceAs('quartal', c('Cmaj7'));
  const to = smoothInto(from, c('Csus4'), 'quartal', { centre: parseNote('Bb') });
  assert.ok(to && !to.some((m) => m % 12 === 11), `aims at B♭ Lydian's quartal: ${to}`);
  const planed = planeInto('quartal', from, c('Cmaj7'), c('Csus4'), { centre: parseNote('Bb') });
  assert.deepEqual(new Set(planed.midis.map((m) => m % 12)), new Set(voiceAs('quartal', c('Csus4'), { centre: parseNote('Bb') }).map((m) => m % 12)));
});

test('Drone on: Lydian tonic means the most ingoing tonic of a sus chord', () => {
  const sus4 = c('Csus4');
  assert.equal(noteName(resolveDrone({ mode: 'tonic' }, sus4, lydianAnalysis(sus4).tonic)), 'F');
});

// Task 3: the panel's words.
import { susReadings, ladderLine } from '../public/js/theory/sus-readings.js';

test('other names for the same notes', () => {
  assert.deepEqual(susReadings(c('Csus4')), ['Fsus2', 'G7sus4 (no 5th)']);
  assert.deepEqual(susReadings(c('Csus2')), ['Gsus4', 'D7sus4 (no 5th)']);
  assert.deepEqual(susReadings(c('C7sus2')), []);
  assert.deepEqual(susReadings(c('C7sus4')), []);
  assert.deepEqual(susReadings(c('Ebsus4')), ['A♭sus2', 'B♭7sus4 (no 5th)'], 'spelled as the chord spells them');
});

test('the ladder line: five tonics make a major pentatonic', () => {
  assert.equal(ladderLine(lydianTonics(c('Csus4'))), 'These tonics run down in fifths (Russell’s ladder): together they are the D♭ major pentatonic.');
  assert.equal(ladderLine(lydianTonics(c('Csus2'))), 'These tonics run down in fifths (Russell’s ladder): together they are the A♭ major pentatonic.');
  assert.equal(ladderLine(lydianTonics(c('C7sus4'))), 'These tonics run down in fifths (Russell’s ladder).');
});

// Task 4: voicings and MIDI.
import { recognizeChord } from '../public/js/input/recognize.js';

test('voicings of sus chords: the sus tone stands in for the 3rd', () => {
  const n = (ms) => ms.map((m) => ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12]);
  // Root lowest, then the 7th and the sus note either way up (Hutchinson), and no 3rd added.
  for (const [t, sus] of [['C7sus4', 'F'], ['C7sus2', 'D']]) {
    const m = n(voiceAs('spread', c(t)));
    assert.equal(m[0], 'C', `${t}: ${m}`);
    assert.deepEqual(new Set(m.slice(1, 3)), new Set(['B♭', sus]), `${t}: ${m}`);
    assert.ok(!m.includes('E'), `${t}: no 3rd added: ${m}`);
  }
  assert.equal(voiceAs('spread', c('Csus2')), null, 'a triad has no spread');
  assert.equal(voiceAs('cluster', c('Csus2')), null, 'the stand-in is the 9th itself');
  assert.equal(voiceAs('cluster', c('C7sus2')), null);
  assert.equal(voiceAs('rootlessA', c('C7sus4')), null);
});

test('MIDI: a 7sus2 without its 5th is named; exact readings still come first', () => {
  assert.equal(recognizeChord([60, 62, 70]).chord.symbol, 'C7sus2');
  assert.equal(recognizeChord([55, 60, 65]).chord.symbol, 'Csus4/G', 'exact match on another root wins over a missing 5th');
});
