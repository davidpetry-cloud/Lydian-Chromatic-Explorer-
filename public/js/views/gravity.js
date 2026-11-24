// The Gravity view: the twelve tones placed round the circle of fifths from
// the Lydian tonic, numbered 1–12 by the order of tonal gravity, with a
// path from the tonic outward. Clicking or pressing Enter on a tone plays it
// over a tonic drone and explains where it sits.
import { noteName, spokenName, pc, parseNote, degreeLabel, asciiName } from '../theory/notes.js';
import { GRAVITY_DEGREES, gravityOrder } from '../theory/gravity.js';
import { PRINCIPAL_SCALES, scalePcs } from '../theory/scales.js';
import { describeLimit } from '../prefs.js';

const SVG = 'http://www.w3.org/2000/svg';
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CENTER = 200;
const RADIUS = 140;
const LABEL_RADIUS = 184;

// Original wording: where each rank sits relative to the tonic.
const MEANING = [
  'the Lydian tonic itself: home',
  'the perfect fifth, the strongest pull toward home',
  'the second, two fifths out',
  'the sixth, three fifths out',
  'the major third, four fifths out',
  'the major seventh, five fifths out',
  'the raised fourth, the last tone of the Lydian scale',
  'the raised fifth, the first step beyond Lydian (Lydian Augmented adds it)',
  'the minor third (Lydian Diminished adds it)',
  'the minor seventh (Lydian Flat Seventh adds it)',
  'the perfect fourth (Auxiliary Diminished adds it)',
  'the flat second, the furthest tone from home (Auxiliary Diminished Blues adds it)',
];

const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

export function mountGravity({ app, announce }) {
  const svg = document.getElementById('gravity-circle');
  const tonicSelect = document.getElementById('gravity-tonic');
  const overlay = document.getElementById('gravity-overlay');
  const note = document.getElementById('gravity-note');
  const tbody = document.querySelector('#gravity-table tbody');
  let tonic = parseNote('C');
  let focusRank = 1;
  let nodes = [];

  for (const r of ROOTS) tonicSelect.add(new Option(noteName(parseNote(r)), r));
  overlay.add(new Option('None', ''));
  for (const s of PRINCIPAL_SCALES) overlay.add(new Option(s.name, s.id));

  function setFocus(rank, move = true) {
    focusRank = ((rank - 1 + 12) % 12) + 1;
    for (const n of nodes) n.g.setAttribute('tabindex', n.rank === focusRank ? '0' : '-1');
    if (move) nodes[focusRank - 1].g.focus();
  }

  async function sound(rank) {
    const n = nodes[rank - 1];
    const text = `${noteName(n.note)}: rank ${rank} of 12, ${MEANING[rank - 1]}.`;
    note.textContent = text;
    announce(text);
    if (!(await app.transport.whenReady(app.engine.resume()))) return;
    const drone = 48 + pc(tonic);
    const label = `Drone on ${noteName(tonic)}, the Lydian tonic`;
    if (app.transport.current()?.label !== label) {
      app.transport.play({ kind: 'drone', owner: 'gravity', steps: [[drone, drone + 7]], bpm: 80, loop: true, label });
    }
    app.transport.poke();
    const midi = 60 + pc(n.note);
    app.engine.note(midi, app.engine.now() + 0.02, 1.2, { gain: 0.25 });
    n.g.classList.add('is-sounding');
    setTimeout(() => n.g.classList.remove('is-sounding'), 600);
  }

  function render() {
    const order = gravityOrder(tonic);
    const inScale = overlay.value ? scalePcs(tonic, overlay.value) : null;
    svg.replaceChildren();
    nodes = order.map((n, i) => {
      const fifths = (((pc(n) - pc(tonic)) * 7) % 12 + 12) % 12; // steps round the circle of fifths
      const angle = (fifths / 12) * 2 * Math.PI - Math.PI / 2;
      return {
        note: n, rank: i + 1,
        x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle),
        lx: CENTER + LABEL_RADIUS * Math.cos(angle), ly: CENTER + LABEL_RADIUS * Math.sin(angle),
      };
    });
    // Each step bows toward the centre, so a line never runs through a tone it skips.
    const d = nodes.map((n, i) => {
      if (i === 0) return `M${n.x.toFixed(1)} ${n.y.toFixed(1)}`;
      const p = nodes[i - 1];
      const cx = CENTER + ((p.x + n.x) / 2 - CENTER) * 0.45;
      const cy = CENTER + ((p.y + n.y) / 2 - CENTER) * 0.45;
      return `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`;
    }).join(' ');
    const path = el('path', { class: 'gpath', d, 'aria-hidden': 'true' });
    svg.append(path);
    svg.append(el('circle', { class: 'gcenter', cx: CENTER, cy: CENTER, r: 4, 'aria-hidden': 'true' }));
    for (const n of nodes) {
      const member = inScale?.has(pc(n.note));
      const g = el('g', {
        class: `gnode${n.rank === 1 ? ' is-tonic' : ''}${n.rank <= 7 ? ' is-lydian' : ''}${member ? ' is-member' : ''}`,
        role: 'button', tabindex: '-1', 'data-rank': n.rank,
        'aria-label': `${spokenName(n.note)}, rank ${n.rank} of 12${member ? ', in the scale' : ''}`,
      });
      g.append(
        el('circle', { cx: n.x, cy: n.y, r: 26 }),
        member ? el('rect', { class: 'gmark', x: n.x - 31, y: n.y - 31, width: 62, height: 62, rx: 12 }) : el('g'),
      );
      const name = el('text', { x: n.x, y: n.y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'gname' });
      name.textContent = noteName(n.note);
      const rank = el('text', { x: n.lx, y: n.ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'grank' });
      rank.textContent = String(n.rank);
      g.append(name, rank);
      g.addEventListener('click', () => { setFocus(n.rank, false); sound(n.rank); });
      svg.append(g);
      n.g = g;
    }
    tbody.replaceChildren(...order.map((n, i) => {
      const tr = document.createElement('tr');
      for (const text of [String(i + 1), spokenName(n), degreeLabel(GRAVITY_DEGREES[i])]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    }));
    setFocus(focusRank, false);
  }

  // A tonic spelled outside the twelve picker roots (F♭ from G♭7) gets its own option.
  let spelled = null;
  function setTonic(next) {
    tonic = next;
    spelled?.remove();
    spelled = null;
    const match = ROOTS.find((r) => r === asciiName(next));
    if (match) {
      tonicSelect.value = match;
    } else {
      spelled = new Option(noteName(next), asciiName(next), true, true);
      tonicSelect.add(spelled);
    }
    render();
  }

  svg.addEventListener('keydown', (e) => {
    const moves = { ArrowRight: focusRank + 1, ArrowDown: focusRank + 1, ArrowLeft: focusRank - 1, ArrowUp: focusRank - 1, Home: 1, End: 12 };
    if (e.key in moves) { e.preventDefault(); setFocus(moves[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sound(focusRank); }
  });
  tonicSelect.addEventListener('change', () => { tonic = parseNote(tonicSelect.value); render(); });
  overlay.addEventListener('change', render);
  document.getElementById('gravity-stop').addEventListener('click', () => app.transport.stop('user'));
  app.events.addEventListener('tonic', (e) => setTonic(e.detail));
  const status = document.getElementById('gravity-status');
  app.transport.onPlay((p) => { status.textContent = `Playing: ${p.label}`; });
  app.transport.onStop((reason) => {
    status.textContent = reason === 'limit' ? `Faded out after ${describeLimit(app.transport.limit())}.` : 'Silent.';
  });

  render();
  return { setTonic };
}
