// "Into a next chord" on the Voicings card: how the chosen voicing moves into
// a chord the player types, smoothly or as the same shape (planing). Each
// chord is heard from its own drone note, and every voice's move is read by
// tonal gravity; the words describe, never prescribe. Play toggles a loop of
// the two chords, a bar each, with the drone following each chord.
import { noteName, pc } from '../theory/notes.js';
import { chordNotes, lydianAnalysis, parseChord } from '../theory/chords.js';
import { WAYS, smoothInto, planeInto, compareVoices, describeMoves } from '../theory/voiceleading.js';

const $ = (id) => document.getElementById(id);
const SHARPS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const make = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

// Spell a MIDI note as this chord (or its parent scale) spells it.
function speller(chord) {
  const known = [...chordNotes(chord), ...lydianAnalysis(chord).parentNotes];
  return (m) => { const n = known.find((x) => pc(x) === ((m % 12) + 12) % 12); return n ? noteName(n) : SHARPS[((m % 12) + 12) % 12]; };
}

export function mountLead({ app, getChord, getVoicings, getCentreFor, stepDroneFor, getBpm, start, sourceRefs }) {
  let next = null;
  let rows = []; // { way, to, note } for the current render
  const buttons = new Map();

  const ours = () => app.transport.current()?.owner === 'practice';
  const playingWay = () => (ours() && app.transport.current().kind === 'lead' ? app.transport.current().way : null);

  function fromVoicing() {
    const playable = getVoicings().filter((v) => v.midis);
    const select = $('lead-from');
    const keep = select.value;
    select.replaceChildren(...playable.map((v) => new Option(v.name, v.id)));
    select.value = playable.some((v) => v.id === keep) ? keep : 'close';
    return playable.find((v) => v.id === select.value);
  }

  function refresh() {
    // Rows are rebuilt: keep focus on the same way's button.
    const focused = document.activeElement?.closest?.('#leads li')?.dataset.way;
    const chord = getChord();
    const from = fromVoicing();
    buttons.clear();
    rows = [];
    $('leads').replaceChildren();
    $('lead-centres').textContent = '';
    if (!next || !from) { showState(); return; }
    const centreA = getCentreFor(chord);
    const centreB = getCentreFor(next);
    const spellA = speller(chord);
    const spellB = speller(next);
    $('lead-centres').textContent = `${chord.symbol} is heard from ${noteName(centreA)}, and ${next.symbol} from ${noteName(centreB)}: each chord from its own drone note.`;
    for (const way of WAYS) {
      const li = make('li', 'voicing lead-row');
      li.dataset.way = way.id;
      const head = make('p', 'voicing-head');
      head.append(make('span', 'lead-name', way.name));
      let to = null;
      let note = '';
      if (way.id === 'smooth') to = smoothInto(from.midis, next, from.id);
      else {
        const r = planeInto(from.id, from.midis, chord, next);
        if (r) { to = r.midis; note = !r.parallel ? 'Same voicing type; the chord type changes.' : r.shift === 0 ? 'Same chord: nothing moves.' : 'The shape moves in parallel.'; }
      }
      if (!to) {
        head.append(make('span', 'voicing-na', 'Not for this chord'));
        li.append(head, make('p', 'voicing-desc hint', `${way.description} Sources: ${sourceRefs(way.sources)}`));
        $('leads').append(li);
        continue;
      }
      const button = make('button', 'btn voicing-play');
      button.type = 'button';
      button.addEventListener('click', () => toggle(way.id));
      buttons.set(way.id, button);
      head.append(button);
      const d = describeMoves(compareVoices(from.midis, to, centreA, centreB), (m, which) => (which === 'from' ? spellA(m) : spellB(m)));
      li.append(
        head,
        make('p', 'voicing-notes mono', `${to.map(spellB).join(' ')} over ${noteName(next.bass)}`),
        make('p', 'lead-steps', d.steps),
        make('p', 'voicing-reading', d.summary),
      );
      if (note) li.append(make('p', 'hint', note));
      li.append(make('p', 'voicing-desc hint', `${way.description} Sources: ${sourceRefs(way.sources)}`));
      $('leads').append(li);
      rows.push({ way: way.id, from, to });
    }
    showState();
    if (focused) buttons.get(focused)?.focus();
  }

  function patternFor(wayId) {
    const r = rows.find((x) => x.way === wayId);
    if (!r) return null;
    const chord = getChord();
    const drones = [stepDroneFor(chord), stepDroneFor(next)];
    return {
      kind: 'lead', way: wayId, voicingId: r.from.id,
      steps: [[36 + pc(chord.bass), ...r.from.midis], [36 + pc(next.bass), ...r.to]],
      durations: [4, 4], loop: true, bpm: getBpm(),
      label: `${r.from.name} of ${chord.symbol} → ${next.symbol}, ${WAYS.find((w) => w.id === wayId).name.toLowerCase()}`,
      ...(drones[0] ? { stepDrones: drones, droneSound: app.droneSound } : {}),
    };
  }

  function toggle(wayId) {
    if (playingWay() === wayId) { app.transport.stop('user'); return; }
    const p = patternFor(wayId);
    if (p) start(p);
  }

  function showState() {
    for (const [id, b] of buttons) {
      const on = playingWay() === id;
      const name = WAYS.find((w) => w.id === id).name.toLowerCase();
      // A toggle keeps its name; aria-pressed and the row's aria-current carry the state.
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `Play ${name} lead`);
      b.textContent = '▶ Play';
    }
    for (const li of $('leads').children) {
      if (li.dataset.way && li.dataset.way === playingWay()) li.setAttribute('aria-current', 'true');
      else li.removeAttribute('aria-current');
    }
  }

  let applied = null; // the text last applied, so leaving the field unchanged redraws nothing
  function setNext() {
    const text = $('next-chord').value.trim();
    if (text === applied) return;
    applied = text;
    $('next-chord-error').textContent = '';
    $('next-chord').removeAttribute('aria-invalid');
    // No next chord (cleared, or not one the app knows): a playing lead stops with it.
    const drop = () => { next = null; if (playingWay()) app.transport.stop('user'); refresh(); };
    if (!text) { drop(); return; }
    const parsed = parseChord(text);
    if (parsed.error) { $('next-chord-error').textContent = parsed.error; $('next-chord').setAttribute('aria-invalid', 'true'); drop(); return; }
    next = parsed;
    refresh();
    restart();
  }

  /** Play the same way again with the current chords (after any change), or Smooth if that way no longer fits. */
  function restart() {
    const way = playingWay();
    if (!way) return;
    const p = patternFor(way) ?? patternFor('smooth');
    if (p) start(p); else app.transport.stop('user');
  }

  $('next-chord').addEventListener('change', setNext);
  $('next-chord').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setNext(); } });
  $('lead-from').addEventListener('change', () => { refresh(); restart(); });
  app.transport.onPlay(showState);
  app.transport.onStop(showState);

  return { refresh, restart };
}
