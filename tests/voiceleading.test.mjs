// Leading a voicing into a next chord: smooth (smallest motion) and same
// shape (planing), with each voice read by gravity from each chord's centre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAYS, smoothInto, planeInto, compareVoices, describeMoves } from '../public/js/theory/voiceleading.js';
import { voiceAs, fourTones } from '../public/js/theory/voicings.js';
import { parseChord, QUALITIES } from '../public/js/theory/chords.js';
import { parseNote, noteName } from '../public/js/theory/notes.js';
import { SOURCES } from '../public/js/data/sources.js';

const c = (t) => parseChord(t);
const n = (t) => parseNote(t);
const pcs = (ms) => new Set(ms.map((m) => ((m % 12) + 12) % 12));
const ascending = (ms) => ms.every((m, i) => i === 0 || m > ms[i - 1]);
const motion = (a, b) => a.reduce((s, m, i) => s + Math.abs(b[i] - m), 0);
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

test('both ways in are verified with two known sources', () => {
  const ids = new Set(SOURCES.map((s) => s.id));
  assert.deepEqual(WAYS.map((w) => [w.id, w.name]), [['smooth', 'Smooth'], ['planing', 'Same shape']]);
  for (const w of WAYS) {
    assert.equal(w.status, 'verified');
    assert.ok(w.sources.length >= 2 && w.sources.every((s) => ids.has(s)), w.id);
  }
});

test('smooth: D–F–A–C into E♭m7 moves every voice by a half step at most', () => {
  const from = [62, 65, 69, 72];
  const to = smoothInto(from, c('Ebm7'));
  assert.ok(to.every((m, i) => Math.abs(m - from[i]) <= 1), String(to));
  assert.deepEqual(pcs(to), pcs(fourTones(c('Ebm7'))));
});

test('smooth into the same chord holds every voice', () => {
  const from = voiceAs('close', c('Dm7'));
  assert.deepEqual(smoothInto(from, c('Dm7')), from);
});

// Every ascending assignment of the targets, each voice within an octave of where it was.
function allAscending(from, targets) {
  const out = [];
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  for (const p of perms(targets)) {
    const options = from.map((f, i) => [-12, 0, 12].map((o) => f + o + ((((p[i] - f) % 12) + 12) % 12)).concat([-12, 0].map((o) => f + o - ((((f - p[i]) % 12) + 12) % 12))));
    const walk = (i, acc) => {
      if (i === from.length) { if (ascending(acc)) out.push(acc); return; }
      for (const m of new Set(options[i])) if (Math.abs(m - from[i]) <= 12) walk(i + 1, [...acc, m]);
    };
    walk(0, []);
  }
  return out;
}

test('smooth always finds four rising notes with the least total motion', () => {
  for (const root of ROOTS) {
    for (const q of ['maj7', 'm7', '7']) {
      const from = voiceAs('drop2', c(root + QUALITIES[q].aliases[0]));
      const to = smoothInto(from, c('G7'));
      assert.ok(to.length === 4 && ascending(to), `${root}${q}: ${to}`);
      const best = Math.min(...allAscending(from, fourTones(c('G7'))).map((x) => motion(from, x)));
      assert.equal(motion(from, to), best, `${root}${q}`);
    }
  }
});

test('same shape: D-7 to E♭-7 moves the whole drop 2 up a half step', () => {
  const from = voiceAs('drop2', c('Dm7'));
  const r = planeInto('drop2', from, c('Dm7'), c('Ebm7'));
  assert.equal(r.parallel, true);
  assert.deepEqual(r.midis, from.map((m) => m + 1));
});

test('same shape into another chord type keeps the voicing type', () => {
  const from = voiceAs('drop2', c('Dm7'));
  const r = planeInto('drop2', from, c('Dm7'), c('G7'));
  assert.equal(r.parallel, false);
  assert.deepEqual(pcs(r.midis), pcs(voiceAs('drop2', c('G7'))));
});

test('same shape is not offered where the voicing does not fit the next chord', () => {
  assert.equal(planeInto('rootlessA', voiceAs('rootlessA', c('Dm7')), c('Dm7'), c('Caug')), null);
});

test('each voice is ranked from its own chord’s centre', () => {
  const moves = compareVoices([50, 57, 60, 65], [51, 58, 61, 66], n('G'), n('Ab'));
  assert.ok(moves.every((m) => ['toward', 'away', 'same'].includes(m.kind)));
  assert.equal(compareVoices([50, 57, 60, 65], [51, 58, 61, 66], n('G'), n('G'))[0].rankFrom, 2);
});

test('a held note stays, and still shows its rank change', () => {
  assert.deepEqual(compareVoices([60], [60], n('G'), n('Ab'))[0], { from: 60, to: 60, step: 0, rankFrom: 11, rankTo: 5, kind: 'held' });
});

test('the move words describe and never prescribe', () => {
  const spell = (m) => ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12];
  for (const root of ROOTS) {
    for (const centre of ROOTS) {
      const from = voiceAs('close', c(`${root}m7`));
      const to = smoothInto(from, c('G7'));
      const d = describeMoves(compareVoices(from, to, n(centre), n('G')), spell);
      assert.doesNotMatch(`${d.steps} ${d.summary}`, /must|should|resolve/i);
      assert.match(d.steps, /→/);
    }
  }
  const held = describeMoves(compareVoices([60], [60], n('G'), n('Ab')), spell);
  assert.match(held.steps, /C→C held \(rank 11 → 5\)/);
});

test('smooth keeps a shared note when holding it costs no more (C6 into Gmaj7 keeps G)', () => {
  assert.deepEqual(smoothInto([57, 60, 64, 67], c('Gmaj7')), [59, 62, 66, 67]);
});

test('smooth aims at the same voicing type: rootless A of Dm7 into G7 gives the textbook F A B E', () => {
  const from = voiceAs('rootlessA', c('Dm7')); // F A C E
  const to = smoothInto(from, c('G7'), 'rootlessA');
  assert.deepEqual(to.map((m) => m % 12), [5, 9, 11, 4]);
  assert.equal(motion(from, to), 1, 'only C moves, down to B');
});

test('smooth into the same chord holds every voice, for every voicing type', () => {
  for (const id of ['close', 'drop2', 'drop3', 'quartal', 'cluster', 'rootlessA', 'rootlessB']) {
    const from = voiceAs(id, c('Dm7'));
    assert.deepEqual(smoothInto(from, c('Dm7'), id), from, id);
  }
});

test('smooth falls back to the plain chord tones where the voicing type does not fit the next chord', () => {
  const to = smoothInto(voiceAs('rootlessA', c('Dm7')), c('Caug'), 'rootlessA');
  assert.deepEqual(pcs(to), pcs(fourTones(c('Caug'))));
});
