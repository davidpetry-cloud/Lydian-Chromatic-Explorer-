// The Practice view: the chord's Lydian tonic and parent scale, the ladder
// of seven principal scales (ingoing → outgoing), the keyboard, and the
// practice controls. Every sound is mirrored on screen and in text.
import { noteName, spokenName, pc, ascendingMidis, degreeLabel } from '../theory/notes.js';
import { scaleById, scaleNotes } from '../theory/scales.js';
import { gravityRank } from '../theory/gravity.js';
import { QUALITIES, chordNotes, lydianAnalysis } from '../theory/chords.js';
import { mountChordInput } from '../input/chord-input.js';
import { createKeyboard } from './keyboard.js';
import { createFlashGate } from './flash-gate.js';
import { writePref, volumePref } from '../prefs.js';

const $ = (id) => document.getElementById(id);
const names = (notes) => notes.map(noteName).join(' ');
const DIRECTION_WORD = { up: 'ascending', down: 'descending', updown: 'up and down' };

function fitLine(row, chordTones) {
  if (row.holdsChord) return 'Holds every chord tone';
  const changes = chordTones
    .filter((n) => row.missing.includes(pc(n)))
    .map((n) => {
      const twin = row.notes.find((s) => s.letter === n.letter);
      return twin ? `${noteName(n)} → ${noteName(twin)}` : `leaves out ${noteName(n)}`;
    });
  return `Changes: ${changes.join(', ')}`;
}

