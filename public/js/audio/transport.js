// Plays one pattern at a time on the audio engine: a scale run, a looped
// chord, or a drone. A look-ahead loop schedules notes slightly ahead on the
// audio clock so timing stays steady. Starting a pattern always stops the
// last one, and a pattern stops itself after 20 minutes without input.

export const IDLE_SECONDS = 20 * 60;

export const stepTimes = (start, bpm, count) => Array.from({ length: count }, (_, i) => start + (i * 60) / bpm);

export function createTransport(engine, { setTimer = setInterval, clearTimer = clearInterval, lookahead = 0.1, tick = 25 } = {}) {
  const stepListeners = new Set();
  const stopListeners = new Set();
  let current = null;

  function halt() {
    if (!current) return;
    clearTimer(current.timer);
    current.stopDrone?.();
    engine.stopAll();
    current = null;
  }

  function stop(reason = 'user') {
    if (!current) return;
    halt();
    stopListeners.forEach((cb) => cb(reason));
  }

  function run() {
    const p = current;
    const now = engine.now();
    if (now - p.lastPoke > IDLE_SECONDS) { stop('idle'); return; }
    if (p.pattern.kind === 'drone') return;
    const beat = 60 / p.bpm;
    const { steps, loop } = p.pattern;
    while (p.nextTime < now + lookahead) {
      if (!loop && p.index >= steps.length) {
        if (now >= p.nextTime) stop('done');
        return;
      }
      const index = p.index % steps.length;
      for (const midi of steps[index]) engine.note(midi, p.nextTime, beat * 0.9);
      stepListeners.forEach((cb) => cb({ index, midis: steps[index], at: p.nextTime }));
      p.index += 1;
      p.nextTime += beat;
    }
  }

  function play(pattern) {
    halt();
    const start = engine.now() + 0.05;
    current = { pattern, bpm: pattern.bpm, index: 0, nextTime: start, lastPoke: engine.now(), timer: null, stopDrone: null };
    const held = pattern.kind === 'drone' ? pattern.steps[0] : pattern.drone;
    if (held) current.stopDrone = engine.drone(held);
    current.timer = setTimer(() => current && run(), tick);
    run();
  }

  return {
    play,
    stop,
    setBpm(bpm) { if (current) current.bpm = bpm; },
    poke() { if (current) current.lastPoke = engine.now(); },
    isPlaying: () => current !== null,
    current: () => current?.pattern ?? null,
    onStep(cb) { stepListeners.add(cb); return () => stepListeners.delete(cb); },
    onStop(cb) { stopListeners.add(cb); return () => stopListeners.delete(cb); },
  };
}
