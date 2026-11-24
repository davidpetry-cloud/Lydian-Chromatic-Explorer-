// Piano voicings of one chord: the same chord, its notes arranged in
// different ways. Each definition has two sources (docs/theory-sources.md,
// "Voicings"); the wording here is original. Extra notes (9ths, 13ths, the
// steps of a cluster, the fourths of a quartal stack) come from the chord's
// Russell parent scale. Every voicing is placed inside C3–B4 (MIDI 48–71),
// with its top note as near G4 as it can be; the bass note sounds separately.
import { pc } from './notes.js';
import { QUALITIES, chordNotes, lydianAnalysis } from './chords.js';

const LOW = 48; // C3
const HIGH = 71; // B4
const AIM = 67; // G4

const v = (id, name, description, sources, status = 'verified') =>
  Object.freeze({ id, name, description, sources: Object.freeze(sources), status });

export const VOICINGS = Object.freeze([
  v('close', 'Close', 'Four chord tones packed as tightly as they go, inside one octave.', ['wikipedia-voicing', 'tjps-close']),
  v('drop2', 'Drop 2', 'Close position with the second note from the top moved down an octave: wider, warmer, still easy to hold.', ['wikipedia-voicing', 'pianogroove-drop2']),
  v('drop3', 'Drop 3', 'Close position with the third note from the top moved down an octave: wider still, with a gap in the middle.', ['wikipedia-voicing', 'bonedo-drop3']),
  v('drop24', 'Drop 2 & 4', 'Close position with the second and fourth notes from the top moved down an octave.', ['wikipedia-voicing'], 'pending'),
  v('spread', 'Spread', 'Chord tones spread wide across the keyboard.', ['pianogroove-spread'], 'pending'),
  v('quartal', 'Quartal', 'Four notes stacked in fourths from the parent scale: open, modern and a little ambiguous.', ['wikipedia-quartal', 'pianogroove-quartal']),
  v('cluster', 'Cluster', 'Four neighbouring scale steps from the 9th up through the 3rd, packed in seconds within a fifth.', ['pianogroove-cluster', 'pianowithjonny-cluster']),
  v('rootlessA', 'Rootless A', 'The 3rd at the bottom, then 5th (13th on a dominant), 7th and 9th: the root is left to the bass.', ['pianowithjonny-rootless', 'tjps-rootless']),
  v('rootlessB', 'Rootless B', 'The 7th at the bottom, then 9th, 3rd and 5th (13th on a dominant): rootless A turned over.', ['pianowithjonny-rootless', 'tjps-rootless']),
]);

const mod12 = (x) => ((x % 12) + 12) % 12;

// The chord's tones by role: which degree each note is.
function roles(chord) {
  const degrees = QUALITIES[chord.quality].degrees;
  const notes = chordNotes(chord).map(pc);
  const find = (...ds) => { const i = degrees.findIndex((d) => ds.includes(d)); return i < 0 ? null : notes[i]; };
  const third = find('3', 'b3');
  const seventh = find('7', 'b7', 'bb7');
  const sixth = find('6');
  const fifth = find('5', 'b5', '#5');
  const root = notes[0];
  // Extensions, highest first: 13ths (6, b6), then 11ths (4, #4), then 9ths (2, b2, #2).
  const rank = (d) => ({ 6: 13, b6: 13, 4: 11, '#4': 11, 2: 9, b2: 9, '#2': 9 })[d] ?? 0;
  const extensions = degrees
    .map((d, i) => ({ d, p: notes[i] }))
    .filter(({ d }) => rank(d) && !(d === '6' && !seventh)) // a 6th with no 7th stands in for the 7th
    .sort((a, b) => rank(b.d) - rank(a.d))
    .map(({ p }) => p);
  return { root, third, seventh: seventh ?? sixth, fifth, extensions, degrees };
}

/**
 * Four pitch classes for the drop voicings (the app's convention): a chord's
 * own four tones; a triad doubles its root; a larger chord keeps the 3rd,
 * the 7th (or 6th), the extensions from the top down, then the 5th, then
 * the root.
 */
export function fourTones(chord) {
  const r = roles(chord);
  const tones = [...new Set(chordNotes(chord).map(pc))];
  if (tones.length === 4) return tones;
  if (tones.length === 3) return [...tones, r.root];
  const out = [];
  for (const p of [r.third, r.seventh, ...r.extensions, r.fifth, r.root]) {
    if (p !== null && !out.includes(p)) out.push(p);
    if (out.length === 4) break;
  }
  return out;
}

// Stack pitch classes upward in the order given, each the next MIDI note above the last.
function stack(classes, start = LOW) {
  const out = [];
  for (const p of classes) {
    const prev = out.length ? out[out.length - 1] : start - 1;
    out.push(prev + 1 + mod12(p - (prev + 1)));
  }
  return out;
}

