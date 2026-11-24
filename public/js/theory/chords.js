// Chord symbols → chord tones → Lydian tonic and parent scale.
// Each quality says which degree above the chord root is its Lydian tonic,
// and which principal scale on that tonic is its parent. A quality ships
// (status 'verified') only when two independent sources agree; see
// docs/theory-sources.md. Pending rows are refused by the parser.
// Where Russell's Chart A lists a chord in more than one scale, the app uses
// the most ingoing one (nearest plain Lydian), as it does for dominant 7,
// and says so in `note`; the other homes still appear in the scale ladder.
import { parseNote, transpose, pc, noteName } from './notes.js';
import { scaleNotes } from './scales.js';
import { rankScales } from './gravity.js';
import { lydianTonicsFor } from './sus.js';

const q = (id, label, aliases, degrees, tonicDegree, parentScale, status = 'pending', sources = [], note = null, { noSingleParent = false } = {}) =>
  Object.freeze({ id, label, aliases: Object.freeze(aliases), degrees: Object.freeze(degrees), tonicDegree, parentScale, status, sources: Object.freeze(sources), note, noSingleParent });
// A tonic a tritone or a major third from the root has two spellings
// (C → G♭ or F♯; C → E or F♭). The app takes whichever gives the parent
// scale fewer accidentals (E♭ → A, not B𝄫), keeping the first on a tie.
const RESPELL = Object.freeze({ b5: '#4', 3: 'b4' });
const accidentals = (notes) => notes.reduce((n, note) => n + Math.abs(note.acc), 0);
const CHART_A = ['french-chart-a', 'mcclimon'];
const NO_SINGLE_PARENT = 'No single parent scale: it lies in several Lydian scales, listed in tonal-gravity order (the app’s convention, David’s reading).';
const SUS = { noSingleParent: true };

