// Notes, spelling and pitch. Pure functions: no DOM, no audio.
// A Note is { letter: 'A'..'G', acc: -2..2 } (acc = sharps minus flats).

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC_IN = { '': 0, '#': 1, '♯': 1, x: 2, '##': 2, '𝄪': 2, '♯♯': 2, b: -1, '♭': -1, bb: -2, '♭♭': -2, '𝄫': -2 };
const ACC_OUT = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

export const DEGREE_SEMITONES = Object.freeze({
  1: 0, b2: 1, 2: 2, '#2': 3, b3: 3, 3: 4, 4: 5, '#4': 6, b5: 6,
  5: 7, '#5': 8, b6: 8, 6: 9, bb7: 9, b7: 10, 7: 11,
});

const mod12 = (x) => ((x % 12) + 12) % 12;

/** Reads "C", "f#", "Bb", "D𝄫", "Cx"; returns null when it isn't a note. */
export function parseNote(text) {
  const m = /^([A-Ga-g])(.*)$/u.exec(String(text ?? '').trim());
  if (!m || !(m[2] in ACC_IN)) return null;
  return { letter: m[1].toUpperCase(), acc: ACC_IN[m[2]] };
}

export const pc = (note) => mod12(LETTER_PC[note.letter] + note.acc);

export const noteName = (note) => note.letter + ACC_OUT[note.acc];

/** Moves from root to the given scale degree, keeping the letter spelling. */
export function transpose(root, degree) {
  if (!(degree in DEGREE_SEMITONES)) throw new RangeError(`Unknown degree ${degree}`);
  const steps = Number(degree.replace(/[#b]/g, '')) - 1;
  const letter = LETTERS[(LETTERS.indexOf(root.letter) + steps) % 7];
  let acc = mod12(pc(root) + DEGREE_SEMITONES[degree] - LETTER_PC[letter]);
  if (acc > 5) acc -= 12;
  if (acc < -2 || acc > 2) throw new RangeError(`${noteName(root)} + ${degree} needs more than two accidentals`);
  return { letter, acc };
}

/** MIDI numbers climbing from startOctave (C4 = 60), closing on the octave. */
export function ascendingMidis(notes, startOctave = 4) {
  if (!notes.length) return [];
  const out = [12 * (startOctave + 1) + pc(notes[0])];
  for (const note of notes.slice(1)) {
    const prev = out[out.length - 1];
    out.push(prev + (mod12(pc(note) - prev) || 12));
  }
  out.push(out[0] + 12);
  return out;
}

export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);
