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
    notes: [], stops: 0, fades: [],
    now: () => clock.t,
    resume: async () => {},
    note(midi, at, dur, opts) { this.notes.push({ midi, at, dur, ...opts }); },
    holds: [], released: 0,
    hold(midis, at, opts) { this.holds.push({ midis, at, ...opts }); return () => { this.released += 1; }; },
    stopAll(fade) { this.stops += 1; this.fades.push(fade); },
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

test('a drone is struck again each bar until stopped', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play({ kind: 'drone', steps: [[48, 55]], bpm: 60, loop: true, label: 'drone' });
  f.tick();
  assert.deepEqual(f.engine.notes.map((n) => n.midi), [48, 55]);
  assert.equal(f.engine.notes[0].dur, 4, 'held for the whole bar');
  f.clock.t = 4; f.tick();
  assert.deepEqual(f.engine.notes.map((n) => n.midi), [48, 55, 48, 55]);
  assert.ok(Math.abs(f.engine.notes[2].at - f.engine.notes[0].at - 4) < 1e-9, 'one bar later');
  t.stop();
  f.clock.t = 8; f.tick();
  assert.equal(f.engine.notes.length, 4);
});

test('a scale run can hold a drone underneath, struck on each bar and stopped with it', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(pattern(60, { loop: true, drone: [48, 55] }));
  f.tick();
  const drone = f.engine.notes.filter((n) => n.midi < 60);
  assert.deepEqual(drone.map((n) => n.midi), [48, 55]);
  assert.ok(drone[0].gain < 0.18, 'the drone sits under the scale');
  t.play(pattern(62, { loop: true }));
  f.engine.notes.length = 0;
  f.clock.t = 10; f.tick();
  assert.ok(f.engine.notes.every((n) => n.midi >= 62), 'no drone after switching');
});

test('an organ drone is held as one voice, not re-struck, and released on Stop', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play({ kind: 'drone', steps: [[48, 55]], bpm: 60, loop: true, label: 'd', droneSound: 'organ' });
  for (const at of [2, 4, 6, 8, 10]) { f.clock.t = at; f.tick(); }
  assert.equal(f.engine.holds.length, 1);
  assert.deepEqual(f.engine.holds[0].midis, [48, 55]);
  assert.equal(f.engine.holds[0].instrument, 'organ');
  assert.equal(f.engine.notes.length, 0);
  t.stop('user');
  assert.equal(f.engine.released, 1);
});

test('a held pad under a scale run is released by a hidden tab and by the idle stop', () => {
  for (const reason of ['hidden', 'idle']) {
    const f = fakes();
    const t = createTransport(f.engine, f.opts);
    t.play(pattern(60, { loop: true, drone: [48, 55], droneSound: 'pad' }));
    assert.equal(f.engine.holds.length, 1);
    if (reason === 'hidden') t.stop('hidden');
    else { f.clock.t = 21 * 60; f.tick(); }
    assert.equal(t.isPlaying(), false, reason);
    assert.equal(f.engine.released, 1, reason);
  }
});

test('an upright-bass drone is plucked every 2 beats', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play({ kind: 'drone', steps: [[36]], bpm: 60, loop: true, label: 'd', droneSound: 'bass' });
  f.clock.t = 5; f.tick();
  const at = f.engine.notes.map((n) => n.at);
  assert.ok(at.length >= 3);
  assert.ok(at.slice(1).every((x, i) => Math.abs(x - at[i] - 2) < 1e-9), JSON.stringify(at));
  assert.equal(f.engine.notes[0].instrument, 'bass');
  assert.equal(f.engine.notes[0].dur, 2);
});

const lead = (extra) => ({ kind: 'lead', steps: [[38, 60], [39, 61]], durations: [4, 4], bpm: 60, loop: true, label: 'l', ...extra });

test('a held organ drone changes with each chord of a lead, and Stop releases the last one', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(lead({ stepDrones: [[43, 50], [44, 51]], droneSound: 'organ' }));
  f.tick();
  assert.equal(f.engine.holds.length, 1);
  assert.deepEqual(f.engine.holds[0].midis, [43, 50]);
  f.clock.t = 4.0; f.tick(); // the second chord, due at 4.05, is scheduled
  assert.equal(f.engine.holds.length, 2);
  assert.deepEqual(f.engine.holds[1].midis, [44, 51]);
  assert.ok(Math.abs(f.engine.holds[1].at - 4.05) < 1e-9);
  assert.equal(f.engine.released, 1, 'the first drone lets go as the second begins');
  t.stop('user');
  assert.equal(f.engine.released, f.engine.holds.length);
});

test('a piano drone in a lead is struck with each chord on its own notes', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(lead({ stepDrones: [[43, 50], [44, 51]], droneSound: 'piano' }));
  f.clock.t = 4.0; f.tick();
  const drone = f.engine.notes.filter((n) => [43, 44, 50, 51].includes(n.midi));
  assert.ok(drone.every((n) => n.gain < 0.18), 'the drone sits under the chords');
  assert.deepEqual(drone.map((n) => [n.midi, Math.round(n.at * 100) / 100]), [[43, 0.05], [50, 0.05], [44, 4.05], [51, 4.05]]);
  assert.equal(f.engine.holds.length, 0);
});

