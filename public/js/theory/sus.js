// Sus chords have no single parent scale (David, 2026-11-24): the same notes
// read as several chords, and they lie in several Lydian scales at once. This
// lists every plain Lydian tonic that holds a set of pitch classes, most
// ingoing first: ordered by how far up Russell's ladder of fifths the chord
// tones sit from each tonic. The tonics always run down in fifths, so their
// order is tonal gravity itself. The app's convention, built on Russell's rule
// that the Lydian tonic is the lowest note of a ladder of fifths; see
// docs/theory-sources.md.
import { parseNote, pc } from './notes.js';
import { scaleNotes } from './scales.js';

// Each pitch class's spellings, the flat one first (it wins a tie).
const SPELLINGS = [['C', 'B#'], ['Db', 'C#'], ['D'], ['Eb', 'D#'], ['E', 'Fb'], ['F', 'E#'], ['Gb', 'F#'], ['G'], ['Ab', 'G#'], ['A'], ['Bb', 'A#'], ['B', 'Cb']];
const accidentals = (notes) => notes.reduce((n, note) => n + Math.abs(note.acc), 0);
const mod12 = (x) => ((x % 12) + 12) % 12;

/** How many steps up the ladder of fifths from tonic pitch class t to p (0–6), or null if p isn't in t's Lydian. */
function rung(t, p) {
  for (let k = 0; k < 7; k++) if (mod12(t + 7 * k) === p) return k;
  return null;
}

/** The tonic spelled so its Lydian scale has the fewest accidentals. */
function spell(t) {
  let best = null;
  for (const name of SPELLINGS[t]) {
    const note = parseNote(name);
    let notes;
    try { notes = scaleNotes(note, 'lydian'); } catch { continue; }
    if (!best || accidentals(notes) < best.score) best = { note, score: accidentals(notes) };
  }
  return best.note;
}

/** Every plain-Lydian tonic holding all these pitch classes, most ingoing first. */
export function lydianTonicsFor(pcs) {
  const set = [...new Set(pcs.map(mod12))];
  const fits = [];
  for (let t = 0; t < 12; t++) {
    const rungs = set.map((p) => rung(t, p));
    if (rungs.every((r) => r !== null)) fits.push({ t, depth: rungs.reduce((a, b) => a + b, 0) });
  }
  return fits.sort((a, b) => a.depth - b.depth).map(({ t }) => spell(t));
}

