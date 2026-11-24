import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, noteName, pc } from '../public/js/theory/notes.js';
import { scalePcs } from '../public/js/theory/scales.js';
import { SOURCES } from '../public/js/data/sources.js';
import { QUALITIES, SUPPORTED_QUALITIES, parseChord, chordNotes, lydianAnalysis } from '../public/js/theory/chords.js';

const any = (text) => parseChord(text, { allowPending: true });
const names = (notes) => notes.map(noteName).join(' ');
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(parseNote);

test('parses major-seventh spellings', () => {
  for (const text of ['Cmaj7', 'CΔ7', ' cmaj7 ', 'CM7']) {
    const c = any(text);
    assert.equal(noteName(c.root), 'C', text);
    assert.equal(c.quality, 'maj7', text);
  }
});

test('parses flat roots in ASCII and Unicode', () => {
  for (const text of ['Bb7', 'B♭7']) {
    const c = any(text);
    assert.equal(noteName(c.root), 'B♭');
    assert.equal(c.quality, '7');
  }
});

test('a bare root is a major triad', () => {
  assert.equal(any('G').quality, 'maj');
});

test('case after the root matters: M7 is major, m7 is minor', () => {
  assert.equal(any('CM7').quality, 'maj7');
  assert.equal(any('Cm7').quality, 'm7');
  assert.equal(any('c-7').quality, 'm7');
});

test('bad input gives a friendly error', () => {
  assert.match(any('H7').error, /know “H”/);
  assert.ok(any('C7#').error);
  assert.ok(any('').error);
  assert.ok(any('   ').error);
});

test('spellings needing triple accidentals are refused, not thrown', () => {
  assert.ok(any('Cbdim7').error);
});

test('Lydian analysis of a ii–V–I', () => {
  const ii = lydianAnalysis(any('Dm7'));
  assert.equal(noteName(ii.tonic), 'F');
  assert.equal(ii.parentScale, 'lydian');
  const v = lydianAnalysis(any('G7'));
  assert.equal(noteName(v.tonic), 'F');
  assert.equal(v.parentScale, 'lydian');
  const i = lydianAnalysis(any('Cmaj7'));
  assert.equal(names(i.parentNotes), 'C D E F♯ G A B');
  assert.equal(i.ladder.length, 7);
});

test('flat keys stay flat', () => {
  assert.equal(noteName(lydianAnalysis(any('Gb7')).tonic), 'F♭');
  assert.equal(names(chordNotes(any('Ebm7'))), 'E♭ G♭ B♭ D♭');
});

test('every mapped chord sits inside its parent scale, on all 12 roots', () => {
  for (const q of Object.values(QUALITIES)) {
    if (!q.tonicDegree) continue;
    for (const root of ROOTS) {
      const chord = { root, quality: q.id };
      const a = lydianAnalysis(chord);
      const parent = scalePcs(a.tonic, a.parentScale);
      for (const n of chordNotes(chord)) assert.ok(parent.has(pc(n)), `${noteName(root)}${q.id}: ${noteName(n)}`);
    }
  }
});

test('only verified rows are supported', () => {
  for (const id of SUPPORTED_QUALITIES) {
    assert.equal(QUALITIES[id].status, 'verified', id);
    assert.ok(QUALITIES[id].sources.length >= 2, id);
  }
});

test('pending qualities are refused by default', () => {
  const sus = QUALITIES['7sus4'];
  assert.equal(sus.status, 'pending');
  assert.ok(parseChord('C7sus4').error);
});

test('verified rows cite known sources', () => {
  const ids = new Set(SOURCES.map((s) => s.id));
  for (const id of SUPPORTED_QUALITIES) for (const s of QUALITIES[id].sources) assert.ok(ids.has(s), `${id}: ${s}`);
});

test('at least 12 qualities verified', () => {
  assert.ok(SUPPORTED_QUALITIES.length >= 12, String(SUPPORTED_QUALITIES.length));
});

test('the parser accepts verified chords without allowPending', () => {
  for (const text of ['Cmaj7', 'Dm7', 'G7', 'Caug', 'Gb7']) assert.ok(!parseChord(text).error, text);
});

test('maj, min, dim and aug words are read in any case, and spaces are ignored', () => {
  assert.equal(any('CMaj7').quality, 'maj7');
  assert.equal(any('CMAJ7').quality, 'maj7');
  assert.equal(any('Cmaj 7').quality, 'maj7');
  assert.equal(any('C Min7').quality, 'm7');
  assert.equal(any('CAug').quality, 'aug');
  assert.equal(any('CM7').quality, 'maj7');
  assert.equal(any('Cm7').quality, 'm7');
});

