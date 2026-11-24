// A two-octave keyboard in SVG, from C3. Scale tones are filled and named;
// chord tones also get a ring, so colour is never the only signal. Keys use
// a roving tabindex: Tab lands on one key, arrows move, Enter or Space plays.
import { spokenName, noteName } from '../theory/notes.js';

const SVG = 'http://www.w3.org/2000/svg';
const START = 48; // C3
const COUNT = 24;
const WHITE_W = 40;
const WHITE_H = 150;
const BLACK_W = 26;
const BLACK_H = 92;
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];
const SHARP_SPOKEN = ['C', 'C sharp', 'D', 'D sharp', 'E', 'F', 'F sharp', 'G', 'G sharp', 'A', 'A sharp', 'B'];

const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

export function createKeyboard(svg, { onKey }) {
  const keys = [];
  let focusIndex = 0;
  let whiteX = 0;
  const whites = el('g');
  const blacks = el('g');
  for (let i = 0; i < COUNT; i += 1) {
    const midi = START + i;
    const black = IS_BLACK[midi % 12];
    const x = black ? whiteX - BLACK_W / 2 : whiteX;
    if (!black) whiteX += WHITE_W;
    const g = el('g', { class: `key ${black ? 'key-black' : 'key-white'}`, role: 'button', tabindex: '-1', 'data-midi': midi });
    const rect = el('rect', { x, y: 0, width: black ? BLACK_W : WHITE_W, height: black ? BLACK_H : WHITE_H, rx: 4 });
    const ring = el('circle', { class: 'key-ring', cx: x + (black ? BLACK_W : WHITE_W) / 2, cy: (black ? BLACK_H : WHITE_H) - 34, r: 10 });
    const label = el('text', { class: 'key-label', x: x + (black ? BLACK_W : WHITE_W) / 2, y: (black ? BLACK_H : WHITE_H) - 12, 'text-anchor': 'middle' });
    g.append(rect, ring, label);
    (black ? blacks : whites).append(g);
    keys.push({ g, midi, label });
    g.addEventListener('click', () => { setFocus(i, false); onKey(midi); });
  }
  svg.setAttribute('viewBox', `0 0 ${whiteX} ${WHITE_H}`);
  svg.append(whites, blacks);
  keys[0].g.setAttribute('tabindex', '0');

  function setFocus(i, move = true) {
    keys[focusIndex].g.setAttribute('tabindex', '-1');
    focusIndex = Math.max(0, Math.min(COUNT - 1, i));
    keys[focusIndex].g.setAttribute('tabindex', '0');
    if (move) keys[focusIndex].g.focus();
  }

  svg.addEventListener('keydown', (e) => {
    const moves = { ArrowRight: focusIndex + 1, ArrowUp: focusIndex + 1, ArrowLeft: focusIndex - 1, ArrowDown: focusIndex - 1, Home: 0, End: COUNT - 1 };
    if (e.key in moves) { e.preventDefault(); setFocus(moves[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKey(keys[focusIndex].midi); }
  });

  return {
    /** lit, ringed: Sets of pitch classes; names: Map pc → Note (spelling). */
    update({ lit, ringed, names }) {
      for (const k of keys) {
        const p = k.midi % 12;
        const inScale = lit.has(p);
        const isChord = ringed.has(p);
        k.g.classList.toggle('is-lit', inScale);
        k.g.classList.toggle('is-chord', isChord);
        const note = names.get(p);
        k.label.textContent = inScale && note ? noteName(note) : '';
        const spoken = note ? spokenName(note) : SHARP_SPOKEN[p];
        const octave = Math.floor(k.midi / 12) - 1;
        k.g.setAttribute('aria-label', `${spoken} ${octave}${inScale ? ', in scale' : ''}${isChord ? ', chord tone' : ''}`);
      }
    },
    clearFlashes() {
      for (const k of keys) k.g.classList.remove('is-sounding');
    },
    flash(midi, ms = 220) {
      // Only the key that is sounding: a note above or below the keyboard lights nothing.
      const k = keys.find((x) => x.midi === midi);
      if (!k) return;
      k.g.classList.add('is-sounding');
      setTimeout(() => k.g.classList.remove('is-sounding'), ms);
    },
  };
}
