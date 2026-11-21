// The Lydian Chromatic order of tonal gravity: the twelve tones ranked
// outward from the Lydian tonic. The first seven are stacked perfect fifths
// (the Lydian scale); the last five are the tones each later principal scale
// adds. Sources: docs/theory-sources.md.
import { transpose, pc } from './notes.js';
import { PRINCIPAL_SCALES, scaleNotes } from './scales.js';

export const GRAVITY_DEGREES = Object.freeze(['1', '5', '2', '6', '3', '7', '#4', '#5', 'b3', 'b7', '4', 'b2']);

export const gravityOrder = (tonic) => GRAVITY_DEGREES.map((d) => transpose(tonic, d));

/** 1 (the tonic itself) to 12 (furthest out). */
export function gravityRank(tonic, pitchClass) {
  return gravityOrder(tonic).findIndex((n) => pc(n) === pitchClass) + 1;
}

/** All seven principal scales on the tonic, ingoing → outgoing, with how each meets the chord. */
export function rankScales(tonic, chordPcs) {
  return PRINCIPAL_SCALES.map((scale) => {
    const notes = scaleNotes(tonic, scale.id);
    const inScale = new Set(notes.map(pc));
    const missing = [...chordPcs].filter((p) => !inScale.has(p)).sort((a, b) => a - b);
    return { scale, notes, holdsChord: missing.length === 0, missing };
  });
}