export function mountPractice({ app, announce, initialText }) {
  const state = { chord: null, analysis: null, scaleId: null, bpm: 80 };
  const keyboard = createKeyboard($('keyboard'), { onKey: playKey });
  const ladder = $('ladder');

  function tonicMidis() {
    const root = 48 + pc(state.analysis.tonic);
    return [root, root + 7];
  }

  function scaleSteps() {
    const up = ascendingMidis(scaleNotes(state.analysis.tonic, state.scaleId), 4);
    const dir = $('direction').value;
    const seq = dir === 'down' ? [...up].reverse() : dir === 'updown' ? [...up, ...up.slice(1, -1).reverse()] : up;
    return seq.map((m) => [m]);
  }

  function scaleLabel() {
    return `${noteName(state.analysis.tonic)} ${scaleById(state.scaleId).name}`;
  }

  const BUTTON_FOR = { scale: 'play-scale', drone: 'drone', chordLoop: 'chord-loop' };
  const SILENT = 'Silent. Press a play button to start.';

  // Pressed buttons and the "now playing" line always mirror what the
  // transport is actually playing, whichever view started it.
  function showPlaying(pattern) {
    const active = pattern ? BUTTON_FOR[pattern.kind] : null;
    for (const b of Object.values(BUTTON_FOR)) $(b).setAttribute('aria-pressed', String(b === active));
    $('now-playing').textContent = pattern ? `Playing: ${pattern.label}` : SILENT;
  }

  async function start(pattern) {
    await app.engine.resume();
    app.engine.setVolume(Number($('volume').value) / 100);
    app.transport.play(pattern);
    announce(pattern.label);
  }

  const scaleRunLabel = (bpm) => `${scaleLabel()}, ${DIRECTION_WORD[$('direction').value]}, ${bpm} bpm`;
  const chordLoopLabel = (bpm) => `${state.chord.symbol} chord loop, ${bpm} bpm`;

  function playScale() {
    const bpm = state.bpm;
    const label = scaleRunLabel(bpm);
    start({ kind: 'scale', steps: scaleSteps(), bpm, loop: true, label, drone: $('hold-tonic').checked ? tonicMidis() : null });
  }

  function playDrone() {
    const label = `Drone on ${noteName(state.analysis.tonic)}, the Lydian tonic`;
    start({ kind: 'drone', steps: [tonicMidis()], bpm: state.bpm, loop: true, label });
  }

  function playChordLoop() {
    const tones = ascendingMidis(chordNotes(state.chord), 3).slice(0, -1);
    const label = chordLoopLabel(state.bpm);
    start({ kind: 'chordLoop', steps: [tones, [], [], []], bpm: state.bpm, loop: true, label });
  }

  function restartIfPlaying() {
    const current = app.transport.current();
    if (!current) return;
    if (current.kind === 'scale') playScale();
    else if (current.kind === 'drone') playDrone();
    else playChordLoop();
  }

  async function playKey(midi) {
    await app.engine.resume();
    app.transport.poke();
    app.engine.note(midi, app.engine.now() + 0.01, 0.6);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) keyboard.flash(midi, 600);
  }

  function renderLadder(chordTones) {
    ladder.replaceChildren();
    state.analysis.ladder.forEach((row, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ladder-card';
      btn.dataset.scale = row.scale.id;
      btn.setAttribute('aria-pressed', String(row.scale.id === state.scaleId));
      const parts = [
        ['span', 'ladder-rank', String(i + 1)],
        ['span', 'ladder-name', `${noteName(state.analysis.tonic)} ${row.scale.name}`],
        ['span', 'ladder-notes mono', names(row.notes)],
        ['span', 'ladder-degrees mono', row.scale.degrees.map(degreeLabel).join(' ')],
        ['span', `ladder-fit ${row.holdsChord ? 'fit-holds' : 'fit-changes'}`, `${row.holdsChord ? '●' : '◐'} ${fitLine(row, chordTones)}`],
      ];
      const ids = parts.map((_, k) => `ladder-${i}-${k}`);
      parts.forEach(([tag, cls, text], k) => {
        const s = document.createElement(tag);
        s.className = cls;
        s.id = ids[k];
        s.textContent = text;
        btn.append(s);
      });
      btn.setAttribute('aria-labelledby', `${ids[0]} ${ids[1]}`);
      btn.setAttribute('aria-describedby', `${ids[4]} ${ids[2]}`);
      btn.addEventListener('click', () => { selectScale(row.scale.id); playScale(); });
      li.append(btn);
      ladder.append(li);
    });
  }

  function selectScale(id) {
    state.scaleId = id;
    for (const b of ladder.querySelectorAll('.ladder-card')) b.setAttribute('aria-pressed', String(b.dataset.scale === id));
    $('selected-scale').textContent = scaleLabel();
    const notes = scaleNotes(state.analysis.tonic, id);
    keyboard.update({
      lit: new Set(notes.map(pc)),
      ringed: new Set(chordNotes(state.chord).map(pc)),
      names: new Map([...chordNotes(state.chord), ...notes].map((n) => [pc(n), n])),
    });
  }

  function renderGravity() {
    const tonic = state.analysis.tonic;
    const depth = Math.max(...state.analysis.parentNotes.map((n) => gravityRank(tonic, pc(n))));
    const strip = $('gravity-strip');
    strip.replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const dot = document.createElement('span');
      dot.className = `gdot${i < depth ? ' is-on' : ''}`;
      return dot;
    }));
    $('gravity-text').textContent = `Uses ${depth} of 12 tones, counted outward from ${noteName(tonic)}.`;
  }

  let firstChord = true;
  function onChord({ chord }) {
    state.chord = chord;
    state.analysis = lydianAnalysis(chord);
    const tones = chordNotes(chord);
    $('tonic').textContent = noteName(state.analysis.tonic);
    $('tonic-spoken').textContent = spokenName(state.analysis.tonic);
    $('chord-name').textContent = `for ${chord.symbol} (${QUALITIES[chord.quality].label}: ${names(tones)})`;
    $('parent-name').textContent = `${noteName(state.analysis.tonic)} ${scaleById(state.analysis.parentScale).name}`;
    $('parent-notes').textContent = names(state.analysis.parentNotes);
    renderGravity();
    state.scaleId = state.analysis.parentScale;
    renderLadder(tones);
    selectScale(state.scaleId);
    app.events.dispatchEvent(new CustomEvent('tonic', { detail: state.analysis.tonic }));
    if (!firstChord) announce(`${chord.symbol}: Lydian tonic ${noteName(state.analysis.tonic)}, parent scale ${$('parent-name').textContent}.`);
    firstChord = false;
    if (app.transport.isPlaying()) restartIfPlaying();
  }

  const gate = createFlashGate();
  const pending = new Set();
  app.transport.onStep(({ midis, at }) => {
    const delay = Math.max(0, (at - app.engine.now()) * 1000);
    const id = setTimeout(() => {
      pending.delete(id);
      if (!midis.length || !gate()) return;
      midis.forEach((m) => keyboard.flash(m));
      const card = ladder.querySelector(`[data-scale="${state.scaleId}"]`);
      if (card && app.transport.current()?.kind === 'scale') {
        card.classList.remove('is-pulse');
        void card.offsetWidth;
        card.classList.add('is-pulse');
      }
    }, delay);
    pending.add(id);
  });
  app.transport.onPlay(showPlaying);
  app.transport.onStop(() => {
    pending.forEach(clearTimeout);
    pending.clear();
    keyboard.clearFlashes();
    showPlaying(null);
  });

  $('play-scale').addEventListener('click', playScale);
  $('drone').addEventListener('click', playDrone);
  $('chord-loop').addEventListener('click', playChordLoop);
  $('stop').addEventListener('click', () => app.transport.stop('user'));
  $('direction').addEventListener('change', () => { if (app.transport.current()?.kind === 'scale') playScale(); });
  $('hold-tonic').addEventListener('change', () => { if (app.transport.current()?.kind === 'scale') playScale(); });

  $('bpm').addEventListener('input', () => {
    state.bpm = Number($('bpm').value);
    $('bpm-out').textContent = String(state.bpm);
    app.transport.setBpm(state.bpm);
    app.transport.poke();
    // Keep the "now playing" line true without re-announcing every slider step.
    const kind = app.transport.current()?.kind;
    if (kind === 'scale') $('now-playing').textContent = `Playing: ${scaleRunLabel(state.bpm)}`;
    if (kind === 'chordLoop') $('now-playing').textContent = `Playing: ${chordLoopLabel(state.bpm)}`;
  });
  $('volume').value = String(volumePref());
  $('volume-out').textContent = $('volume').value;
  $('volume').addEventListener('input', () => {
    const v = Number($('volume').value);
    $('volume-out').textContent = String(v);
    app.engine.setVolume(v / 100);
    writePref('lce.volume', v);
    app.transport.poke();
  });
  document.getElementById('view-practice').addEventListener('pointerdown', () => app.transport.poke());
  document.getElementById('view-practice').addEventListener('keydown', () => app.transport.poke());

  mountChordInput({
    rootSelect: $('chord-root'),
    qualitySelect: $('chord-quality'),
    text: $('chord-text'),
    error: $('chord-error'),
    initial: initialText,
    onChord,
  });

  return { getTonic: () => state.analysis.tonic, getChord: () => state.chord };
}
