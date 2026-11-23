import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEARN } from '../public/js/data/learn.js';
import { SOURCES } from '../public/js/data/sources.js';
import { parseChord } from '../public/js/theory/chords.js';

const ids = ['home-away', 'ingoing-outgoing', 'vertical', 'horizontal', 'voice-leading-bass', 'two-views'];
const known = new Set(SOURCES.map((s) => s.id));

test('six sections, in order', () => {
  assert.deepEqual(LEARN.map((s) => s.id), ids);
});

test('every section names its tradition and cites two or more known sources', () => {
  for (const s of LEARN) {
    assert.ok(['russell', 'classical', 'both'].includes(s.tradition), s.id);
    assert.ok(s.sources.length >= 2, s.id);
    for (const id of s.sources) assert.ok(known.has(id), `${s.id}: ${id}`);
    assert.ok(s.paragraphs.length >= 1, s.id);
  }
});

test('every example chord is a chord the app supports', () => {
  for (const s of LEARN) {
    if (!s.example) continue;
    assert.ok(s.example.description.length > 20, s.id);
    for (const { symbol, beats } of s.example.chords) {
      const c = parseChord(symbol);
      assert.ok(!c.error, `${s.id}: ${symbol}: ${c.error}`);
      assert.ok(beats > 0, `${s.id}: ${symbol}`);
    }
  }
});

test('ingoing/outgoing has at least four practice ideas', () => {
  assert.ok(LEARN.find((s) => s.id === 'ingoing-outgoing').ideas.length >= 4);
});

test('voice leading covers harmonic rhythm, inversions and pedal points', () => {
  const text = LEARN.find((s) => s.id === 'voice-leading-bass').paragraphs.join(' ').toLowerCase();
  for (const word of ['harmonic rhythm', 'inversion', 'pedal']) assert.ok(text.includes(word), word);
});