test('a bad accidental names the whole root it could not read', () => {
  assert.match(any('Cbbb7').error, /“Cbbb”/);
  assert.match(any('C#b7').error, /“C#b”/);
});

test('new verified chord types: 7♯11 and extended chords', () => {
  const cases = {
    'C7#11': ['C', 'lydian-flat-seventh'],
    'Cmaj9': ['C', 'lydian'], 'Cadd9': ['C', 'lydian'], 'Cmaj13': ['C', 'lydian'],
    'Cm9': ['E♭', 'lydian'], 'Cm11': ['E♭', 'lydian'], 'Cm13': ['E♭', 'lydian'],
  };
  for (const [text, [tonic, parent]] of Object.entries(cases)) {
    const c = parseChord(text);
    assert.ok(!c.error, `${text}: ${c.error}`);
    const a = lydianAnalysis(c);
    assert.equal(noteName(a.tonic), tonic, text);
    assert.equal(a.parentScale, parent, text);
  }
});

test('Chart A chord types (Russell, 4th ed., inside cover): tonic and parent, most ingoing home', () => {
  const cases = {
    'Cm6': ['E♭', 'lydian'], // Lydian VI, "min 6th"
    'Cm7b5': ['G♭', 'lydian'], // Lydian +IV, "min 7th ♭5"
    'Cdim': ['G♭', 'lydian'], // inferred: the triad inside m7♭5
    'C7#5': ['E', 'lydian-augmented'], // Lydian Augmented +V, "7th +5"
    'C7alt': ['E', 'lydian-augmented'], // Lydian Augmented +V: ♯5 with ♭9, ♯9, ♯11
    'Cm(maj7)': ['E♭', 'lydian-augmented'], // Lydian Augmented VI, "min +7"
    'Cdim7': ['G♭', 'lydian-diminished'], // Lydian Diminished +IV, "Dim tetrachord"
    'C7b9': ['B♭', 'lydian-diminished'], // Lydian Diminished II, "7th ♭9"
    'C7#9': ['D♭', 'lydian-diminished'], // Lydian Diminished VII, "7th +9"
  };
  for (const [text, [tonic, parent]] of Object.entries(cases)) {
    const c = parseChord(text);
    assert.ok(!c.error, `${text}: ${c.error}`);
    const a = lydianAnalysis(c);
    assert.equal(noteName(a.tonic), tonic, text);
    assert.equal(a.parentScale, parent, text);
  }
});

test('a tritone-up tonic that would need triple flats is spelled with a sharp instead', () => {
  assert.equal(noteName(lydianAnalysis(parseChord('Dbm7b5')).tonic), 'G');
  assert.equal(noteName(lydianAnalysis(parseChord('Cm7b5')).tonic), 'G♭');
  assert.equal(noteName(lydianAnalysis(parseChord('Dbdim7')).tonic), 'G');
});

test('chords with another home on Chart A, or inferred, say so', () => {
  for (const id of ['7b9', '7s9', 'mmaj7', 'dim']) assert.match(QUALITIES[id].note ?? '', /\w/, id);
  assert.match(QUALITIES.dim.note, /inferred/i);
  assert.match(QUALITIES.mmaj7.note, /Lydian Diminished/);
});

test('every verified chord parses on every picker root (no impossible spellings)', () => {
  for (const id of SUPPORTED_QUALITIES) {
    for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      const c = parseChord(root + QUALITIES[id].aliases[0]);
      assert.ok(!c.error, `${root}${QUALITIES[id].aliases[0]}: ${c.error}`);
    }
  }
});

test('28 chord types are verified now; only 7sus4 waits', () => {
  assert.equal(SUPPORTED_QUALITIES.length, 28);
  assert.deepEqual(Object.values(QUALITIES).filter((x) => x.status !== 'verified').map((x) => x.id), ['7sus4']);
});

test('slash chords carry a bass note and keep the analysis', () => {
  const c = parseChord('Cmaj7/E');
  assert.equal(noteName(c.bass), 'E');
  assert.equal(c.symbol, 'Cmaj7/E');
  assert.equal(noteName(lydianAnalysis(c).tonic), 'C');
  const p = parseChord('Dm7/G');
  assert.equal(noteName(p.bass), 'G');
  assert.equal(noteName(lydianAnalysis(p).tonic), 'F');
  assert.equal(noteName(parseChord('C/Bb').bass), 'B♭');
  assert.equal(noteName(parseChord('C/B♭').bass), 'B♭');
});

test('without a slash the bass is the root', () => {
  const c = parseChord('Cmaj7');
  assert.equal(noteName(c.bass), 'C');
  assert.equal(c.symbol, 'Cmaj7');
});

test('6/9 is still a chord type, and can take a slash bass too', () => {
  assert.equal(parseChord('C6/9').quality, '69');
  assert.equal(noteName(parseChord('C6/9').bass), 'C');
  const c = parseChord('C6/9/E');
  assert.equal(c.quality, '69');
  assert.equal(noteName(c.bass), 'E');
});

test('a bad bass note gets a friendly error', () => {
  assert.match(parseChord('Cmaj7/H').error, /bass note/);
});

test('a slash naming the root itself is not kept', () => {
  assert.equal(parseChord('Emaj7/E').symbol, 'Emaj7');
});