const ROWS = [
  q('maj', 'major', ['', 'maj', 'M'], ['1', '3', '5'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('maj7', 'major 7', ['maj7', 'M7', 'Δ', 'Δ7', 'ma7'], ['1', '3', '5', '7'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('6', '6', ['6'], ['1', '3', '5', '6'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('69', '6/9', ['6/9', '69'], ['1', '3', '5', '6', '2'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('maj7s11', 'maj7♯11', ['maj7#11', 'Δ#11', 'maj7♯11'], ['1', '3', '5', '7', '#4'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-lydian-chord']),
  q('m7', 'minor 7', ['m7', '-7', 'mi7', 'min7'], ['1', 'b3', '5', 'b7'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('7', 'dominant 7', ['7'], ['1', '3', '5', 'b7'], 'b7', 'lydian', 'verified', ['italianpiano', 'cafesaxophone']),
  q('9', '9', ['9'], ['1', '3', '5', 'b7', '2'], 'b7', 'lydian', 'verified', ['italianpiano', 'cafesaxophone']),
  q('13', '13', ['13'], ['1', '3', '5', 'b7', '2', '6'], 'b7', 'lydian', 'verified', ['italianpiano', 'cafesaxophone']),
  q('7s11', '7♯11', ['7#11', '7♯11'], ['1', '3', '5', 'b7', '#4'], '1', 'lydian-flat-seventh', 'verified', ['wikipedia-lydian-chord', 'french-lydian-dominant']),
  q('aug', 'augmented', ['aug', '+'], ['1', '3', '#5'], '1', 'lydian-augmented', 'verified', ['italianpiano', 'wikipedia-lydian-chord']),
  q('maj7s5', 'maj7♯5', ['maj7#5', 'Δ#5', '+maj7'], ['1', '3', '#5', '7'], '1', 'lydian-augmented', 'verified', ['italianpiano', 'wikipedia-lydian-chord']),
  // From Russell's Chart A (4th ed., inside cover) and his table of primary
  // modal tonics (p. 29); see docs/theory-sources.md (2026-11-24).
  q('7s5', '7♯5', ['7#5', '+7', '7+'], ['1', '3', '#5', 'b7'], '3', 'lydian-augmented', 'verified', CHART_A,
    'Chart A also lists it in Lydian Diminished, Lydian Flat Seventh and Auxiliary Augmented; this app uses the most ingoing home.'),
  q('7alt', 'altered', ['7alt', 'alt'], ['1', '3', 'b7', 'b2', '#2', '#4', 'b6'], '3', 'lydian-augmented', 'verified', CHART_A,
    'Chart A lists the altered tensions (♯5 with ♭9, ♯9 or ♯11) on this mode; the name “altered” is the common jazz name.'),
  q('dim7', 'diminished 7', ['dim7', '°7', 'o7'], ['1', 'b3', 'b5', 'bb7'], 'b5', 'lydian-diminished', 'verified', ['french-chart-a', 'italianpiano'],
    'Chart A also lists it in Auxiliary Diminished; this app uses the more ingoing home. The second source agrees on Lydian Diminished but names no mode, so the tonic awaits a book check.'),
  q('7b9', '7♭9', ['7b9', '7♭9'], ['1', '3', '5', 'b7', 'b2'], 'b7', 'lydian-diminished', 'verified', CHART_A,
    'Chart A also lists it on Lydian Diminished mode VII (Lydian tonic a half step above the root) and in the auxiliary diminished scales; Russell’s p. 29 table puts altered sevenths on mode II, as here.'),
  q('7s9', '7♯9', ['7#9', '7♯9'], ['1', '3', '5', 'b7', '#2'], 'b7', 'auxiliary-diminished', 'verified', CHART_A,
    'Chart A also lists it on Lydian Diminished mode VII (Lydian tonic a half step above the root), a more ingoing home. This app follows the home both sources share: Russell’s p. 29 table puts altered sevenths on mode II.'),
  // Extended chords: every tone lies in the parent scale already verified for
  // the basic chord (as 9 and 13 do for the dominant). See docs/theory-sources.md.
  q('maj9', 'major 9', ['maj9', 'M9', 'Δ9'], ['1', '3', '5', '7', '2'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('add9', 'add 9', ['add9', '(add9)'], ['1', '3', '5', '2'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('maj13', 'major 13', ['maj13', 'M13', 'Δ13'], ['1', '3', '5', '7', '2', '6'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('m9', 'minor 9', ['m9', '-9', 'min9'], ['1', 'b3', '5', 'b7', '2'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m11', 'minor 11', ['m11', '-11', 'min11'], ['1', 'b3', '5', 'b7', '2', '4'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m13', 'minor 13', ['m13', '-13', 'min13'], ['1', 'b3', '5', 'b7', '2', '6'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m', 'minor', ['m', '-', 'mi', 'min'], ['1', 'b3', '5'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m6', 'minor 6', ['m6', '-6'], ['1', 'b3', '5', '6'], 'b3', 'lydian', 'verified', CHART_A),
  q('mmaj7', 'minor-major 7', ['m(maj7)', 'mMaj7', '-Δ7'], ['1', 'b3', '5', '7'], 'b3', 'lydian-augmented', 'verified', CHART_A,
    'Chart A also lists it in Lydian Diminished on the root (“Dim Maj 7th”); this app uses the more ingoing home.'),
  q('m7b5', 'half-diminished', ['m7b5', 'ø', 'ø7', '-7b5'], ['1', 'b3', 'b5', 'b7'], 'b5', 'lydian', 'verified', CHART_A),
  q('dim', 'diminished', ['dim', '°', 'o'], ['1', 'b3', 'b5'], 'b5', 'lydian', 'verified', CHART_A,
    'Inferred (David’s choice): the sources name the half-diminished chord here, not this triad, which is that chord without its seventh.'),
  // Sus chords: Chart A names none, and their open, pentatonic sound lies in
  // several Lydian scales at once, so they have no single parent (David,
  // 2026-11-24). lydianAnalysis lists every Lydian tonic that holds them, in
  // tonal-gravity order, and the drone picks the one heard.
  q('sus4', 'sus4', ['sus4', 'sus'], ['1', '4', '5'], null, 'lydian', 'verified', ['hutchinson-sus', 'omt-lead-sheet'], NO_SINGLE_PARENT, SUS),
  q('sus2', 'sus2', ['sus2'], ['1', '2', '5'], null, 'lydian', 'verified', ['hutchinson-sus', 'omt-lead-sheet'], NO_SINGLE_PARENT, SUS),
  q('7sus4', '7sus4', ['7sus4', '7sus'], ['1', '4', '5', 'b7'], null, 'lydian', 'verified', ['hutchinson-chord-symbols', 'omt-lead-sheet'], NO_SINGLE_PARENT, SUS),
  q('7sus2', '7sus2', ['7sus2'], ['1', '2', '5', 'b7'], null, 'lydian', 'verified', ['hutchinson-sus', 'omt-lead-sheet'],
    `${NO_SINGLE_PARENT} Neither source names 7sus2: it is their sus2 (a 2nd in place of the 3rd) on a dominant 7th.`, SUS),
];

export const QUALITIES = Object.freeze(Object.fromEntries(ROWS.map((r) => [r.id, r])));

export const SUPPORTED_QUALITIES = Object.freeze(ROWS.filter((r) => r.status === 'verified').map((r) => r.id));

const ALIAS_TO_ID = new Map(ROWS.flatMap((r) => r.aliases.map((a) => [a, r.id])));
const ROOT_RE = /^([A-Za-z])([#♯x𝄪b♭𝄫]*)(.*)$/u;

export function chordNotes(chord) {
  return QUALITIES[chord.quality].degrees.map((d) => transpose(chord.root, d));
}

/** Every Lydian tonic that holds the chord, most ingoing first (see sus.js). */
export const lydianTonics = (chord) => lydianTonicsFor(chordNotes(chord).map(pc));

/**
 * The chord's Lydian tonic and parent scale. A sus chord has no single
 * parent: its tonic is the listed one matching `centre` (the drone note, by
 * pitch class), else the most ingoing.
 */
export function lydianAnalysis(chord, { centre = null } = {}) {
  const quality = QUALITIES[chord.quality];
  const chordPcs = new Set(chordNotes(chord).map(pc));
  if (quality.noSingleParent) {
    const tonics = lydianTonics(chord);
    const tonic = (centre && tonics.find((t) => pc(t) === pc(centre))) || tonics[0];
    return { tonic, parentScale: 'lydian', parentNotes: scaleNotes(tonic, 'lydian'), ladder: rankScales(tonic, chordPcs), tonics, noSingleParent: true };
  }
  const analyse = (degree) => {
    const tonic = transpose(chord.root, degree);
    return {
      tonic,
      parentScale: quality.parentScale,
      parentNotes: scaleNotes(tonic, quality.parentScale),
      ladder: rankScales(tonic, chordPcs),
    };
  };
  let best = null;
  let failure = null;
  for (const degree of [quality.tonicDegree, RESPELL[quality.tonicDegree]].filter(Boolean)) {
    try {
      const a = analyse(degree);
      if (!best || accidentals(a.parentNotes) < accidentals(best.parentNotes)) best = a;
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      failure = e;
    }
  }
  if (!best) throw failure;
  return { ...best, tonics: [best.tonic], noSingleParent: false };
}

/** "Cmaj7" → { root, quality, symbol }, or { error } in plain words. */
export function parseChord(text, { allowPending = false } = {}) {
  const input = String(text ?? '').trim();
  if (!input) return { error: 'Type a chord, like Cmaj7, Dm7 or G7.' };
  const m = ROOT_RE.exec(input);
  const root = m && parseNote(m[1] + m[2]);
  if (!root) {
    const shown = m && /[A-Ga-g]/.test(m[1]) ? m[1] + m[2] : [...input][0];
    return { error: `I don't know “${shown}” as a note. Try A to G, with # or b.` };
  }
  // Spaces don't matter, and word spellings (Maj, MIN, Aug…) are read in any
  // case. Single letters keep their case, so M7 (major) ≠ m7 (minor).
  const rest = m[3].replace(/\s+/g, '').replace(/^(maj|min|dim|aug|alt|sus)/i, (w) => w.toLowerCase());
  // A slash names the bass note (Cmaj7/E). Try the whole text as a chord
  // type first, because 6/9 has a slash of its own.
  let qualityText = rest;
  let bass = root;
  if (!ALIAS_TO_ID.has(rest) && rest.includes('/')) {
    const at = rest.lastIndexOf('/');
    qualityText = rest.slice(0, at);
    bass = parseNote(rest.slice(at + 1));
    if (!bass) return { error: `I don't know “${rest.slice(at + 1)}” as a bass note. Try A to G, with # or b.` };
  }
  const id = ALIAS_TO_ID.get(qualityText);
  const quality = id && QUALITIES[id];
  if (!quality || !(quality.tonicDegree || quality.noSingleParent) || (quality.status !== 'verified' && !allowPending)) {
    return { error: `“${input}” isn't a chord I know yet. See Reference for the list.` };
  }
  if (pc(bass) === pc(root) && bass.letter === root.letter) bass = root; // Emaj7/E is just Emaj7
  const slash = bass === root ? '' : `/${noteName(bass)}`;
  const chord = { root, quality: id, symbol: noteName(root) + qualityText + slash, bass };
  try {
    lydianAnalysis(chord);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    return { error: `“${input}” would need triple sharps or flats. Try the same chord on another spelling of the root.` };
  }
  return chord;
}
