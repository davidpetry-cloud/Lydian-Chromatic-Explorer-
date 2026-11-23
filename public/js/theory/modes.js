// Reads a scale from the chord's root instead of from the Lydian tonic, and
// names it when it is one of the seven modes of the major scale (E♭ Lydian
// from C is C Dorian). The mode shapes are computed by rotating the Lydian
// scale, not hand-written. Sources: docs/theory-sources.md.
import { pc, parseNote } from './notes.js';
import { scaleNotes } from './scales.js';

/** Mode names in the order of the Lydian degree each starts on (1 2 3 ♯4 5 6 7). */
export const MAJOR_MODE_NAMES = Object.freeze(['Lydian', 'Mixolydian', 'Aeolian', 'Locrian', 'Ionian', 'Dorian', 'Phrygian']);

const shapeFrom = (pcs, start) => pcs.map((p) => (p - start + 12) % 12).sort((a, b) => a - b).join(',');
const LYDIAN_PCS = scaleNotes(parseNote('C'), 'lydian').map(pc);
const MODE_SHAPES = new Map(LYDIAN_PCS.map((start, i) => [shapeFrom(LYDIAN_PCS, start), MAJOR_MODE_NAMES[i]]));

/** The scale's notes starting from root, and its mode name if it has a standard one; null if root isn't in the scale. */
export function modeFrom(notes, root) {
  const at = notes.findIndex((n) => pc(n) === pc(root));
  if (at < 0) return null;
  const rotated = [...notes.slice(at), ...notes.slice(0, at)];
  return { notes: rotated, name: MODE_SHAPES.get(shapeFrom(rotated.map(pc), pc(root))) ?? null };
}
