import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPref, writePref } from '../public/js/prefs.js';
import { viewFromHash } from '../public/js/router.js';
import { stepTimes, createTransport } from '../public/js/audio/transport.js';

function withStorage(storage, fn) {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => storage });
  try { return fn(); } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage;
  }
}

test('prefs fall back when storage throws', () => {
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  withStorage(throwing, () => {
    assert.equal(readPref('lce.chord', 'Cmaj7'), 'Cmaj7');
    assert.equal(writePref('lce.chord', 'G7'), false);
  });
});

test('prefs fall back on corrupt values', () => {
  withStorage({ getItem: () => 'zzz', setItem() {} }, () => {
    assert.equal(readPref('lce.chord', 'Cmaj7'), 'Cmaj7');
  });
});

test('prefs round-trip JSON', () => {
  const box = {};
  withStorage({ getItem: (k) => box[k] ?? null, setItem: (k, v) => { box[k] = v; } }, () => {
    assert.equal(writePref('lce.volume', 0.5), true);
    assert.equal(readPref('lce.volume', 1), 0.5);
    assert.equal(readPref('lce.theme', 'dark'), 'dark');
  });
});

test('router maps hashes to views, case-insensitively', () => {
  assert.equal(viewFromHash('#Reference'), 'reference');
  assert.equal(viewFromHash('#gravity'), 'gravity');
  assert.equal(viewFromHash('#nope'), 'practice');
  assert.equal(viewFromHash(''), 'practice');
});

test('stepTimes spaces steps by the beat', () => {
  assert.deepEqual(stepTimes(0, 120, 4), [0, 0.5, 1, 1.5]);
});

function fakes() {
  const clock = { t: 0 };
  const timers = [];
  const engine = {
    notes: [], stops: 0, drones: 0,
    now: () => clock.t,
    resume: async () => {},
    note(midi, at, dur) { this.notes.push({ midi, at, dur }); },
    drone() { this.drones += 1; return () => { this.drones -= 1; }; },
    stopAll() { this.stops += 1; },
  };
  const opts = {
    setTimer: (fn) => { timers.push(fn); return timers.length; },
    clearTimer: (id) => { timers[id - 1] = null; },
  };
  const tick = () => timers.forEach((fn) => fn && fn());
  return { clock, engine, opts, tick, live: () => timers.filter(Boolean).length };
}

const pattern = (midi, extra = {}) => ({ kind: 'scale', steps: [[midi], [midi + 2], [midi + 4]], bpm: 120, loop: false, label: `p${midi}`, ...extra });

test('play replaces the current pattern instead of stacking', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(pattern(60));
  f.tick();
  const stopsBefore = f.engine.stops;
  t.play(pattern(70, { loop: true }));
  assert.equal(f.engine.stops, stopsBefore + 1);
  assert.equal(f.live(), 1);
  f.engine.notes.length = 0;
  f.clock.t = 2;
  f.tick();
  assert.ok(f.engine.notes.length > 0);
  assert.ok(f.engine.notes.every((n) => n.midi >= 70));
  assert.equal(t.isPlaying(), true);
});

test('stop silences everything and reports it', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  t.play(pattern(60, { loop: true }));
  t.stop();
  assert.equal(t.isPlaying(), false);
  assert.equal(f.live(), 0);
  assert.deepEqual(reasons, ['user']);
});

test('a looping pattern stops itself after 20 idle minutes', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  t.play(pattern(60, { loop: true }));
  f.clock.t = 19 * 60; f.tick();
  t.poke();
  f.clock.t = 38 * 60; f.tick();
  assert.equal(t.isPlaying(), true);
  f.clock.t = 39 * 60 + 1; f.tick();
  assert.equal(t.isPlaying(), false);
  assert.deepEqual(reasons, ['idle']);
});

test('a one-shot run ends on its own', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  t.play(pattern(60));
  f.tick();
  f.clock.t = 5; f.tick();
  assert.deepEqual(reasons, ['done']);
});

test('steps are announced to listeners with their time', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const seen = [];
  t.onStep((s) => seen.push(s.index));
  t.play(pattern(60));
  f.tick();
  assert.deepEqual(seen.slice(0, 1), [0]);
});

test('a drone holds until stopped', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play({ kind: 'drone', steps: [[48, 55]], bpm: 80, loop: true, label: 'drone' });
  assert.equal(f.engine.drones, 1);
  t.stop();
  assert.equal(f.engine.drones, 0);
});

test('a scale run can hold a drone underneath, stopped with it', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(pattern(60, { loop: true, drone: [48, 55] }));
  assert.equal(f.engine.drones, 1);
  t.play(pattern(62, { loop: true }));
  assert.equal(f.engine.drones, 0);
});

