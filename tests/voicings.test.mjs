// Piano voicings of a chord: definitions from two sources each, extra notes
// from the chord's Russell parent scale, placed inside C3–B4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOICINGS, voiceAs, voicingsFor, fourTones } from '../public/js/theory/voicings.js';
import { parseChord, lydianAnalysis, QUALITIES, chordNotes } from '../public/js/theory/chords.js';
import { pc } from '../public/js/theory/notes.js';
import { SOURCES } from '../public/js/data/sources.js';

const c = (t) => parseChord(t);
const pcs = (ms) => new Set(ms.map((m) => m % 12));
const inRange = (ms) => ms.every((m) => m >= 48 && m <= 71);
const ascending = (ms) => ms.every((m, i) => i === 0 || m > ms[i - 1]);
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

test('every verified voicing cites two known sources', () => {
  const ids = new Set(SOURCES.map((s) => s.id));
  for (const v of VOICINGS.filter((x) => x.status === 'verified')) {
    assert.ok(v.sources.length >= 2, v.id);
    for (const s of v.sources) assert.ok(ids.has(s), `${v.id}: ${s}`);
  }
});

test('the list, in order, with every voicing sourced', () => {
  assert.deepEqual(VOICINGS.map((v) => v.id), ['close', 'drop2', 'drop3', 'drop24', 'spread', 'quartal', 'cluster', 'rootlessA', 'rootlessB']);
  assert.deepEqual(VOICINGS.filter((v) => v.status !== 'verified').map((v) => v.id), []);
  assert.deepEqual(voicingsFor(c('Cmaj7')).map((v) => v.id), ['close', 'drop2', 'drop3', 'drop24', 'spread', 'quartal', 'cluster', 'rootlessA', 'rootlessB']);
});

const names = (ms) => ms.map((m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12]);

test("spread: Hutchinson's five notes, root–7th–3rd then two parent-scale tones in fourths", () => {
  assert.deepEqual(names(voiceAs('spread', c('Cmaj7'))), ['C', 'B', 'E', 'A', 'D']);
  assert.deepEqual(names(voiceAs('spread', c('Dm7'))), ['D', 'C', 'F', 'B', 'E']);
  assert.deepEqual(names(voiceAs('spread', c('G7'))), ['G', 'F', 'B', 'E', 'A']);
  assert.deepEqual(names(voiceAs('spread', c('Dm7/G'))), ['D', 'C', 'F', 'B', 'E'], 'the chord root is lowest; the bass sounds separately');
});

test('spread on a 6th chord: the 6th stands in for the 7th, and no 7th is added', () => {
  for (const t of ['C6', 'Cm6']) {
    const m = voiceAs('spread', c(t));
    assert.ok(m, t);
    assert.ok([m[1], m[2]].some((x) => x % 12 === 9), `${t}: the 6th is in the base (root, 6th, 3rd either way up): ${names(m)}`);
    assert.ok(m.every((x) => ![10, 11].includes(x % 12)), `${t}: ${names(m)}`);
  }
});

test('spread on every verified chord type and root: null or five rising notes, the root lowest in C3–B3', () => {
  for (const q of Object.values(QUALITIES).filter((x) => x.status === 'verified')) {
    for (const root of ROOTS) {
      const chord = c(root + q.aliases[0]);
      const m = voiceAs('spread', chord);
      if (['maj7', 'm7', '7', 'm7b5', '6', 'm6'].includes(q.id)) assert.ok(m, `${chord.symbol} has a spread`);
      if (!m) continue;
      assert.ok(m.length === 5 && ascending(m) && pcs(m).size === 5, `${chord.symbol}: ${m}`);
      assert.equal(m[0] % 12, pc(chord.root), `${chord.symbol}: root lowest`);
      assert.ok(m[0] >= 48 && m[0] <= 59 && m.at(-1) <= 96, `${chord.symbol}: root in C3–B3, above the octave-2 bass, top inside the piano recordings: ${m}`);
    }
  }
  for (const t of ['C', 'Cm', 'Caug', 'Cdim']) assert.equal(voiceAs('spread', c(t)), null, t);
});

test('the spread row says where the sources differ', () => {
  assert.ok(VOICINGS.find((v) => v.id === 'spread').description.includes('Textbooks differ on the size; a three-note form (root, 3rd, 7th) also exists.'));
});

// Textbooks and university pages first (CLAUDE.md, 2026-11-24). Drop 2 and
// drop 3 wait for one: Open Music Theory, which defines them, refuses
// automated reading, so their rows still rest on Wikipedia and lesson sites.
test('every verified voicing cites a textbook or university source, except drop 2 and drop 3 for now', () => {
  const kind = new Map(SOURCES.map((s) => [s.id, s.kind]));
  for (const v of VOICINGS.filter((x) => x.status === 'verified' && !['drop2', 'drop3'].includes(x.id))) {
    assert.ok(v.sources.some((s) => kind.get(s) === 'textbook'), `${v.id}: ${v.sources}`);
  }
});