test('the same drone on both chords is held once, not struck again', () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(lead({ stepDrones: [[43, 50], [43, 50]], droneSound: 'organ' }));
  for (const at of [2, 4, 6, 8.0, 10]) { f.clock.t = at; f.tick(); }
  assert.equal(f.engine.holds.length, 1);
  t.stop('user');
  assert.equal(f.engine.released, 1);
});

test('looping patterns fade out at the end of the bar limit, striking nothing after it', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 }); // 2 bars = 8 beats = 8 s at 60 bpm
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  t.play(pattern(60, { loop: true, bpm: 60 }));
  for (const at of [2, 4, 6, 7.9, 7.99]) { f.clock.t = at; f.tick(); }
  assert.equal(t.isPlaying(), true);
  assert.ok(f.engine.notes.every((n) => n.at < 8), JSON.stringify(f.engine.notes.map((n) => n.at)));
  f.clock.t = 8.1; f.tick();
  assert.equal(t.isPlaying(), false);
  assert.deepEqual(reasons, ['limit']);
  assert.equal(f.engine.fades.at(-1), 2, 'a two-second fade, not a cut');
});

test('a tempo change mid-loop still stops on the bar line, with every beat heard', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play(pattern(60, { loop: true, bpm: 60 })); // beats at 0.05, 1.05, 2.05 …
  for (let at = 0; at <= 4.001; at += 0.025) { f.clock.t = at; f.tick(); }
  t.setBpm(120); // beats 0–4 were scheduled at 60 bpm, so beat 5 is at 5.05, then every 0.5 s
  for (let at = 4.025; at <= 6.5; at += 0.025) { f.clock.t = at; f.tick(); }
  assert.equal(t.isPlaying(), true, 'the bar line is at 6.55 s');
  assert.equal(f.engine.notes.length, 8, 'all 8 beats are struck');
  f.clock.t = 6.6; f.tick();
  assert.equal(t.isPlaying(), false);
});

test('a chord loop slowed mid-bar stops on its new bar line, not seconds late', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play({ kind: 'chordLoop', steps: [[60, 64]], durations: [4], bpm: 120, loop: true, label: 'c' });
  f.clock.t = 0.2; f.tick();
  t.setBpm(40); // bar 2 was already due at 2.05 s; it then lasts 6 s, to 8.05 s
  for (let at = 0.225; at <= 8.0; at += 0.025) { f.clock.t = at; f.tick(); }
  assert.equal(t.isPlaying(), true);
  assert.equal(f.engine.notes.length, 4, 'two chords of two notes');
  f.clock.t = 8.1; f.tick();
  assert.equal(t.isPlaying(), false);
});

test('a held organ drone follows a tempo change to its bar line', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play({ kind: 'drone', steps: [[48, 55]], bpm: 60, loop: true, label: 'd', droneSound: 'organ' });
  f.clock.t = 4; f.tick(); // 3.95 beats since the start at 0.05 s
  t.setBpm(120); // 4.05 beats left: 2.025 s
  f.clock.t = 6.0; f.tick();
  assert.equal(t.isPlaying(), true);
  f.clock.t = 6.05; f.tick();
  assert.equal(t.isPlaying(), false);
});

test('a drone also stops at the bar limit', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play({ kind: 'drone', steps: [[48]], bpm: 80, loop: true, label: 'd' }); // 8 beats = 6 s
  f.clock.t = 5.9; f.tick();
  assert.equal(t.isPlaying(), true);
  f.clock.t = 6.1; f.tick();
  assert.equal(t.isPlaying(), false);
});

test('the bar limit counts from the latest play, and can be changed or switched off', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play(pattern(60, { loop: true, bpm: 60 }));
  f.clock.t = 5; t.play(pattern(62, { loop: true, bpm: 60 }));
  f.clock.t = 12; f.tick();
  assert.equal(t.isPlaying(), true);
  assert.equal(t.limit(), 2);
  t.setLimit(0);
  assert.equal(t.limit(), null);
  f.clock.t = 600; f.tick();
  assert.equal(t.isPlaying(), true, 'until Stop');
  t.setLimit(8);
  f.clock.t = 601; f.tick();
  assert.equal(t.isPlaying(), false, 'a new limit already passed applies at once');
});

test('a one-shot example is never cut short by the bar limit', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play({ kind: 'progression', steps: [[60], [62]], durations: [40, 4], bpm: 60, loop: false, label: 'long' });
  f.tick();
  f.clock.t = 35; f.tick();
  assert.equal(t.isPlaying(), true);
});

test('a user stop releases at the normal speed', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play(pattern(60, { loop: true }));
  t.stop('user');
  assert.equal(f.engine.fades.at(-1), undefined);
});

