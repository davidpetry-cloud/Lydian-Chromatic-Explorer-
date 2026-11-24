// The Voicings card in Practice: the current chord in each sourced piano
// voicing, with its notes, a tonal-gravity reading counted from the drone
// note (the player's centre), and a Play/Stop toggle. Playing a voicing
// strikes it each bar until pressed again (or until "Stop after").
import { noteName, pc } from '../theory/notes.js';
import { chordNotes, lydianAnalysis } from '../theory/chords.js';
import { VOICINGS, voicingsFor } from '../theory/voicings.js';
import { gravityReading } from '../theory/reading.js';
import { SOURCES } from '../data/sources.js';
import { mountLead } from './lead.js';

const $ = (id) => document.getElementById(id);
const SHARPS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const make = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

export function mountVoicings({ app, getChord, getCentre, start, droneFor, getBpm, getCentreFor, stepDroneFor }) {
  let list = [];
  const buttons = new Map();

  const sourceRefs = (ids) => ids.map((id) => `[${SOURCES.findIndex((s) => s.id === id) + 1}]`).join(' ');
  const lead = mountLead({ app, getChord, getVoicings: () => list, getCentreFor, stepDroneFor, getBpm, start, sourceRefs });

  function render() {
    const chord = getChord();
    const parentNotes = lydianAnalysis(chord).parentNotes;
    const tones = chordNotes(chord);
    const spell = (m) => {
      const known = [...tones, ...parentNotes].find((n) => pc(n) === m % 12);
      return known ? noteName(known) : SHARPS[m % 12];
    };
    const centre = getCentre();
    list = voicingsFor(chord);
    $('h-voicings').textContent = `Voicings of ${chord.symbol}`;
    const colour = gravityReading([pc(centre) + 60], centre, parentNotes, tones).colour;
    $('voicings-heard').textContent = `Ranks are counted from your drone note, ${noteName(centre)}${colour ? `; heard from ${noteName(centre)}, the parent scale sounds as ${colour}` : ''}. Change “Drone on” to hear the chord from another centre.`;
    // Rows are rebuilt for the new chord: keep focus on the same voicing's button.
    const focused = document.activeElement?.closest?.('#voicings li')?.dataset.voicing;
    buttons.clear();
    $('voicings').replaceChildren(...list.map((v) => {
      const li = make('li', 'voicing');
      li.dataset.voicing = v.id;
      const head = make('p', 'voicing-head');
      head.append(make('span', 'voicing-name', v.name));
      if (!v.midis) {
        head.append(make('span', 'voicing-na', 'Not for this chord'));
        li.append(head, make('p', 'voicing-desc hint', `${v.description} Sources: ${sourceRefs(v.sources)}`));
        return li;
      }
      const button = make('button', 'btn voicing-play');
      button.type = 'button';
      button.addEventListener('click', () => toggle(v.id));
      buttons.set(v.id, button);
      head.append(button);
      const reading = gravityReading(v.midis, centre, parentNotes, tones);
      li.append(
        head,
        make('p', 'voicing-notes mono', `${v.midis.map(spell).join(' ')} over ${noteName(chord.bass)}`),
        make('p', 'voicing-reading', `ranks ${reading.ranks.join(' · ')}: ${reading.words}`),
        make('p', 'voicing-desc hint', `${v.description} Sources: ${sourceRefs(v.sources)}`),
      );
      return li;
    }));
    const pending = VOICINGS.filter((v) => v.status !== 'verified').map((v) => v.name);
    $('voicings-pending').textContent = pending.length ? `Waiting for sources: ${pending.join(', ')}.` : '';
    $('voicings-pending').hidden = !pending.length;
    showState();
    if (focused) buttons.get(focused)?.focus({ preventScroll: true }); // a MIDI chord change mustn't move the page
    lead.refresh();
  }

  const bass = () => 36 + pc(getChord().bass);

  function patternFor(id) {
    const v = list.find((x) => x.id === id);
    if (!v?.midis) return null;
    return { kind: 'voicing', voicingId: id, steps: [[bass(), ...v.midis]], durations: [4], loop: true, bpm: getBpm(), label: `${v.name} of ${getChord().symbol}`, ...droneFor() };
  }

  function patternForAll() {
    const playable = list.filter((v) => v.midis);
    return {
      kind: 'voicings', voicingIds: playable.map((v) => v.id), steps: playable.map((v) => [bass(), ...v.midis]),
      durations: playable.map(() => 4), loop: true, bpm: getBpm(), label: `Every voicing of ${getChord().symbol}`, ...droneFor(),
    };
  }

  const ours = () => app.transport.current()?.owner === 'practice';
  const playingId = () => (ours() && app.transport.current().kind === 'voicing' ? app.transport.current().voicingId : null);

  function toggle(id) {
    if (playingId() === id) { app.transport.stop('user'); return; }
    const p = patternFor(id);
    if (p) start(p);
  }

  $('voicings-all').addEventListener('click', () => {
    if (ours() && app.transport.current().kind === 'voicings') { app.transport.stop('user'); return; }
    start(patternForAll());
  });

  // Buttons and the playing row mirror what the transport plays.
  function showState(activeId = playingId()) {
    for (const [id, b] of buttons) {
      const on = id === activeId && playingId() === id;
      const name = list.find((v) => v.id === id).name;
      // A toggle keeps its name; aria-pressed (and the row's aria-current) carry the state.
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `Play ${name.toLowerCase()}`);
      b.textContent = '▶ Play';
    }
    const all = ours() && app.transport.current()?.kind === 'voicings';
    $('voicings-all').setAttribute('aria-pressed', String(all));
    // Play all names the voicing sounding, in text (not announced each bar).
    $('voicings-now').textContent = all && activeId ? `Now: ${list.find((v) => v.id === activeId)?.name}.` : '';
    for (const li of $('voicings').children) {
      if (li.dataset.voicing === activeId) li.setAttribute('aria-current', 'true');
      else li.removeAttribute('aria-current');
    }
  }

  app.transport.onPlay(() => showState());
  app.transport.onStop(() => showState(null));
  app.transport.onStep(({ index }) => {
    const p = app.transport.current();
    if (ours() && p.kind === 'voicings') showState(p.voicingIds[index]);
  });

  return {
    refresh: render,
    /**
     * The chord or the drone changed while a voicing played: play the same
     * voicing again (of the new chord, over the new drone). If that voicing
     * doesn't fit the new chord, Close plays instead.
     */
    chordChanged() {
      const p = app.transport.current();
      if (!ours()) return;
      if (p.kind === 'lead') lead.restart();
      else if (p.kind === 'voicing') start(patternFor(p.voicingId) ?? patternFor('close'));
      else if (p.kind === 'voicings') start(patternForAll());
    },
  };
}
