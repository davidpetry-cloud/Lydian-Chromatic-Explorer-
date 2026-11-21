// The Reference view: a glossary and chord table filtered by one search box,
// the chords still waiting on sources, and the source list.
import { GLOSSARY } from '../data/glossary.js';
import { SOURCES } from '../data/sources.js';
import { QUALITIES, SUPPORTED_QUALITIES, parseChord, lydianAnalysis } from '../theory/chords.js';
import { scaleById } from '../theory/scales.js';
import { noteName, degreeLabel } from '../theory/notes.js';

const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const TONIC_WORDS = { 1: 'the root', b3: 'a minor third above the root', b7: 'a whole step below the root' };
const VIEW_NAMES = { practice: 'Practice', gravity: 'Gravity' };

const make = (tag, { cls, text, attrs } = {}) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, v);
  return node;
};

export function mountReference() {
  const search = document.getElementById('ref-search');
  const count = document.getElementById('ref-count');
  const glossary = document.getElementById('glossary');
  const tbody = document.querySelector('#chord-table tbody');

  const entries = GLOSSARY.map((g) => {
    const article = make('article', { cls: 'gloss', attrs: { id: `term-${g.id}` } });
    article.append(make('h3', { text: g.term }));
    if (g.aka.length) article.append(make('p', { cls: 'gloss-aka', text: `Also: ${g.aka.join(', ')}` }));
    article.append(make('p', { text: g.body }));
    const foot = make('p', { cls: 'gloss-foot' });
    if (g.see) {
      const link = make('a', { text: `See it in ${VIEW_NAMES[g.see]}`, attrs: { href: `#${g.see}` } });
      foot.append(link, document.createTextNode(' · '));
    }
    foot.append(document.createTextNode(`Sources: ${g.sources.map((id) => SOURCES.findIndex((s) => s.id === id) + 1).map((n) => `[${n}]`).join(' ')}`));
    article.append(foot);
    glossary.append(article);
    return { node: article, haystack: fold([g.term, ...g.aka, g.body].join(' ')) };
  });

  const rows = SUPPORTED_QUALITIES.map((id) => {
    const q = QUALITIES[id];
    const chord = parseChord(`C${q.aliases[0]}`);
    const a = lydianAnalysis(chord);
    const tr = make('tr');
    const tonicWords = TONIC_WORDS[q.tonicDegree] ?? degreeLabel(q.tonicDegree);
    for (const text of [q.label, chord.symbol, `${noteName(a.tonic)} (${tonicWords})`, scaleById(q.parentScale).name]) tr.append(make('td', { text }));
    tbody.append(tr);
    return { node: tr, haystack: fold([q.label, chord.symbol, ...q.aliases, scaleById(q.parentScale).name, 'chord'].join(' ')) };
  });

  const pending = document.getElementById('pending-list');
  for (const q of Object.values(QUALITIES).filter((x) => x.status !== 'verified')) {
    pending.append(make('li', { text: `${q.label} (${q.aliases.filter(Boolean)[0]})` }));
  }

  const sourcesList = document.getElementById('sources-list');
  for (const s of SOURCES) {
    const li = make('li', { text: `${s.citation} ` });
    if (s.url) li.append(make('a', { text: new URL(s.url).hostname.replace(/^www\./, ''), attrs: { href: s.url, rel: 'noopener noreferrer' } }));
    if (s.kind === 'primary') li.classList.add('is-primary');
    sourcesList.append(li);
  }

  function filter() {
    const q = fold(search.value.trim());
    let shown = 0;
    for (const item of [...entries, ...rows]) {
      const hit = !q || item.haystack.includes(q);
      item.node.hidden = !hit;
      if (hit && item.node.tagName === 'ARTICLE') shown += 1;
    }
    const chordsShown = rows.filter((r) => !r.node.hidden).length;
    count.textContent = q
      ? `${shown} glossary ${shown === 1 ? 'entry' : 'entries'} and ${chordsShown} ${chordsShown === 1 ? 'chord' : 'chords'} match “${search.value.trim()}”.`
      : `${entries.length} glossary entries and ${rows.length} chords.`;
  }

  search.addEventListener('input', filter);
  filter();
}
