// Words for a sus chord's "no single parent" panel: the other names the same
// notes go by, and what its Lydian tonics make together. See
// docs/superpowers/specs/2026-11-24-sus-chords-design.md.
import { noteName, pc, DEGREE_SEMITONES } from './notes.js';
import { QUALITIES, chordNotes } from './chords.js';

// The shapes a sus chord's notes can also be read as, in this order. They are
// compared by pitch class (semitones), never by spelling: a root such as E𝄪
// can't be spelled up a 4th without triple sharps, and must not throw.
const SHAPES = [
  { id: 'sus2', degrees: ['1', '2', '5'], suffix: 'sus2' },
  { id: 'sus4', degrees: ['1', '4', '5'], suffix: 'sus4' },
  { id: '7sus2', degrees: ['1', '2', 'b7'], suffix: '7sus2 (no 5th)' },
  { id: '7sus4', degrees: ['1', '4', 'b7'], suffix: '7sus4 (no 5th)' },
];
const key = (pcs) => [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b).join(',');

/** Other names for exactly these notes, each root spelled as the chord spells it. */
export function susReadings(chord) {
  const notes = chordNotes(chord);
  const target = key(notes.map(pc));
  const own = QUALITIES[chord.quality].degrees.join();
  const out = [];
  for (const shape of SHAPES) {
    for (const root of notes) {
      if (pc(root) === pc(chord.root) && shape.degrees.join() === own) continue;
      if (key(shape.degrees.map((d) => pc(root) + DEGREE_SEMITONES[d])) === target) out.push(`${noteName(root)}${shape.suffix}`);
    }
  }
  return [...new Set(out)];
}

/** One line on the tonics: they run down in fifths; five of them make a major pentatonic (on the last). */
export function ladderLine(tonics) {
  const line = 'These tonics run down in fifths, the way the order of tonal gravity stacks';
  return tonics.length === 5 ? `${line}: together they are the ${noteName(tonics.at(-1))} major pentatonic.` : `${line}.`;
}
