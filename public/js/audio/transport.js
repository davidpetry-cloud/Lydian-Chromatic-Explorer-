// Plays one pattern at a time on the audio engine: a scale run, a looped
// chord, a drone, or a one-shot example. A look-ahead loop schedules notes
// slightly ahead on the audio clock so timing stays steady. Starting a
// pattern always stops the last one. A drone (alone, or under a scale) is
// struck again on every bar, as a pianist would hold a pedal tone.
// Looping patterns fade out at the bar line of the player's "Stop after"
// limit (counted in beats, so tempo changes are followed), and anything
// stops itself after 20 minutes without input.

export const IDLE_SECONDS = 20 * 60;
export const LIMIT_FADE = 2; // seconds
export const DRONE_GAIN = 0.12; // quieter than a played note (0.18), so it sits underneath
const BAR = 4; // beats in a bar: drone strikes and the "Stop after" limit

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

  // Beats played so far, following tempo changes.
  function advance(p, now) {
    p.beatPos += ((now - p.lastRun) * p.bpm) / 60;
    p.lastRun = now;
  }

  // The beat at which a looping pattern ends (Infinity: until Stop).
  const endBeat = (p) => (limit && loops(p.pattern) ? p.limitFrom + limit * BAR : Infinity);

  function run() {
    const p = current;
    const now = engine.now();
    advance(p, now);
    if (now - p.lastPoke > IDLE_SECONDS) { stop('idle'); return; }
    if (p.beatPos >= endBeat(p)) { stop('limit'); return; }
    const beat = 60 / p.bpm;
    if (p.held) {
      while (p.nextDrone < now + lookahead && p.nextDroneBeat < endBeat(p)) {
        for (const midi of p.held) engine.note(midi, p.nextDrone, BAR * beat, { gain: DRONE_GAIN });
        p.nextDrone += BAR * beat;
        p.nextDroneBeat += BAR;
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
      for (const midi of steps[index]) engine.note(midi, p.nextTime, length);
      stepListeners.forEach((cb) => cb({ index, midis: steps[index], at: p.nextTime }));
      p.index += 1;
      p.nextTime += beats * beat;
      p.nextBeat += beats;
    }
  }

  function play(pattern) {
    halt();
    const start = engine.now() + 0.05;
    const held = pattern.kind === 'drone' ? pattern.steps[0] : pattern.drone;
    const now = engine.now();
    current = {
      pattern, bpm: pattern.bpm, index: 0, held: held ?? null, timer: null, lastPoke: now,
      nextTime: start, nextBeat: 0, nextDrone: start, nextDroneBeat: 0,
      beatPos: 0, lastRun: now, limitFrom: 0,
    };
    current.timer = setTimer(() => current && run(), tick);
    playListeners.forEach((cb) => cb(pattern));
    run();
  }

  return {
    play,
    stop,
    setBpm(bpm) {
      if (!current) return;
      advance(current, engine.now()); // beats so far count at the old tempo
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
      if (!current) return;
      advance(current, engine.now());
      current.limitFrom = current.beatPos;
    },
    isPlaying: () => current !== null,
    current: () => current?.pattern ?? null,
    onStep(cb) { stepListeners.add(cb); return () => stepListeners.delete(cb); },
    onPlay(cb) { playListeners.add(cb); return () => playListeners.delete(cb); },
    onStop(cb) { stopListeners.add(cb); return () => stopListeners.delete(cb); },
  };
}
