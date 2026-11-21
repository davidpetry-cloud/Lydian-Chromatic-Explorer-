// The seven principal (vertical) scales of the Lydian Chromatic Concept,
// ordered from most ingoing to most outgoing, as scale degrees from the
// Lydian tonic. Notes are always computed from these degrees.
// Sources: docs/theory-sources.md.
import { transpose, pc } from './notes.js';

const scale = (id, name, degrees, derivation) => Object.freeze({ id, name, degrees: Object.freeze(degrees), derivation });

export const PRINCIPAL_SCALES = Object.freeze([
  scale('lydian', 'Lydian', ['1', '2', '3', '#4', '5', '6', '7'], 'lydian'),
  scale('lydian-augmented', 'Lydian Augmented', ['1', '2', '3', '#4', '#5', '6', '7'], 'lydian'),
  scale('lydian-diminished', 'Lydian Diminished', ['1', '2', 'b3', '#4', '5', '6', '7'], 'lydian'),
  scale('lydian-flat-seventh', 'Lydian Flat Seventh', ['1', '2', '3', '#4', '5', '6', 'b7'], 'lydian'),
  scale('auxiliary-augmented', 'Auxiliary Augmented', ['1', '2', '3', '#4', '#5', 'b7'], 'auxiliary'),
  scale('auxiliary-diminished', 'Auxiliary Diminished', ['1', '2', 'b3', '4', '#4', '#5', '6', '7'], 'auxiliary'),
  scale('auxiliary-diminished-blues', 'Auxiliary Diminished Blues', ['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7'], 'auxiliary'),
]);

export function scaleById(id) {
  const found = PRINCIPAL_SCALES.find((s) => s.id === id);
  if (!found) throw new RangeError(`Unknown scale ${id}`);
  return found;
}

export const scaleNotes = (tonic, id) => scaleById(id).degrees.map((d) => transpose(tonic, d));

export const scalePcs = (tonic, id) => new Set(scaleNotes(tonic, id).map(pc));
