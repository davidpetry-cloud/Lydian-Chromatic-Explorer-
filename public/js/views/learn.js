// The Learn tab: renders the sections in data/learn.js. Each example is voiced
// with nearest-voice leading and played through the shared transport, with the
// chord that's sounding marked in the list (aria-current plus a ring).
import { LEARN } from '../data/learn.js';
import { SOURCES } from '../data/sources.js';
import { parseChord } from '../theory/chords.js';
import { voiceProgression } from '../theory/voicing.js';

const TRADITION = { russell: 'Russell’s idea', classical: 'Classical voice leading', both: 'Both views' };
const VIEW_NAMES = { practice: 'Practice', gravity: 'Gravity' };

const make = (tag, { cls, text, attrs } = {}) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, v);
  return node;
};

export function mountLearn({ app, announce }) {
  const root = document.getElementById('learn-root');
  let active = null; // { id, items, now }

  function clearActive() {
    if (!active) return;
    active.items.forEach((li) => li.removeAttribute('aria-current'));
    active.now.textContent = 'Silent.';
    active = null;
  }

  for (const s of LEARN) {
    const card = make('section', { cls: 'card learn-section', attrs: { id: `learn-${s.id}`, 'aria-labelledby': `learn-h-${s.id}` } });
    card.append(make('h2', { text: s.title, attrs: { id: `learn-h-${s.id}` } }));
    card.append(make('p', { cls: `learn-tradition is-${s.tradition}`, text: TRADITION[s.tradition] }));
    for (const p of s.paragraphs) card.append(make('p', { text: p }));

    if (s.ideas.length) {
      const ul = make('ul', { cls: 'learn-ideas', attrs: { 'aria-label': 'Ideas to try' } });
      for (const idea of s.ideas) {
        const li = make('li');
        li.append(make('strong', { text: 'Idea: ' }), document.createTextNode(idea));
        ul.append(li);
      }
      card.append(ul);
    }

    if (s.example) {
      const ex = make('div', { cls: 'learn-example' });
      ex.append(make('h3', { text: `Listen: ${s.example.label}` }));
      ex.append(make('p', { cls: 'hint', text: s.example.description }));
      const list = make('ol', { cls: 'learn-chords', attrs: { 'aria-label': 'Chords in this example' } });
      const chords = s.example.chords.map(({ symbol, beats }) => {
        const chord = parseChord(symbol);
        list.append(make('li', { text: `${chord.symbol} · ${beats} beats` }));
        return { chord, beats };
      });
      const items = [...list.children];
      const row = make('div', { cls: 'control-row' });
      // The ▶ and ■ symbols are decoration; screen readers hear just the words.
      const button = (cls, symbol, words) => {
        const b = make('button', { cls, attrs: { type: 'button' } });
        b.append(make('span', { text: symbol, attrs: { 'aria-hidden': 'true' } }), document.createTextNode(` ${words}`));
        return b;
      };
      const play = button('btn btn-primary learn-play', '▶', 'Play example');
      const stop = button('btn learn-stop', '■', 'Stop');
      const now = make('p', { cls: 'now-playing learn-now', text: 'Silent.', attrs: { 'aria-hidden': 'true' } });
      row.append(play, stop);
      ex.append(list, row, now);
      card.append(ex);

      play.addEventListener('click', async () => {
        if (!(await app.transport.whenReady(app.engine.resume()))) return;
        const voices = voiceProgression(chords.map((c) => c.chord));
        const label = `${s.example.label}: ${chords.map((c) => c.chord.symbol).join(', ')}`;
        // Mark this example active before playing: the first step fires at once.
        clearActive();
        active = { id: s.id, items, now, label };
        app.transport.play({
          kind: 'progression', owner: 'learn', loop: false, bpm: s.example.bpm, label,
          steps: voices.map((v) => [v.bass, ...v.upper]),
          durations: chords.map((c) => c.beats),
        });
        if (!items[0].hasAttribute('aria-current')) now.textContent = `Playing: ${label}`;
        announce(`Playing ${label}`);
      });
      stop.addEventListener('click', () => app.transport.stop('user'));
    }

    const foot = make('p', { cls: 'learn-foot hint' });
    if (s.try) {
      foot.append(make('a', { text: `Try it in ${VIEW_NAMES[s.try]}`, attrs: { href: `#${s.try}` } }), document.createTextNode(' · '));
    }
    foot.append(document.createTextNode(`Sources: ${s.sources.map((id) => `[${SOURCES.findIndex((x) => x.id === id) + 1}]`).join(' ')} (see Reference)`));
    card.append(foot);
    root.append(card);
  }

  app.transport.onStep(({ index, at }) => {
    if (!active || app.transport.current()?.label !== active.label) return;
    const run = active;
    setTimeout(() => {
      if (active !== run) return;
      run.items.forEach((li, i) => (i === index ? li.setAttribute('aria-current', 'true') : li.removeAttribute('aria-current')));
      run.now.textContent = `Playing: ${run.items[index].textContent}`;
    }, Math.max(0, (at - app.engine.now()) * 1000));
  });
  app.transport.onPlay((p) => { if (active && p.label !== active.label) clearActive(); });
  app.transport.onStop(clearActive);
}
