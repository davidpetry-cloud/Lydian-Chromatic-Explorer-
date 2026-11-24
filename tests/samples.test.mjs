// Recorded instruments: the shared sample loader and the upright bass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pickNearest, loadSamples } from '../public/js/audio/samples.js';
import { BASS_SAMPLES } from '../public/js/audio/bass.js';
import { createEngine } from '../public/js/audio/engine.js';

test('the bass is recorded on 14 notes from E1 to B3 (MIDI 28–59)', () => {
  assert.deepEqual(BASS_SAMPLES, [28, 30, 31, 34, 36, 38, 40, 42, 44, 45, 49, 52, 56, 59]);
  for (const m of BASS_SAMPLES) assert.ok(existsSync(new URL(`../public/audio/bass/${m}.mp3`, import.meta.url)), `${m}.mp3`);
});

test('pickNearest retunes the nearest recording', () => {
  assert.deepEqual(pickNearest(BASS_SAMPLES, 37), { sample: 36, rate: 2 ** (1 / 12) });
  assert.deepEqual(pickNearest(BASS_SAMPLES, 47), { sample: 45, rate: 2 ** (2 / 12) });
  assert.equal(pickNearest(BASS_SAMPLES, 20).sample, 28);
});

test('loadSamples fetches each key from the given folder on this site', async () => {
  const asked = [];
  const ctx = { decodeAudioData: async () => ({}) };
  const map = await loadSamples(ctx, { keys: [36, 40], base: 'audio/bass/', fetchFn: async (u) => { asked.push(u); return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }; } });
  assert.deepEqual(asked, ['audio/bass/36.mp3', 'audio/bass/40.mp3']);
  assert.equal(map.size, 2);
});

class FakeCtx {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createGain() { return { gain: { value: 1, setTargetAtTime() {} }, connect: (x) => x }; }
  createWaveShaper() { return { curve: null, connect: (x) => x }; }
}

test('the bass loads once, on its first use', async () => {
  let loads = 0;
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), loadBass: async () => { loads += 1; return new Map(); } });
  await engine.resume();
  assert.equal(loads, 0, 'not loaded until the bass is chosen');
  assert.equal(await engine.ensure('bass'), 'ready');
  assert.equal(await engine.ensure('bass'), 'ready');
  assert.equal(loads, 1);
  assert.equal(await engine.ensure('organ'), 'ready');
});

test('if the bass recordings fail, the bass falls back to the organ and says so once', async () => {
  const sounds = [];
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), loadBass: async () => { throw new Error('offline'); }, onSound: (s) => sounds.push(s) });
  await engine.resume();
  assert.equal(await engine.ensure('bass'), 'fallback');
  assert.equal(await engine.ensure('bass'), 'fallback');
  assert.equal(sounds.filter((s) => s === 'bass-fallback').length, 1);
});

test('the bass says it is loading, then ready or falling back', async () => {
  const seen = [];
  const ok = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), loadBass: async () => new Map(), onSound: (x) => seen.push(x) });
  await ok.resume();
  await ok.ensure('bass');
  assert.deepEqual(seen.filter((x) => x.startsWith('bass')), ['bass-loading', 'bass-ready']);
  seen.length = 0;
  const bad = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), loadBass: async () => { throw new Error('x'); }, onSound: (x) => seen.push(x) });
  await bad.resume();
  await bad.ensure('bass');
  assert.deepEqual(seen.filter((x) => x.startsWith('bass')), ['bass-loading', 'bass-fallback']);
});
