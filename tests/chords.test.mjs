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
  const m6 = QUALITIES.m6;
  assert.equal(m6.status, 'pending');
  assert.ok(parseChord('Cm6').error);
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
