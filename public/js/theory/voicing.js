// Voices chords for listening examples: the bass note in octave 2, the other
// chord tones above, and each new chord placed to move as little as possible
// from the last one (nearest-voice leading).
import { pc } from './notes.js';
import { chordNotes } from './chords.js';

const BASS_LOW = 36;   // C2
const UPPER_LOW = 60;  // C4
const RANGE = [55, 76]; // where moving voices may go

function upperClasses(chord) {
  const bass = pc(chord.bass);
  const tones = [...new Set(chordNotes(chord).map(pc))];
  const above = tones.filter((p) => p !== bass);
  return above.length >= 2 ? above : tones;
}

export function voiceChord(chord) {
  const upper = upperClasses(chord).map((p) => UPPER_LOW + p).sort((a, b) => a - b);
  return { bass: BASS_LOW + pc(chord.bass), upper };
}

function placements(p) {
  const out = [];
  for (let m = RANGE[0]; m <= RANGE[1]; m++) if (m % 12 === p) out.push(m);
  return out;
}

function cost(prev, next) {
  if (prev.length === next.length) return next.reduce((s, m, i) => s + Math.abs(m - prev[i]), 0);
  return next.reduce((s, m) => s + Math.min(...prev.map((q) => Math.abs(q - m))), 0);
}

export function voiceProgression(chords) {
  const out = [];
  for (const chord of chords) {
    if (!out.length) { out.push(voiceChord(chord)); continue; }
    const prev = out[out.length - 1].upper;
    let best = null;
    const walk = (classes, picked) => {
      if (!classes.length) {
        const upper = [...picked].sort((a, b) => a - b);
        if (new Set(upper).size !== upper.length) return;
        const c = cost(prev, upper);
        const total = upper.reduce((s, m) => s + m, 0);
        if (!best || c < best.c || (c === best.c && total < best.total)) best = { upper, c, total };
        return;
      }
      for (const m of placements(classes[0])) walk(classes.slice(1), [...picked, m]);
    };
    walk(upperClasses(chord), []);
    out.push({ bass: BASS_LOW + pc(chord.bass), upper: best.upper });
  }
  return out;
}
