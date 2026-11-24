// Plays one pattern at a time on the audio engine: a scale run, a looped
// chord, a drone, or a one-shot example. A look-ahead loop schedules notes
// slightly ahead on the audio clock so timing stays steady. Starting a
// pattern always stops the last one. A drone (alone, or under a scale)
// plays on its instrument: a sustaining one (organ, pad) is one held voice;
// one that dies away (piano, bass) is struck again every few beats.
// Looping patterns fade out at the bar line of the player's "Stop after"
// limit. Bars are counted on the note schedule itself (notes already
// scheduled keep their time when the tempo changes), and anything stops
// itself after 20 minutes without input.

export const IDLE_SECONDS = 20 * 60;
export const LIMIT_FADE = 2; // seconds
export const DRONE_GAIN = 0.12; // quieter than a played note (0.18), so it sits underneath
const BAR = 4; // beats in a bar, for the "Stop after" limit

import { INSTRUMENTS } from './instruments.js';

export const stepTimes = (start, bpm, count) => Array.from({ length: count }, (_, i) => start + (i * 60) / bpm);

export function createTransport(engine, { setTimer = setInterval, clearTimer = clearInterval, lookahead = 0.1, tick = 25, limit: startLimit = null } = {}) {
  const stepListeners = new Set();
  const stopListeners = new Set();
  const playListeners = new Set();
  let current = null;
  let limit = startLimit || null; // bars, or null for "until Stop"
  // Presses waiting for the sound to be ready, in lanes ('play' for patterns,
  // 'key' for single notes): the latest press in a lane wins, and Stop (or
  // hiding the tab) cancels every lane.
  const tickets = new Map();
  let waiting = 0;

  function halt(fade) {
    if (!current) return;
    clearTimer(current.timer);
    current.release?.(fade);
    engine.stopAll(fade);
    current = null;
  }

  function stop(reason = 'user') {
    const cancelled = waiting > 0 && (reason === 'user' || reason === 'hidden');
    if (reason === 'user' || reason === 'hidden') for (const lane of tickets.keys()) tickets.set(lane, tickets.get(lane) + 1);
    if (!current) {
      engine.stopAll(); // still cut any ringing key
      if (cancelled) stopListeners.forEach((cb) => cb(reason));
      return;
    }
    halt(reason === 'limit' ? LIMIT_FADE : undefined);
    stopListeners.forEach((cb) => cb(reason));
  }

  const loops = (pattern) => pattern.loop || pattern.kind === 'drone';

  // The beat grid: a point whose time and beat are known exactly. It is the
  // next scheduled step, or the next drone strike, or (for a held drone,
  // which schedules nothing) an anchor moved along at each tempo change.
  function grid(p) {
    if (p.pattern.kind !== 'drone') return { time: p.nextTime, beat: p.nextBeat };
    if (p.release) return { time: p.anchorTime, beat: p.anchorBeat };
    return { time: p.nextDrone, beat: p.nextDroneBeat };
  }

  // Which beat it is at `now` (fractional between grid points).
  const beatAt = (p, now) => { const g = grid(p); return g.beat + ((now - g.time) * p.bpm) / 60; };

  // The beat at which a looping pattern ends (Infinity: until Stop).
  const endBeat = (p) => (limit && loops(p.pattern) ? p.limitFrom + limit * BAR : Infinity);

  function run() {
    const p = current;
    const now = engine.now();
    if (now - p.lastPoke > IDLE_SECONDS) { stop('idle'); return; }
    if (beatAt(p, now) >= endBeat(p)) { stop('limit'); return; }
    const beat = 60 / p.bpm;
    if (p.held && !p.release) {
      // A drone that dies away (piano, bass) is struck again every few beats.
      const every = p.instrument.restrikeBeats;
      while (p.nextDrone < now + lookahead && p.nextDroneBeat < endBeat(p)) {
        for (const midi of p.held) engine.note(midi, p.nextDrone, every * beat, { gain: DRONE_GAIN * p.instrument.droneLevel, instrument: p.instrument.id });
        p.nextDrone += every * beat;
        p.nextDroneBeat += every;
      }
    }
    if (p.pattern.kind === 'drone') return;
    const { steps, loop } = p.pattern;
    while (p.nextTime < now + lookahead && p.nextBeat < endBeat(p)) {
      if (!loop && p.index >= steps.length) {
        if (now >= p.nextTime) stop('done');
        return;
      }
      const index = p.index % steps.length;
      // A step lasts one beat, or as many beats as `durations` says (held chords).
      const beats = p.pattern.durations?.[index] ?? 1;
      const length = p.pattern.durations ? beats * beat : beat * 0.9;
      if (p.pattern.stepDrones) playStepDrone(p, index, beats, beat);
      for (const midi of steps[index]) engine.note(midi, p.nextTime, length);
      stepListeners.forEach((cb) => cb({ index, midis: steps[index], at: p.nextTime }));
      p.index += 1;
      p.nextTime += beats * beat;
      p.nextBeat += beats;
    }
  }

  // A lead between chords carries a drone per step (stepDrones): a sustaining
  // drone lets go and is held anew when the step's notes change; one that dies
  // away is struck at the step's start (and again every few beats within it).
  const same = (a, b) => a && b && a.length === b.length && a.every((m, i) => m === b[i]);
  function playStepDrone(p, index, beats, beat) {
    const notes = p.pattern.stepDrones[index];
    const opts = { gain: DRONE_GAIN * p.instrument.droneLevel, instrument: p.instrument.id };
    if (p.instrument.holds) {
      if (same(notes, p.stepHeld)) return;
      p.release?.(undefined, p.nextTime);
      p.release = notes?.length ? engine.hold(notes, p.nextTime, opts) : null;
      p.stepHeld = notes;
      return;
    }
    if (!notes?.length) return;
    const every = p.instrument.restrikeBeats;
    for (let b = 0; b < beats; b += every) {
      for (const midi of notes) engine.note(midi, p.nextTime + b * beat, Math.min(every, beats - b) * beat, opts);
    }
  }

  function play(pattern) {
    halt();
    const start = engine.now() + 0.05;
    const held = pattern.stepDrones ? null : pattern.kind === 'drone' ? pattern.steps[0] : pattern.drone;
    const now = engine.now();
    current = {
      pattern, bpm: pattern.bpm, index: 0, held: held ?? null, timer: null, lastPoke: now,
      nextTime: start, nextBeat: 0, nextDrone: start, nextDroneBeat: 0,
      anchorTime: start, anchorBeat: 0, limitFrom: 0,
      instrument: INSTRUMENTS[pattern.droneSound] ?? INSTRUMENTS.piano, release: null,
    };
    // A sustaining drone (organ, pad) is one held voice for the whole pattern.
    if (current.held && current.instrument.holds) {
      current.release = engine.hold(current.held, start, { gain: DRONE_GAIN * current.instrument.droneLevel, instrument: current.instrument.id });
    }
    current.timer = setTimer(() => current && run(), tick);
    playListeners.forEach((cb) => cb(pattern));
    run();
  }

  return {
    play,
    stop,
    setBpm(bpm) {
      if (!current) return;
      const now = engine.now();
      current.anchorBeat = beatAt(current, now); // a held drone counts its beats so far at the old tempo
      current.anchorTime = now;
      current.bpm = bpm;
    },
    /** Bars a looping pattern plays before fading out; null or 0 = until Stop. */
    setLimit(bars) { limit = bars || null; },
    limit: () => limit,
    poke() { if (current) current.lastPoke = engine.now(); },
    /**
     * Waits for `ready` (the engine loading), then says whether this press
     * still counts: false if Stop or a later press came in meanwhile.
     */
    async whenReady(ready, lane = 'play') {
      const mine = (tickets.get(lane) ?? 0) + 1;
      tickets.set(lane, mine);
      waiting += 1;
      try { await ready; } finally { waiting -= 1; }
      return mine === tickets.get(lane);
    },
    /** Restarts the "Stop after" bar count: the player is still actively using this sound. */
    renew() {
      if (current) current.limitFrom = beatAt(current, engine.now());
    },
    isPlaying: () => current !== null,
    current: () => current?.pattern ?? null,
    onStep(cb) { stepListeners.add(cb); return () => stepListeners.delete(cb); },
    onPlay(cb) { playListeners.add(cb); return () => playListeners.delete(cb); },
    onStop(cb) { stopListeners.add(cb); return () => stopListeners.delete(cb); },
  };
}