test('drop 2 & 4 lowers the 2nd and 4th voices from the top of a close voicing', () => {
  for (const t of ['Cmaj7', 'Dm7', 'G7', 'Bbm7b5', 'F#dim7']) {
    const m = voiceAs('drop24', c(t));
    assert.deepEqual(pcs(m), pcs(voiceAs('close', c(t))), t);
    const raised = [m[0] + 12, m[1] + 12, ...m.slice(2)].sort((a, b) => a - b);
    assert.ok(raised.at(-1) - raised[0] <= 11, `${t}: raising the two lowest gives close position: ${raised}`);
    assert.deepEqual([raised.indexOf(m[0] + 12), raised.indexOf(m[1] + 12)].map((i) => 4 - i), [4, 2], `${t}: ${m}`);
  }
});

test('close Cmaj7: its four tones inside an octave, the top note nearest G4', () => {
  const m = voiceAs('close', c('Cmaj7'));
  assert.deepEqual(pcs(m), new Set([0, 4, 7, 11]));
  assert.ok(m.at(-1) - m[0] <= 11);
  assert.deepEqual(m, [59, 60, 64, 67]);
});

// Raising a drop voicing's lowest note an octave gives back a close voicing,
// with that note at the dropped position (2nd or 3rd from the top).
function undoDrop(m, fromTop) {
  const raised = [...m.slice(1), m[0] + 12].sort((a, b) => a - b);
  return { close: raised.at(-1) - raised[0] <= 11, at: raised.length - raised.indexOf(m[0] + 12) };
}

test('drop 2 and drop 3 lower the 2nd or 3rd voice from the top of a close voicing', () => {
  for (const t of ['Cmaj7', 'Dm7', 'G7', 'Bbm7b5', 'F#dim7']) {
    const d2 = voiceAs('drop2', c(t));
    assert.deepEqual(pcs(d2), pcs(voiceAs('close', c(t))), t);
    assert.deepEqual(undoDrop(d2), { close: true, at: 2 }, `${t} drop 2: ${d2}`);
    const d3 = voiceAs('drop3', c(t));
    assert.deepEqual(undoDrop(d3), { close: true, at: 3 }, `${t} drop 3: ${d3}`);
  }
});

test('every verified four-note voicing, on 12 roots and 6 chord types, is null or four notes rising inside C3–B4 (G2–G5 when too wide)', () => {
  for (const root of ROOTS) {
    for (const q of ['maj7', 'm7', '7', 'm7b5', '6', 'maj']) {
      const chord = c(root + QUALITIES[q].aliases[0]);
      for (const v of voicingsFor(chord)) {
        if (v.midis === null || v.id === 'spread') continue; // five notes, its own test above
        assert.ok(ascending(v.midis) && v.midis[0] >= 43 && v.midis.at(-1) <= 79, `${chord.symbol} ${v.id}: ${v.midis}`);
        if (v.midis.at(-1) - v.midis[0] <= 23 - 12) assert.ok(inRange(v.midis), `${chord.symbol} ${v.id} fits the keyboard: ${v.midis}`);
      }
    }
  }
});

test('rootless A of Dm7 is 3–5–7–9 (F A C E), with no D', () => {
  const m = voiceAs('rootlessA', c('Dm7'));
  assert.deepEqual(m.map((x) => x % 12), [5, 9, 0, 4]);
});

test('rootless B of G7 is 7–9–3–13 (F A B E): the 13th replaces the 5th on a dominant', () => {
  const m = voiceAs('rootlessB', c('G7'));
  assert.deepEqual(m.map((x) => x % 12), [5, 9, 11, 4]);
});

test('rootless voicings are offered only on major 7, minor 7 and dominant chords', () => {
  for (const t of ['Caug', 'Cdim7', 'C7alt', 'Cm7b5', 'C', 'Cm(maj7)']) {
    assert.equal(voiceAs('rootlessA', c(t)), null, t);
    assert.equal(voiceAs('rootlessB', c(t)), null, t);
  }
});

test('cluster of Cmaj7: the 9th, the 3rd and the next two steps of C Lydian (D E F♯ G), within a fifth', () => {
  const m = voiceAs('cluster', c('Cmaj7'));
  assert.deepEqual(m.map((x) => x % 12), [2, 4, 6, 7]);
  assert.ok(m.at(-1) - m[0] <= 7);
});

