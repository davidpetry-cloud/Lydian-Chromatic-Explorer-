// Names the chord a player is holding on a MIDI keyboard. Pure function:
// MIDI note numbers in, chord (or a friendly message) out. The lowest note
// is tried as the root first, so C–E–G–A over C is C6 and over A is Am7;
// if the bass doesn't make a known chord (an inversion), the other notes
// are tried in order up from the bass. Only verified chord types count.
import { parseNote, pc, noteName, asciiName, DEGREE_SEMITONES } from '../theory/notes.js';
import { QUALITIES, SUPPORTED_QUALITIES, parseChord } from '../theory/chords.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(parseNote);
const rootFor = (pitchClass) => ROOTS.find((n) => pc(n) === pitchClass);
const key = (set) => [...set].sort((a, b) => a - b).join(',');

const SHAPES = SUPPORTED_QUALITIES.map((id) => ({
  id,
  shape: key(new Set(QUALITIES[id].degrees.map((d) => DEGREE_SEMITONES[d] % 12))),
}));

export function recognizeChord(midiNotes) {
  if (!midiNotes.length) return null;
  const bass = ((Math.min(...midiNotes) % 12) + 12) % 12;
  const up = (p) => (p - bass + 12) % 12;
  const pcs = [...new Set(midiNotes.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => up(a) - up(b));
  if (pcs.length < 3) return null;
  const heard = pcs.map((p) => noteName(rootFor(p))).join(' ');
  for (const root of pcs) {
    const shape = key(new Set(pcs.map((p) => (p - root + 12) % 12)));
    const match = SHAPES.find((s) => s.shape === shape);
    if (match) return { chord: parseChord(asciiName(rootFor(root)) + QUALITIES[match.id].aliases[0]), heard };
  }
  return { error: `${heard} isn't a chord I know yet.`, heard };
}
