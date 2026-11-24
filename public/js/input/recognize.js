// Names the chord a player is holding on a MIDI keyboard. Pure function:
// MIDI note numbers in, chord (or a friendly message) out. The lowest note
// is tried as the root first, so C–E–G–A over C is C6 and over A is Am7;
// if the bass doesn't make a known chord (an inversion), the other notes
// are tried in order up from the bass. Only verified chord types count.
import { parseNote, pc, noteName, asciiName, DEGREE_SEMITONES } from '../theory/notes.js';
import { QUALITIES, SUPPORTED_QUALITIES, parseChord, chordNotes } from '../theory/chords.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(parseNote);
const rootFor = (pitchClass) => ROOTS.find((n) => pc(n) === pitchClass);
const key = (set) => [...set].sort((a, b) => a - b).join(',');

const semis = (id) => new Set(QUALITIES[id].degrees.map((d) => DEGREE_SEMITONES[d] % 12));
const SHAPES = SUPPORTED_QUALITIES.map((id) => ({ id, shape: key(semis(id)) }));

// Players often leave out the perfect 5th of seventh-family chords
// (sources: docs/theory-sources.md). These are tried only after every exact
// match fails, so a full voicing always wins.
const FIFTH_OPTIONAL = ['maj7', '6', '69', 'm7', '7', '9', '13', '7b9', '7s9', '7sus4', '7sus2'];
const NO_FIFTH_SHAPES = SHAPES
  .filter((s) => FIFTH_OPTIONAL.includes(s.id))
  .map(({ id }) => { const set = semis(id); set.delete(7); return { id, shape: key(set) }; })
  .filter((s) => s.shape.split(',').length >= 3);

export function recognizeChord(midiNotes) {
  if (!midiNotes.length) return null;
  const bass = ((Math.min(...midiNotes) % 12) + 12) % 12;
  const up = (p) => (p - bass + 12) % 12;
  const pcs = [...new Set(midiNotes.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => up(a) - up(b));
  if (pcs.length < 3) return null;
  const heard = pcs.map((p) => noteName(rootFor(p))).join(' ');
  const find = (shapes) => {
    for (const root of pcs) {
      const shape = key(new Set(pcs.map((p) => (p - root + 12) % 12)));
      const match = shapes.find((s) => s.shape === shape);
      if (match) return { root, match };
    }
    return null;
  };
  const found = find(SHAPES) ?? find(NO_FIFTH_SHAPES);
  if (found) {
    const plain = parseChord(asciiName(rootFor(found.root)) + QUALITIES[found.match.id].aliases[0]);
    // A bass that isn't the root makes a slash chord (E–G–B–C → Cmaj7/E),
    // spelled as the chord spells it when it's a chord tone.
    const bassNote = bass === found.root ? null
      : chordNotes(plain).find((n) => pc(n) === bass) ?? rootFor(bass);
    const chord = bassNote ? parseChord(`${asciiName(plain.root)}${QUALITIES[found.match.id].aliases[0]}/${asciiName(bassNote)}`) : plain;
    // Spell what was played the way the chord spells it (E G♯ B, not E A♭ B),
    // listing only notes actually held (a left-out 5th isn't "heard").
    return { chord, heard: chordNotes(chord).filter((n) => pcs.includes(pc(n))).map(noteName).join(' ') };
  }
  return { error: `${heard} isn't a chord I know yet.`, heard };
}
