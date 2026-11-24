// The Practice view: the chord's Lydian tonic and parent scale, the ladder
// of seven principal scales (ingoing → outgoing), the keyboard, and the
// practice controls. Every sound is mirrored on screen and in text.
import { noteName, spokenName, pc, ascendingMidis, degreeLabel } from '../theory/notes.js';
import { scaleById, scaleNotes } from '../theory/scales.js';
import { modeFrom } from '../theory/modes.js';
import { gravityRank } from '../theory/gravity.js';
import { QUALITIES, chordNotes, lydianAnalysis } from '../theory/chords.js';
import { mountChordInput } from '../input/chord-input.js';
import { createKeyboard } from './keyboard.js';
import { mountVoicings } from './voicings.js';
import { createFlashGate } from './flash-gate.js';
import { writePref, volumePref, dronePref, describeLimit } from '../prefs.js';
import { resolveDrone } from '../audio/drone.js';
import { INSTRUMENTS, DRONE_SOUNDS, BASS_FALLBACK_WORDS, droneMidis as droneMidisFor } from '../audio/instruments.js';
import { parseNote } from '../theory/notes.js';

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

  const DRONE_WORDS = { bass: 'the bass note', tonic: 'the Lydian tonic', root: 'the chord root', other: 'your chosen note' };
  const droneChoice = () => ({ mode: $('drone-on').value, note: $('drone-other').value });
  const droneNote = () => resolveDrone(droneChoice(), state.chord, state.analysis.tonic);
  const droneMidis = () => droneMidisFor(app.droneSound, pc(droneNote()));
  const droneSoundWord = () => INSTRUMENTS[app.droneSound].name.toLowerCase();


  // The selected scale read from the chord root, when "Start on: Chord root" is chosen and the root is in it.
  function fromRoot() {
    if ($('start-on').value !== 'root') return null;
    return modeFrom(scaleNotes(state.analysis.tonic, state.scaleId), state.chord.root);
  }

  function scaleSteps() {
    const rooted = fromRoot();
    const up = ascendingMidis(rooted ? rooted.notes : scaleNotes(state.analysis.tonic, state.scaleId), 3); // octave 3: on the keyboard (C3–B4)
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

  // A chord change while playing is announced together with what plays next,
  // so one message can't overwrite the other.
  let pendingChordMessage = null;

  // The upright bass couldn't load: the drone plays a held organ instead, and says so.
  function organInstead(pattern) {
    const midis = droneMidisFor('organ', pc(droneNote()));
    const words = `, ${INSTRUMENTS.bass.name.toLowerCase()}`;
    return {
      ...pattern,
      droneSound: 'organ',
      ...(pattern.kind === 'drone' ? { steps: [midis] } : { drone: midis }),
      label: pattern.label.endsWith(words) ? `${pattern.label.slice(0, -words.length)}, ${BASS_FALLBACK_WORDS}` : `${pattern.label}; drone: ${BASS_FALLBACK_WORDS}`,
    };
  }

  async function start(pattern) {
    let outcome = 'ready';
    const ready = app.engine.resume()
      .then(() => app.engine.ensure(pattern.droneSound ?? 'piano'))
      .then((r) => { outcome = r; });
    if (!(await app.transport.whenReady(ready))) return;
    if (outcome === 'fallback') pattern = organInstead(pattern);
    app.engine.setVolume(Number($('volume').value) / 100);
    app.transport.play({ ...pattern, owner: 'practice' });
    announce(pendingChordMessage ? `${pendingChordMessage} Playing ${pattern.label}.` : pattern.label);
    pendingChordMessage = null;
  }

  function scaleRunLabel(bpm) {
    const rooted = fromRoot();
    const root = noteName(state.chord.root);
    const from = rooted ? ` from ${root}${rooted.name ? ` (${root} ${rooted.name})` : ''}` : '';
    return `${scaleLabel()}${from}, ${DIRECTION_WORD[$('direction').value]}, ${bpm} bpm`;
  }
  const chordLoopLabel = (bpm) => `${state.chord.symbol} chord loop, ${bpm} bpm`;

  function playScale() {
    const bpm = state.bpm;
    const label = scaleRunLabel(bpm);
    const held = $('hold-tonic').checked;
    start({ kind: 'scale', steps: scaleSteps(), bpm, loop: true, label, drone: held ? droneMidis() : null, droneSound: held ? app.droneSound : undefined });
  }

  function playDrone() {
    const label = `Drone on ${noteName(droneNote())}, ${DRONE_WORDS[droneChoice().mode]}, ${droneSoundWord()}`;
    start({ kind: 'drone', steps: [droneMidis()], bpm: state.bpm, loop: true, label, droneSound: app.droneSound });
  }

  function playChordLoop() {
    // The bass note sounds lowest (octave 2), the chord above it.
    const tones = [36 + pc(state.chord.bass), ...ascendingMidis(chordNotes(state.chord), 3).slice(0, -1)];
    const label = chordLoopLabel(state.bpm);
    // Struck once a bar and held, like a pianist comping on the downbeat.
    start({ kind: 'chordLoop', steps: [tones], durations: [4], bpm: state.bpm, loop: true, label });
  }

  // Practice only follows its own playback; a Learn example or a Gravity
  // drone keeps playing when the chord changes here.
  const ours = () => app.transport.current()?.owner === 'practice';

  function restartIfPlaying() {
    const current = app.transport.current();
    if (!current || current.owner !== 'practice') return;
    if (current.kind === 'scale') playScale();
    else if (current.kind === 'drone') playDrone();
    else if (current.kind === 'voicing' || current.kind === 'voicings') voicings.chordChanged();
    else playChordLoop();
  }

  async function playKey(midi) {
    if (!(await app.transport.whenReady(app.engine.resume(), 'key'))) return;
    app.transport.poke();
    app.engine.note(midi, app.engine.now() + 0.01, 0.6);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) keyboard.flash(midi, 600);
  }

  // "From C: C D E♭ F G A B♭ · C Dorian": the same notes, read from the chord root.
  function fromRootLine(notes) {
    const root = noteName(state.chord.root);
    const m = modeFrom(notes, state.chord.root);
    if (!m) return `From ${root}: ${root} isn't in this scale`;
    return `From ${root}: ${names(m.notes)}${m.name ? ` · ${root} ${m.name}` : ''}`;
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
        ['span', 'ladder-from', fromRootLine(row.notes)],
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
      btn.setAttribute('aria-describedby', `${ids[4]} ${ids[2]} ${ids[5]}`);
      // Picking a card only selects it. Sound starts from Play scale; if a scale
      // is already sounding, it switches to the new one.
      btn.addEventListener('click', () => {
        selectScale(row.scale.id);
        if (app.transport.current()?.kind === 'scale') playScale();
      });
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
    // Say so when the bass sits outside the parent scale (a pedal like D/C):
    // the app doesn't guess a different analysis for it.
    const inParent = state.analysis.parentNotes.some((n) => pc(n) === pc(chord.bass));
    $('bass-note').textContent = inParent ? ''
      : `The bass ${noteName(chord.bass)} isn't in ${$('parent-name').textContent}: it sounds as a pedal under this chord. Sources don't settle how Russell analyses that, so the parent shown is the chord's own.`;
    renderGravity();
    state.scaleId = state.analysis.parentScale;
    renderLadder(tones);
    selectScale(state.scaleId);
    voicings.refresh();
    app.events.dispatchEvent(new CustomEvent('tonic', { detail: state.analysis.tonic }));
    const message = `${chord.symbol}: Lydian tonic ${noteName(state.analysis.tonic)}, parent scale ${$('parent-name').textContent}.`;
    if (!firstChord && app.transport.isPlaying()) { pendingChordMessage = message; restartIfPlaying(); }
    else if (!firstChord) announce(message);
    firstChord = false;
  }

  const gate = createFlashGate();
  const pending = new Set();
  app.transport.onStep(({ midis, at }) => {
    if (!ours()) return;
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
  app.transport.onStop((reason) => {
    pending.forEach(clearTimeout);
    pending.clear();
    keyboard.clearFlashes();
    showPlaying(null);
    if (reason === 'limit') $('now-playing').textContent = `Faded out after ${describeLimit(app.transport.limit())}. Press play to go again.`;
  });

  $('play-scale').addEventListener('click', playScale);
  $('drone').addEventListener('click', playDrone);
  $('chord-loop').addEventListener('click', playChordLoop);
  $('stop').addEventListener('click', () => app.transport.stop('user'));
  $('direction').addEventListener('change', () => { if (app.transport.current()?.kind === 'scale') playScale(); });
  $('hold-tonic').addEventListener('change', () => { if (app.transport.current()?.kind === 'scale') playScale(); });
  for (const r of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) $('drone-other').add(new Option(noteName(parseNote(r)), r));
  const savedDrone = dronePref();
  $('drone-on').value = savedDrone.mode;
  $('drone-other').value = savedDrone.note;
  $('drone-other-field').hidden = savedDrone.mode !== 'other';
  function droneChanged() {
    voicings.refresh();
    $('drone-other-field').hidden = $('drone-on').value !== 'other';
    writePref('lce.drone', droneChoice());
    const kind = ours() ? app.transport.current().kind : null;
    if (kind === 'drone') playDrone();
    else if (kind === 'scale' && $('hold-tonic').checked) playScale();
  }
  $('drone-on').addEventListener('change', droneChanged);
  for (const id of DRONE_SOUNDS) $('drone-sound').add(new Option(INSTRUMENTS[id].name, id));
  $('drone-sound').value = app.droneSound;
  $('drone-sound').addEventListener('change', () => {
    if (!DRONE_SOUNDS.includes($('drone-sound').value)) return;
    app.droneSound = $('drone-sound').value;
    writePref('lce.droneSound', app.droneSound);
    const kind = ours() ? app.transport.current().kind : null;
    if (kind === 'drone') playDrone();
    else if (kind === 'scale' && $('hold-tonic').checked) playScale();
  });
  $('drone-other').addEventListener('change', droneChanged);
  $('start-on').addEventListener('change', () => { if (app.transport.current()?.kind === 'scale') playScale(); });

  $('bpm').addEventListener('input', () => {
    state.bpm = Number($('bpm').value);
    $('bpm-out').textContent = String(state.bpm);
    if (ours()) app.transport.setBpm(state.bpm);
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

  // The Voicings card: same chord, many voicings; the drone note is its centre.
  const voicings = mountVoicings({
    app,
    getChord: () => state.chord,
    getCentre: () => droneNote(),
    getBpm: () => state.bpm,
    start,
    droneFor: () => ($('hold-tonic').checked ? { drone: droneMidis(), droneSound: app.droneSound } : {}),
  });

  const chordInput = mountChordInput({
    rootSelect: $('chord-root'),
    qualitySelect: $('chord-quality'),
    text: $('chord-text'),
    error: $('chord-error'),
    initial: initialText,
    onChord,
  });

  return {
    getTonic: () => state.analysis.tonic,
    getChord: () => state.chord,
    setChord: (chord, source) => chordInput.setChord(chord, source),
  };
}