// Move a shape by octaves into C3–B4, top note nearest G4 (ties go lower); null if it can't fit.
function place(shape) {
  let best = null;
  for (let k = -4; k <= 4; k++) {
    const m = shape.map((x) => x + 12 * k);
    if (m[0] < LOW || m.at(-1) > HIGH) continue;
    if (!best || Math.abs(m.at(-1) - AIM) < Math.abs(best.at(-1) - AIM)) best = m;
  }
  return best;
}

// The best-placed of several shapes.
function bestOf(shapes) {
  // A doubled root dropped onto the other root would sound one note twice: skip it.
  const placed = shapes.filter((s) => new Set(s).size === s.length).map(place).filter(Boolean);
  if (!placed.length) return null;
  return placed.reduce((a, b) => (Math.abs(b.at(-1) - AIM) < Math.abs(a.at(-1) - AIM) ? b : a));
}

const rotations = (tones) => tones.map((_, i) => [...tones.slice(i), ...tones.slice(0, i)]);

// Drop the voices at these positions from the top (2 = second highest) an octave.
function drop(shape, fromTop) {
  const out = [...shape];
  for (const n of fromTop) out[out.length - n] -= 12;
  return out.sort((a, b) => a - b);
}

const ROOTLESS = new Set(['3|7', 'b3|b7', '3|b7']); // major 7, minor 7, dominant families

function rootless(chord, parentPcs, kind) {
  const r = roles(chord);
  const degrees = r.degrees;
  const thirdDeg = degrees.find((d) => d === '3' || d === 'b3');
  const seventhDeg = degrees.find((d) => d === '7' || d === 'b7');
  if (!thirdDeg || !seventhDeg || !ROOTLESS.has(`${thirdDeg}|${seventhDeg}`) || !degrees.includes('5')) return null;
  const dominant = thirdDeg === '3' && seventhDeg === 'b7';
  const root = pc(chord.root);
  const ninth = mod12(root + 2);
  const colour = dominant ? mod12(root + 9) : r.fifth; // the 13th replaces the 5th on a dominant
  if (!parentPcs.has(ninth) || !parentPcs.has(colour)) return null;
  const order = kind === 'A' ? [r.third, colour, r.seventh, ninth] : [r.seventh, ninth, r.third, colour];
  return place(stack(order));
}

function quartal(chord, parent) {
  const parentPcs = new Set(parent);
  const chordPcs = new Set(chordNotes(chord).map(pc));
  let best = null;
  for (const start of chordNotes(chord).map(pc)) {
    const classes = [start];
    for (let i = 0; i < 3; i++) {
      const prev = classes[classes.length - 1];
      const next = [5, 6].map((s) => mod12(prev + s)).find((p) => parentPcs.has(p));
      if (next === undefined) break;
      classes.push(next);
    }
    if (classes.length < 4) continue;
    const kept = classes.filter((p) => chordPcs.has(p)).length;
    if (!best || kept > best.kept) best = { classes, kept };
  }
  return best ? place(stack(best.classes)) : null;
}

function cluster(chord, parent) {
  const third = roles(chord).third;
  if (third === null) return null;
  const at = parent.indexOf(third);
  if (at < 0) return null;
  const n = parent.length;
  const classes = [-1, 0, 1, 2].map((k) => parent[(at + k + n) % n]);
  const shape = stack(classes);
  return shape.at(-1) - shape[0] <= 7 ? place(shape) : null;
}

/** One voicing of the chord, as rising MIDI notes inside C3–B4; null if it doesn't apply. */
export function voiceAs(id, chord) {
  const parent = lydianAnalysis(chord).parentNotes.map(pc);
  const tones = fourTones(chord);
  const closeShapes = rotations(tones).map((t) => stack(t));
  switch (id) {
    case 'close': return bestOf(closeShapes);
    case 'drop2': return bestOf(closeShapes.map((s) => drop(s, [2])));
    case 'drop3': return bestOf(closeShapes.map((s) => drop(s, [3])));
    case 'drop24': return bestOf(closeShapes.map((s) => drop(s, [2, 4])));
    case 'quartal': return quartal(chord, parent);
    case 'cluster': return cluster(chord, parent);
    case 'rootlessA': return rootless(chord, new Set(parent), 'A');
    case 'rootlessB': return rootless(chord, new Set(parent), 'B');
    default: return null;
  }
}

/** The verified voicings of a chord, with their notes (null where one doesn't apply). */
export function voicingsFor(chord) {
  return VOICINGS.filter((x) => x.status === 'verified').map((x) => ({ ...x, midis: voiceAs(x.id, chord) }));
}
