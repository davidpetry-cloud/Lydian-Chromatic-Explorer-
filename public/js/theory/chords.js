// Chord symbols → chord tones → Lydian tonic and parent scale.
// Each quality says which degree above the chord root is its Lydian tonic,
// and which principal scale on that tonic is its parent. A quality ships
// (status 'verified') only when two independent sources agree; see
// docs/theory-sources.md. Pending rows are refused by the parser.
import { parseNote, transpose, pc, noteName } from './notes.js';
import { scaleNotes } from './scales.js';
import { rankScales } from './gravity.js';

const q = (id, label, aliases, degrees, tonicDegree, parentScale, status = 'pending', sources = []) =>
  Object.freeze({ id, label, aliases: Object.freeze(aliases), degrees: Object.freeze(degrees), tonicDegree, parentScale, status, sources: Object.freeze(sources) });

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
  q('7s5', '7♯5', ['7#5', '+7', '7+'], ['1', '3', '#5', 'b7'], '1', 'auxiliary-augmented'),
  q('dim7', 'diminished 7', ['dim7', '°7', 'o7'], ['1', 'b3', 'b5', 'bb7'], '1', 'auxiliary-diminished'),
  q('7b9', '7♭9', ['7b9', '7♭9'], ['1', '3', '5', 'b7', 'b2'], '1', 'auxiliary-diminished-blues'),
  // Extended chords: every tone lies in the parent scale already verified for
  // the basic chord (as 9 and 13 do for the dominant). See docs/theory-sources.md.
  q('maj9', 'major 9', ['maj9', 'M9', 'Δ9'], ['1', '3', '5', '7', '2'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('add9', 'add 9', ['add9', '(add9)'], ['1', '3', '5', '2'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('maj13', 'major 13', ['maj13', 'M13', 'Δ13'], ['1', '3', '5', '7', '2', '6'], '1', 'lydian', 'verified', ['italianpiano', 'wikipedia-chord-scale']),
  q('m9', 'minor 9', ['m9', '-9', 'min9'], ['1', 'b3', '5', 'b7', '2'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m11', 'minor 11', ['m11', '-11', 'min11'], ['1', 'b3', '5', 'b7', '2', '4'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m13', 'minor 13', ['m13', '-13', 'min13'], ['1', 'b3', '5', 'b7', '2', '6'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m', 'minor', ['m', '-', 'mi', 'min'], ['1', 'b3', '5'], 'b3', 'lydian', 'verified', ['italianpiano', 'gct-f-lydian']),
  q('m6', 'minor 6', ['m6', '-6'], ['1', 'b3', '5', '6'], null, null),
  q('mmaj7', 'minor-major 7', ['m(maj7)', 'mMaj7', '-Δ7'], ['1', 'b3', '5', '7'], '1', 'lydian-diminished'),
  q('m7b5', 'half-diminished', ['m7b5', 'ø', 'ø7', '-7b5'], ['1', 'b3', 'b5', 'b7'], null, null),
  q('dim', 'diminished', ['dim', '°', 'o'], ['1', 'b3', 'b5'], null, null),
  q('7sus4', '7sus4', ['7sus4', '7sus'], ['1', '4', '5', 'b7'], null, null),
  q('7s9', '7♯9', ['7#9', '7♯9'], ['1', '3', '5', 'b7', '#2'], '1', 'auxiliary-diminished-blues'),
  q('7alt', 'altered', ['7alt', 'alt'], ['1', '3', 'b7', 'b2', '#2', '#4', 'b6'], null, null),
];

export const QUALITIES = Object.freeze(Object.fromEntries(ROWS.map((r) => [r.id, r])));

export const SUPPORTED_QUALITIES = Object.freeze(ROWS.filter((r) => r.status === 'verified').map((r) => r.id));

const ALIAS_TO_ID = new Map(ROWS.flatMap((r) => r.aliases.map((a) => [a, r.id])));
const ROOT_RE = /^([A-Za-z])([#♯x𝄪b♭𝄫]*)(.*)$/u;

export function chordNotes(chord) {
  return QUALITIES[chord.quality].degrees.map((d) => transpose(chord.root, d));
}

export function lydianAnalysis(chord) {
  const quality = QUALITIES[chord.quality];
  const tonic = transpose(chord.root, quality.tonicDegree);
  const chordPcs = new Set(chordNotes(chord).map(pc));
  return {
    tonic,
    parentScale: quality.parentScale,
    parentNotes: scaleNotes(tonic, quality.parentScale),
    ladder: rankScales(tonic, chordPcs),
  };
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
  if (!quality || !quality.tonicDegree || (quality.status !== 'verified' && !allowPending)) {
    return { error: `“${input}” isn't a chord I know yet. See Reference for the list.` };
  }
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
