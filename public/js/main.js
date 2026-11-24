// Boots the app: theme toggle, view switching by URL hash, shared audio,
// the saved chord, and the three views.
import { mountThemeToggle } from './theme-toggle.js';
import { viewFromHash, isViewHash, VIEWS } from './router.js';
import { readPref, volumePref, stopAfterPref, writePref, describeLimit, STOP_AFTER_CHOICES } from './prefs.js';
import { parseChord } from './theory/chords.js';
import { createEngine } from './audio/engine.js';
import { createTransport } from './audio/transport.js';
import { mountPractice } from './views/practice.js';
import { mountGravity } from './views/gravity.js';
import { mountReference } from './views/reference.js';
import { mountMidiPanel } from './views/midi-panel.js';
import { mountLearn } from './views/learn.js';

const DEFAULT_CHORD = 'Cmaj7';

// While the piano recordings load (once, on the first press), every
// "now playing" line says so; each line gets its own text back afterwards.
const waiting = new Map();
function soundChanged(sound) {
  if (sound === 'loading') {
    for (const el of document.querySelectorAll('.now-playing')) {
      waiting.set(el, el.textContent);
      el.textContent = 'Loading the piano…';
    }
    announce('Loading the piano');
    return;
  }
  for (const [el, text] of waiting) if (el.textContent === 'Loading the piano…') el.textContent = text;
  waiting.clear();
  if (sound === 'electric') announce("The piano recordings didn't load, so you're hearing the built-in electric piano instead.");
}

export const app = {
  engine: createEngine({ volume: volumePref() / 100, onSound: soundChanged }),
  live: document.getElementById('live'),
  events: new EventTarget(),
};
app.transport = createTransport(app.engine, { limit: stopAfterPref() });

// "Stop after" appears in Practice and Gravity; both show one shared setting.
const stopAfter = [...document.querySelectorAll('.stop-after')];
for (const select of stopAfter) {
  select.value = String(stopAfterPref());
  select.addEventListener('change', () => {
    const seconds = Number(select.value);
    if (!STOP_AFTER_CHOICES.includes(seconds)) return;
    app.transport.setLimit(seconds);
    writePref('lce.stopAfter', seconds);
    for (const other of stopAfter) other.value = select.value;
  });
}

/** Says something to screen readers through the polite live region. */
export function announce(text) {
  app.live.textContent = '';
  // A fresh text node on the next frame makes repeat messages re-announce.
  requestAnimationFrame(() => { app.live.textContent = text; });
}

function initialChord() {
  const saved = readPref('lce.chord', DEFAULT_CHORD);
  const parsed = typeof saved === 'string' ? parseChord(saved) : { error: 'bad' };
  return parsed.error
    ? { text: DEFAULT_CHORD, chord: parseChord(DEFAULT_CHORD) }
    : { text: saved.trim(), chord: parsed };
}

function showView(name, { focus }) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== name;
    const tab = document.getElementById(`tab-${v}`);
    if (v === name) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  if (focus) document.getElementById(`h-${name}`).focus();
}

mountThemeToggle(document.getElementById('themeToggle'));
mountReference();
mountLearn({ app, announce });
app.gravity = mountGravity({ app, announce });
app.practice = mountPractice({ app, announce, initialText: initialChord() });
mountMidiPanel({ setChord: app.practice.setChord, announce, onActivity: () => app.transport.poke() });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') app.transport.stop('hidden');
});
app.transport.onStop((reason) => {
  if (reason === 'limit') { announce(`Faded out after ${describeLimit(app.transport.limit())}`); return; }
  const why = { idle: ' after 20 quiet minutes', hidden: ' because the tab was hidden', done: '' }[reason] ?? '';
  announce(`Stopped${why}`);
});

showView(viewFromHash(location.hash), { focus: false });
window.addEventListener('hashchange', () => {
  if (isViewHash(location.hash)) showView(viewFromHash(location.hash), { focus: true });
});
// The skip link moves focus to the content without touching the URL or the view.
document.getElementById('skip').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('main').focus();
});
