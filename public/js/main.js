// Boots the app: theme toggle, view switching by URL hash, shared audio,
// the saved chord, and the three views.
import { mountThemeToggle } from './theme-toggle.js';
import { viewFromHash, VIEWS } from './router.js';
import { readPref } from './prefs.js';
import { parseChord } from './theory/chords.js';
import { createEngine } from './audio/engine.js';
import { createTransport } from './audio/transport.js';

const DEFAULT_CHORD = 'Cmaj7';

export const app = {
  engine: createEngine(),
  live: document.getElementById('live'),
  chord: null,
};
app.transport = createTransport(app.engine);

/** Says something to screen readers through the polite live region. */
export function announce(text) {
  app.live.textContent = '';
  // A fresh text node on the next frame makes repeat messages re-announce.
  requestAnimationFrame(() => { app.live.textContent = text; });
}

function initialChord() {
  const saved = readPref('lce.chord', DEFAULT_CHORD);
  const parsed = typeof saved === 'string' ? parseChord(saved) : { error: 'bad' };
  return parsed.error ? parseChord(DEFAULT_CHORD) : parsed;
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
app.chord = initialChord();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') app.transport.stop('hidden');
});
app.transport.onStop((reason) => {
  const why = { idle: ' after 20 quiet minutes', hidden: ' because the tab was hidden', done: '' }[reason] ?? '';
  announce(`Stopped${why}`);
});

showView(viewFromHash(location.hash), { focus: false });
window.addEventListener('hashchange', () => showView(viewFromHash(location.hash), { focus: true }));
