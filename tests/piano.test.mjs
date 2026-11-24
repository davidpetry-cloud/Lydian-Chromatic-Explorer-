// The sampled piano: which recording plays each key, and how it loads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { PIANO_SAMPLES, pickSample, loadPiano } from '../public/js/audio/piano.js';
import { createEngine } from '../public/js/audio/engine.js';

test('the piano is recorded every three semitones from C1 to C7', () => {
  assert.deepEqual(PIANO_SAMPLES, Array.from({ length: 25 }, (_, i) => 24 + 3 * i));
});

test('every recording is in public/audio/piano', () => {
  for (const m of PIANO_SAMPLES) {
    assert.ok(existsSync(new URL(`../public/audio/piano/${m}.mp3`, import.meta.url)), `${m}.mp3`);
  }
});

test('recordings up to D♯5 ring for 7.5 s or more, so a bar at 40 bpm (6 s) never drops out', () => {
  // The files are 96 kbps constant bit rate: 12,000 bytes per second.
  for (const m of PIANO_SAMPLES.filter((x) => x <= 75)) {
    const seconds = statSync(new URL(`../public/audio/piano/${m}.mp3`, import.meta.url)).size / 12000;
    assert.ok(seconds >= 7.5, `${m}.mp3 lasts ${seconds.toFixed(2)} s`);
  }
});

test('each key plays the nearest recording, retuned by at most a semitone', () => {
  assert.deepEqual(pickSample(60), { sample: 60, rate: 1 });
  assert.deepEqual(pickSample(62), { sample: 63, rate: 2 ** (-1 / 12) });
  assert.deepEqual(pickSample(61), { sample: 60, rate: 2 ** (1 / 12) });
  for (let m = 24; m <= 96; m++) {
    const { sample } = pickSample(m);
    assert.ok(Math.abs(sample - m) <= 1, `${m} → ${sample}`);
  }
});

test('keys beyond the recorded range use the end recordings', () => {
  assert.equal(pickSample(21).sample, 24);
  assert.equal(pickSample(108).sample, 96);
});

test('loadPiano fetches every recording from this site and decodes it', async () => {
  const asked = [];
  const ctx = { decodeAudioData: async (buf) => ({ decoded: buf.byteLength }) };
  const fetchFn = async (url) => { asked.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }; };
  const map = await loadPiano(ctx, { fetchFn });
  assert.equal(map.size, 25);
  assert.equal(asked[0], 'audio/piano/24.mp3');
  assert.ok(asked.every((u) => /^audio\/piano\/\d+\.mp3$/.test(u)), 'same-origin, relative paths only');
});

test('loadPiano fails if any recording is missing', async () => {
  const ctx = { decodeAudioData: async () => ({}) };
  const fetchFn = async (url) => ({ ok: !url.includes('60'), arrayBuffer: async () => new ArrayBuffer(4) });
  await assert.rejects(loadPiano(ctx, { fetchFn }));
});

class FakeCtx {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createGain() { return { gain: { value: 1, setTargetAtTime() {} }, connect: (x) => x }; }
  createWaveShaper() { return { curve: null, connect: (x) => x }; }
}

test('the engine uses the piano once it has loaded', async () => {
  const sounds = [];
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), onSound: (s) => sounds.push(s) });
  assert.equal(engine.sound(), 'off');
  await engine.resume();
  assert.equal(engine.sound(), 'piano');
  assert.deepEqual(sounds, ['loading', 'piano']);
});

test('the engine falls back to the electric piano if the recordings fail to load', async () => {
  const sounds = [];
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: async () => { throw new Error('offline'); }, onSound: (s) => sounds.push(s) });
  await engine.resume();
  assert.equal(engine.sound(), 'electric');
  assert.deepEqual(sounds, ['loading', 'electric']);
  await engine.resume(); // loads only once
  assert.deepEqual(sounds, ['loading', 'electric']);
});

test('a load that never finishes falls back after the timeout', async () => {
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: () => new Promise(() => {}), loadTimeout: 0.05 });
  await engine.resume();
  assert.equal(engine.sound(), 'electric');
});

test('a slow load that arrives after the fallback still switches to the piano', async () => {
  let arrive;
  const sounds = [];
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: () => new Promise((r) => { arrive = r; }), loadTimeout: 0.05, onSound: (s) => sounds.push(s) });
  await engine.resume();
  assert.equal(engine.sound(), 'electric');
  arrive(new Map());
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(engine.sound(), 'piano');
  assert.deepEqual(sounds, ['loading', 'electric', 'piano']);
});

test('a second press while still loading says so again', async () => {
  let arrive;
  const sounds = [];
  const engine = createEngine({ AudioContextCtor: FakeCtx, loadSamples: () => new Promise((r) => { arrive = r; }), onSound: (s) => sounds.push(s) });
  const first = engine.resume();
  const second = engine.resume();
  assert.deepEqual(sounds, ['loading', 'loading']);
  arrive(new Map());
  await Promise.all([first, second]);
  assert.deepEqual(sounds, ['loading', 'loading', 'piano']);
});

test('a bass that failed to load is tried again in the background, without holding up the press', async () => {
  let tries = 0;
  let arrive;
  const engine = createEngine({
    AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), bassRetryAfter: 0,
    loadBass: () => { tries += 1; if (tries === 1) return Promise.reject(new Error('offline')); return new Promise((r) => { arrive = r; }); },
  });
  await engine.resume();
  assert.equal(await engine.ensure('bass'), 'fallback');
  const t0 = Date.now();
  assert.equal(await engine.ensure('bass'), 'fallback', 'the press plays the organ at once while the retry runs');
  assert.ok(Date.now() - t0 < 50, 'no wait for the retry');
  assert.equal(await engine.ensure('bass'), 'fallback', 'a press during the retry starts no second one');
  assert.equal(tries, 2);
  arrive(new Map());
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(await engine.ensure('bass'), 'ready', 'the next press after the retry gets the bass');
});

test('a failed bass is not retried before the wait is over', async () => {
  let tries = 0;
  const engine = createEngine({
    AudioContextCtor: FakeCtx, loadSamples: async () => new Map(), bassRetryAfter: 60,
    loadBass: async () => { tries += 1; throw new Error('offline'); },
  });
  await engine.resume();
  assert.equal(await engine.ensure('bass'), 'fallback');
  assert.equal(await engine.ensure('bass'), 'fallback');
  assert.equal(tries, 1, 'no second try for a press soon after');
});
