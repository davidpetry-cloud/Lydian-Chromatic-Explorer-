import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY } from '../public/js/data/glossary.js';
import { SOURCES } from '../public/js/data/sources.js';
import { PRINCIPAL_SCALES } from '../public/js/theory/scales.js';

const sentences = (text) => text.match(/[^.!?]+[.!?]+/g) ?? [];

test('glossary has 15 to 25 entries with unique ids', () => {
  assert.ok(GLOSSARY.length >= 15 && GLOSSARY.length <= 25, String(GLOSSARY.length));
  assert.equal(new Set(GLOSSARY.map((g) => g.id)).size, GLOSSARY.length);
});

test('required entries are present', () => {
  const ids = new Set(GLOSSARY.map((g) => g.id));
  const required = ['lydian-tonic', 'tonal-gravity', 'parent-scale', 'ingoing-outgoing', 'vertical-horizontal', 'lydian-chromatic-scale', 'sources-differ', ...PRINCIPAL_SCALES.map((s) => s.id)];
  for (const id of required) assert.ok(ids.has(id), id);
});

test('each entry is two to four sentences and cites a known source', () => {
  const known = new Set(SOURCES.map((s) => s.id));
  for (const g of GLOSSARY) {
    const n = sentences(g.body).length;
    assert.ok(n >= 2 && n <= 4, `${g.id}: ${n} sentences`);
    assert.ok(g.sources.length >= 1, g.id);
    for (const s of g.sources) assert.ok(known.has(s), `${g.id}: ${s}`);
    assert.ok([null, 'practice', 'gravity'].includes(g.see), g.id);
  }
});
