// Leading a voicing into a next chord, two ways (sources: docs/theory-sources.md,
// "Voice leading"):
//   Smooth: each voice moves to a tone of the next chord by the smallest total
//     motion; common tones stay; voices don't cross.
//   Same shape (planing): the shape moves in parallel when the chord type is
//     the same; otherwise the next chord takes the same voicing type, nearest.
// Each voice is then read by tonal gravity from each chord's own centre (the
// app's convention, David's lens). The words describe; they never prescribe.
import { pc } from './notes.js';
import { fourTones, voiceAs } from './voicings.js';
import { rankFrom } from './reading.js';

const w = (id, name, description, sources) => Object.freeze({ id, name, description, sources: Object.freeze(sources), status: 'verified' });

export const WAYS = Object.freeze([
  w('smooth', 'Smooth', 'Shared notes stay put; the other voices move as little as possible in total.', ['rwu-part-writing', 'harmony-musicianship-common-tone']),
  w('planing', 'Same shape', 'The whole shape slides in parallel to the next chord (planing).', ['hutchinson-planing', 'learnmusictheory-planing']),
]);

const mod12 = (x) => ((x % 12) + 12) % 12;
const total = (a, b) => a.reduce((s, m, i) => s + Math.abs(b[i] - m), 0);
const largest = (a, b) => Math.max(...a.map((m, i) => Math.abs(b[i] - m)));
const sum = (a) => a.reduce((s, m) => s + m, 0);
const heldCount = (a, b) => a.filter((m, i) => b[i] === m).length;

// Better = less total motion, then more shared notes held, then the smaller
// largest move, then the lower result (the last three are the app's tie-breaks).
function better(from, a, b) {
  return total(from, a) - total(from, b)
    || heldCount(from, b) - heldCount(from, a)
    || largest(from, a) - largest(from, b)
    || sum(a) - sum(b);
}

function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p]));
}

// Every note of pitch class p within an octave of `from`.
const near = (from, p) => [-12, 0, 12].map((o) => from + o + mod12(p - from)).concat(from - mod12(from - p) - 12).filter((m) => Math.abs(m - from) <= 12);

/** The next chord's four tones, each voice moving as little as possible, rising and never crossing. */
export function smoothInto(fromMidis, next) {
  let best = null;
  for (const targets of permutations(fourTones(next))) {
    const walk = (i, acc) => {
      if (i === fromMidis.length) {
        if (!best || better(fromMidis, acc, best) < 0) best = acc;
        return;
      }
      for (const m of new Set(near(fromMidis[i], targets[i]))) {
        if (i > 0 && m <= acc[i - 1]) continue; // rising: no crossing, no unisons
        walk(i + 1, [...acc, m]);
      }
    };
    walk(0, []);
  }
  return best;
}

/**
 * The same shape on the next chord: every voice moved by the root interval
 * when the chord type is the same ({ parallel: true }); otherwise the next
 * chord's own voicing of this type, at the octave nearest the current one.
 * Null when the voicing doesn't apply to the next chord.
 */
export function planeInto(voicingId, fromMidis, current, next) {
  if (current.quality === next.quality) {
    let shift = mod12(pc(next.root) - pc(current.root));
    if (shift > 6) shift -= 12;
    return { midis: fromMidis.map((m) => m + shift), parallel: true };
  }
  const shape = voiceAs(voicingId, next);
  if (!shape) return null;
  let best = null;
  for (let k = -2; k <= 2; k++) {
    const m = shape.map((x) => x + 12 * k);
    if (!best || total(fromMidis, m) < total(fromMidis, best)) best = m;
  }
  return { midis: best, parallel: false };
}

/** Each voice's move, and its gravity rank before (from centreFrom) and after (from centreTo). */
export function compareVoices(fromMidis, toMidis, centreFrom, centreTo) {
  return fromMidis.map((from, i) => {
    const to = toMidis[i];
    const rankFrom = rankFrom_(centreFrom, from);
    const rankTo = rankFrom_(centreTo, to);
    const kind = from === to ? 'held' : rankTo < rankFrom ? 'toward' : rankTo > rankFrom ? 'away' : 'same';
    return { from, to, step: to - from, rankFrom, rankTo, kind };
  });
}
const rankFrom_ = (centre, midi) => rankFrom(centre, mod12(midi));

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** The moves as text: each step with its ranks, and a one-line summary. */
export function describeMoves(moves, spell) {
  const steps = moves.map((m) => {
    const motion = m.step === 0 ? 'held' : `${m.step > 0 ? '↑' : '↓'}${Math.abs(m.step)}`;
    return `${spell(m.from, 'from')}→${spell(m.to, 'to')} ${motion} (rank ${m.rankFrom} → ${m.rankTo})`;
  }).join(' · ');
  const count = (kind) => moves.filter((m) => m.kind === kind).length;
  const parts = [];
  const add = (k, one, many) => { const c = count(k); if (c) parts.push(`${WORDS[c]} ${c === 1 ? one : many}`); };
  add('toward', 'moves toward home', 'move toward home');
  add('away', 'moves outward', 'move outward');
  add('same', 'keeps its distance from home', 'keep their distance from home');
  add('held', 'is held', 'are held');
  return { steps, summary: `Of the ${WORDS[moves.length]} voices, ${parts.join(', ')}.` };
}