test('volumePref reads the saved volume, clamped, defaulting to 70', async () => {
  const { volumePref } = await import('../public/js/prefs.js');
  const box = {};
  withStorage({ getItem: (k) => box[k] ?? null, setItem: (k, v) => { box[k] = v; } }, () => {
    assert.equal(volumePref(), 70);
    box['lce.volume'] = '0';
    assert.equal(volumePref(), 0);
    box['lce.volume'] = '250';
    assert.equal(volumePref(), 100);
    box['lce.volume'] = '"loud"';
    assert.equal(volumePref(), 70);
  });
});

test('the engine starts at the volume it is given', async () => {
  const { createEngine } = await import('../public/js/audio/engine.js');
  const gains = [];
  class FakeCtx {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { const g = { gain: { value: 1, setTargetAtTime() {} }, connect: (x) => x }; gains.push(g); return g; }
  }
  const engine = createEngine({ AudioContextCtor: FakeCtx, volume: 0 });
  await engine.resume();
  assert.equal(gains[0].gain.value, 0);
});

test('only view names in the hash switch views', async () => {
  const { isViewHash } = await import('../public/js/router.js');
  assert.equal(isViewHash('#gravity'), true);
  assert.equal(isViewHash('#Reference'), true);
  assert.equal(isViewHash('#main'), false);
  assert.equal(isViewHash(''), false);
});

test('transport tells listeners when a pattern starts', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const started = [];
  t.onPlay((p) => started.push(p.label));
  t.play(pattern(60, { loop: true }));
  assert.deepEqual(started, ['p60']);
});

test('Stop cuts ringing notes even when no pattern is playing', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  t.stop();
  assert.equal(f.engine.stops, 1);
  assert.deepEqual(reasons, []);
});

test('the flash gate allows at most one flash per interval', async () => {
  const { createFlashGate } = await import('../public/js/views/flash-gate.js');
  let now = 0;
  const gate = createFlashGate({ minMs: 334, now: () => now });
  const allowed = [];
  for (let t = 0; t <= 1000; t += 100) { now = t; if (gate()) allowed.push(t); }
  assert.deepEqual(allowed, [0, 400, 800]);
});

test('the flash gate stays shut when motion is reduced', async () => {
  const { createFlashGate } = await import('../public/js/views/flash-gate.js');
  const gate = createFlashGate({ minMs: 334, now: () => 0, reducedMotion: () => true });
  assert.equal(gate(), false);
});

test('resolveDrone picks the note for each drone mode', async () => {
  const { resolveDrone } = await import('../public/js/audio/drone.js');
  const { parseChord } = await import('../public/js/theory/chords.js');
  const { noteName, parseNote } = await import('../public/js/theory/notes.js');
  const c = parseChord('Cm7/G');
  const tonic = parseNote('Eb');
  assert.equal(noteName(resolveDrone({ mode: 'bass' }, c, tonic)), 'G');
  assert.equal(noteName(resolveDrone({ mode: 'tonic' }, c, tonic)), 'E♭');
  assert.equal(noteName(resolveDrone({ mode: 'root' }, c, tonic)), 'C');
  assert.equal(noteName(resolveDrone({ mode: 'other', note: 'D' }, c, tonic)), 'D');
  assert.equal(noteName(resolveDrone({ mode: 'other', note: 'zz' }, c, tonic)), 'G');
});

test('dronePref defaults to the bass note and ignores junk', async () => {
  const { dronePref } = await import('../public/js/prefs.js');
  const box = {};
  withStorage({ getItem: (k) => box[k] ?? null, setItem: (k, v) => { box[k] = v; } }, () => {
    assert.deepEqual(dronePref(), { mode: 'bass', note: 'C' });
    box['lce.drone'] = '"zzz"';
    assert.deepEqual(dronePref(), { mode: 'bass', note: 'C' });
    box['lce.drone'] = JSON.stringify({ mode: 'sideways', note: 'D' });
    assert.deepEqual(dronePref(), { mode: 'bass', note: 'C' });
    box['lce.drone'] = JSON.stringify({ mode: 'other', note: 'F#' });
    assert.deepEqual(dronePref(), { mode: 'other', note: 'F#' });
  });
});

test('a pattern can hold a step for several beats', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play({ kind: 'progression', steps: [[48, 60]], durations: [4], bpm: 120, loop: false, label: 'held' });
  f.tick();
  assert.ok(f.engine.notes.length >= 2);
  assert.ok(f.engine.notes.every((n) => n.dur === 2), JSON.stringify(f.engine.notes));
});