test('a cluster holds the 3rd but never both the 3rd and 7th', () => {
  for (const root of ROOTS) {
    for (const q of ['maj7', 'm7', '7']) {
      const chord = c(root + QUALITIES[q].aliases[0]);
      const m = voiceAs('cluster', chord);
      const third = (pc(chord.root) + (q === 'm7' ? 3 : 4)) % 12;
      const seventh = (pc(chord.root) + (q === 'maj7' ? 11 : 10)) % 12;
      assert.ok(pcs(m).has(third) && !pcs(m).has(seventh), `${chord.symbol}: ${m}`);
    }
  }
});

test('quartal Dm7: four notes stacked in fourths, all from F Lydian', () => {
  const m = voiceAs('quartal', c('Dm7'));
  const parent = new Set(lydianAnalysis(c('Dm7')).parentNotes.map(pc));
  assert.ok(m.slice(1).every((x, i) => [5, 6].includes(x - m[i])), String(m));
  assert.ok(m.every((x) => parent.has(x % 12)));
});

test('four tones: a triad doubles its root; a 13th chord keeps its 3rd and 7th', () => {
  assert.deepEqual([...fourTones(c('C'))].sort((a, b) => a - b), [0, 0, 4, 7]);
  const t13 = fourTones(c('C13'));
  assert.equal(t13.length, 4);
  assert.ok(t13.includes(4) && t13.includes(10));
});

test('close voicings stay within an octave, even for a triad with its root doubled', () => {
  for (const root of ROOTS) {
    for (const q of ['maj', 'm', 'dim', 'aug', 'maj7', '7']) {
      const chord = c(root + QUALITIES[q].aliases[0]);
      const m = voiceAs('close', chord);
      assert.ok(m && m.at(-1) - m[0] <= 12, `${chord.symbol}: ${m}`);
    }
  }
  assert.deepEqual(voiceAs('close', c('C')).map((x) => x % 12), [0, 4, 7, 0]);
});

test('close, drop 2 and drop 3 exist for every chord type on every root', () => {
  for (const q of Object.values(QUALITIES).filter((x) => x.status === 'verified')) {
    for (const root of ROOTS) {
      const chord = c(root + q.aliases[0]);
      for (const id of ['close', 'drop2', 'drop3']) {
        const m = voiceAs(id, chord);
        assert.ok(m && ascending(m), `${chord.symbol} ${id}: ${m}`);
      }
    }
  }
});

test('quartal stacks have four different notes, and exist for maj7, m7 and 7 on every root', () => {
  for (const q of Object.values(QUALITIES).filter((x) => x.status === 'verified')) {
    for (const root of ROOTS) {
      const m = voiceAs('quartal', c(root + q.aliases[0]));
      if (m) assert.equal(pcs(m).size, 4, `${root}${q.aliases[0]}: ${m}`);
      else assert.ok(!['maj7', 'm7', '7'].includes(q.id), `${root}${q.aliases[0]} has no quartal`);
    }
  }
});

// Review (2026-11-24): the spread must keep what makes the chord itself, its
// extensions and an altered 5th, before it looks for fourths and fifths.
test('spread keeps the chord’s own extensions and altered 5th', () => {
  const has = (t, p) => assert.ok(voiceAs('spread', c(t)).some((m) => m % 12 === p), `${t}: ${names(voiceAs('spread', c(t)))}`);
  has('Cm7b5', 6); has('Cdim7', 6); has('Cmaj7#5', 8); has('Cmaj7#11', 6); has('C7#11', 6); has('Cm11', 5);
  assert.notDeepEqual(voiceAs('spread', c('Cmaj7#11')), voiceAs('spread', c('Cmaj7')));
  for (const q of Object.values(QUALITIES).filter((x) => x.status === 'verified')) {
    const i5 = q.degrees.findIndex((d) => ['b5', '#5'].includes(d));
    const ext = q.degrees.filter((d) => ['2', 'b2', '#2', '4', '#4', '6', 'b6'].includes(d) && !(d === '6' && !q.degrees.some((x) => ['7', 'b7', 'bb7'].includes(x))));
    for (const root of ROOTS) {
      const chord = c(root + q.aliases[0]);
      const m = voiceAs('spread', chord);
      if (!m) continue;
      const tones = chordNotes(chord).map(pc);
      const defining = new Set([...(i5 >= 0 ? [tones[i5]] : []), ...ext.map((d) => tones[q.degrees.indexOf(d)])]);
      const kept = [...defining].filter((p) => m.some((x) => x % 12 === p)).length;
      assert.ok(kept >= Math.min(2, defining.size), `${chord.symbol}: keeps ${kept} of ${defining.size}: ${names(m)}`);
    }
  }
});
