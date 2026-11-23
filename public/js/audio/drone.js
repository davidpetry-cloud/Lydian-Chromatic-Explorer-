// Which note the drone plays. By default it's the bass note the player chose
// (the slash note, or the root); it can also be the Lydian tonic, the chord
// root, or any other note.
import { parseNote } from '../theory/notes.js';

export const DRONE_MODES = Object.freeze(['bass', 'tonic', 'root', 'other']);

export function resolveDrone({ mode, note } = {}, chord, tonic) {
  if (mode === 'tonic') return tonic;
  if (mode === 'root') return chord.root;
  if (mode === 'other') return parseNote(note) ?? chord.bass;
  return chord.bass;
}