test('Stop while the sound is still loading cancels the waiting press', async () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  const reasons = [];
  t.onStop((r) => reasons.push(r));
  let finish;
  const ready = new Promise((r) => { finish = r; });
  const pending = t.whenReady(ready);
  t.stop('user');
  finish();
  assert.equal(await pending, false);
  assert.deepEqual(reasons, ['user'], 'the cancel is reported, so the screen can say so');
});

test('key clicks wait in their own lane: they don’t cancel a waiting Play, but Stop cancels both', async () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  let finish;
  const ready = new Promise((r) => { finish = r; });
  const play = t.whenReady(ready);
  const key1 = t.whenReady(ready, 'key');
  const key2 = t.whenReady(ready, 'key');
  finish();
  assert.deepEqual([await play, await key1, await key2], [true, false, true]);
  let again;
  const later = new Promise((r) => { again = r; });
  const play2 = t.whenReady(later);
  const key3 = t.whenReady(later, 'key');
  t.stop('user');
  again();
  assert.deepEqual([await play2, await key3], [false, false]);
});

test('a pattern ending on its own does not cancel a press waiting to play', async () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  t.play(pattern(60));
  let finish;
  const ready = new Promise((r) => { finish = r; });
  const pending = t.whenReady(ready);
  f.tick(); f.clock.t = 5; f.tick(); // the one-shot run ends: 'done'
  assert.equal(t.isPlaying(), false);
  finish();
  assert.equal(await pending, true);
});

test('renew restarts the bar count (Gravity: each tone keeps its drone going)', () => {
  const f = fakes();
  const t = createTransport(f.engine, { ...f.opts, limit: 2 });
  t.play(pattern(60, { loop: true, bpm: 60 }));
  f.clock.t = 6; f.tick(); t.renew();
  f.clock.t = 13; f.tick();
  assert.equal(t.isPlaying(), true);
  f.clock.t = 14.1; f.tick();
  assert.equal(t.isPlaying(), false);
});

test('when two presses wait for loading, only the latest counts', async () => {
  const f = fakes();
  const t = createTransport(f.engine, f.opts);
  let finish;
  const ready = new Promise((r) => { finish = r; });
  const first = t.whenReady(ready);
  const second = t.whenReady(ready);
  finish();
  assert.deepEqual([await first, await second], [false, true]);
});

test('stopAfterPref reads the saved limit in bars, defaulting to 8 (0 = until Stop)', async () => {
  const { stopAfterPref, STOP_AFTER_CHOICES, describeLimit } = await import('../public/js/prefs.js');
  assert.deepEqual(STOP_AFTER_CHOICES, [2, 4, 6, 8, 0]);
  assert.equal(describeLimit(8), '8 bars');
  assert.equal(describeLimit(2), '2 bars');
  const box = {};
  withStorage({ getItem: (k) => box[k] ?? null, setItem: (k, v) => { box[k] = v; } }, () => {
    assert.equal(stopAfterPref(), 8);
    box['lce.stopAfter'] = '30'; // the old seconds setting is ignored
    assert.equal(stopAfterPref(), 8);
    box['lce.stopAfterBars'] = '4';
    assert.equal(stopAfterPref(), 4);
    box['lce.stopAfterBars'] = '0';
    assert.equal(stopAfterPref(), 0);
    box['lce.stopAfterBars'] = '30';
    assert.equal(stopAfterPref(), 8);
    box['lce.stopAfterBars'] = '"x"';
    assert.equal(stopAfterPref(), 8);
  });
});

test('droneSoundPref defaults to the organ and ignores junk', async () => {
  const { droneSoundPref } = await import('../public/js/prefs.js');
  const box = {};
  withStorage({ getItem: (k) => box[k] ?? null, setItem: (k, v) => { box[k] = v; } }, () => {
    assert.equal(droneSoundPref(), 'organ');
    box['lce.droneSound'] = '"pad"';
    assert.equal(droneSoundPref(), 'pad');
    box['lce.droneSound'] = '"tuba"';
    assert.equal(droneSoundPref(), 'organ');
    box['lce.droneSound'] = '{';
    assert.equal(droneSoundPref(), 'organ');
  });
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
    createWaveShaper() { return { curve: null, connect: (x) => x }; }
  }
  const engine = createEngine({ AudioContextCtor: FakeCtx, volume: 0, loadSamples: async () => new Map() });
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

test('router knows the Learn view', () => {
  assert.equal(viewFromHash('#learn'), 'learn');
});

test('dronePref rejects an "other" note that is not a note', async () => {
  const { dronePref } = await import('../public/js/prefs.js');
  const box = { 'lce.drone': JSON.stringify({ mode: 'other', note: 'zzz' }) };
  withStorage({ getItem: (k) => box[k] ?? null, setItem() {} }, () => {
    assert.deepEqual(dronePref(), { mode: 'bass', note: 'C' });
  });
});
