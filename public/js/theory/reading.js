// Reads a voicing by tonal gravity, counted from a centre the player chooses
// (the drone note): each note's rank in the order of tonal gravity (1 home,
// 12 furthest), how far out the voicing reaches, and the colour the parent
// scale takes when heard from that centre ("heard from G: G Mixolydian").
// Outgoing tones are a colour you can stay in, so the words describe and
// never tell the player to resolve. Sources: docs/theory-sources.md.
import { pc, noteName } from './notes.js';
import { GRAVITY_DEGREES, gravityOrder } from './gravity.js';
import { modeFrom } from './modes.js';

const INSIDE = 7; // the first seven ranks are the Lydian scale itself
const SEMITONES = { 1: 0, 5: 7, 2: 2, 6: 9, 3: 4, 7: 11, '#4': 6, '#5': 8, b3: 3, b7: 10, 4: 5, b2: 1 };
const OFFSETS = GRAVITY_DEGREES.map((d) => SEMITONES[d]);
const mod12 = (x) => ((x % 12) + 12) % 12;

/** Rank 1–12 of a pitch class, counted from the centre (works for any spelling of the centre). */
export const rankFrom = (centre, p) => OFFSETS.indexOf(mod12(p - pc(centre))) + 1;

// How to spell a pitch class: as the chord or parent scale spells it, else from the gravity order.
function spell(p, centre, spellings) {
  const known = spellings.find((n) => pc(n) === p);
  if (known) return known;
  try { return gravityOrder(centre).find((n) => pc(n) === p); } catch { return null; }
}

/**
 * @returns {{ ranks: number[], reach: { note, rank, degree } | null, words: string, colour: string | null }}
 */
export function gravityReading(midis, centre, parentNotes, chordNotes) {
  const ranks = midis.map((m) => rankFrom(centre, mod12(m)));
  const top = Math.max(...ranks);
  let reach = null;
  let words = `inside: nothing past rank ${INSIDE}`;
  if (top > INSIDE) {
    const p = mod12(midis[ranks.indexOf(top)]);
    const note = spell(p, centre, [...chordNotes, ...parentNotes]);
    const degree = GRAVITY_DEGREES[top - 1].replace('#', '♯').replace('b', '♭');
    reach = { note, rank: top, degree };
    words = `reaches outward to ${note ? noteName(note) : '?'} (${degree} from ${noteName(centre)}), rank ${top}; it can stay there`;
  }
  const mode = modeFrom(parentNotes, centre);
  const colour = mode?.name ? `${noteName(centre)} ${mode.name}` : null;
  return { ranks, reach, words, colour };
}
