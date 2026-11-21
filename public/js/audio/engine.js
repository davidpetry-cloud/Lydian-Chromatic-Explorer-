// Sound, made in the browser with the Web Audio API: no sample files.
// Each voice is a small FM electric piano (Rhodes-style): a sine carrier
// whose tone is brightened by a second sine at the same pitch. That
// brightness fades after the attack, so a note starts bell-like and
// mellows as it rings. A short high "tine" partial adds the ping, and the
// volume decays like a struck key. The AudioContext is created on the
// first resume(), which callers make from a user's press.
import { midiToFreq } from '../theory/notes.js';

const ATTACK = 0.005;
const RELEASE = 0.15;
// How a struck note settles: [sustain level as a share of the peak, decay time constant in seconds]
const STRUCK = [0.3, 0.45];
const HELD = [0.6, 0.9]; // drones: gentler, so they can sit under a scale
const BRIGHT_INDEX = 2.2; // modulation depth at the attack, in multiples of the pitch
const MELLOW_INDEX = 0.12; // ... and once the note has settled
const TINE_RATIO = 7.1; // the tine's slightly inharmonic overtone

export function createEngine({ AudioContextCtor = globalThis.AudioContext, volume: startVolume = 0.7 } = {}) {
  let ctx = null;
  let master = null;
  let volume = startVolume;
  const voices = new Set();

  function voice(midi, at, gain, { held = false } = {}) {
    const f = midiToFreq(midi);
    const [sustain, decay] = held ? HELD : STRUCK;
    const out = ctx.createGain();
    out.gain.value = 0; // silent until its envelope starts, even if that is cancelled
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(gain, at + ATTACK);
    out.gain.setTargetAtTime(gain * sustain, at + ATTACK, decay);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4200;
    filter.connect(out).connect(master);

    const carrier = ctx.createOscillator();
    carrier.frequency.value = f;
    carrier.connect(filter);

    // The modulator bends the carrier's pitch at audio rate: deeper = brighter.
    const modulator = ctx.createOscillator();
    modulator.frequency.value = f;
    const depth = ctx.createGain();
    depth.gain.value = 0;
    depth.gain.setValueAtTime(f * (held ? BRIGHT_INDEX / 2 : BRIGHT_INDEX), at);
    depth.gain.setTargetAtTime(f * MELLOW_INDEX, at, held ? 0.6 : 0.25);
    modulator.connect(depth).connect(carrier.frequency);

    const tine = ctx.createOscillator();
    tine.frequency.value = f * TINE_RATIO;
    const ping = ctx.createGain();
    ping.gain.value = 0;
    ping.gain.setValueAtTime(0, at);
    ping.gain.linearRampToValueAtTime(held ? 0.05 : 0.18, at + 0.002);
    ping.gain.setTargetAtTime(0, at + 0.002, 0.04);
    tine.connect(ping).connect(filter);

    const oscs = [carrier, modulator, tine];
    oscs.forEach((o) => o.start(at));
    const v = { out, oscs, start: at };
    voices.add(v);
    carrier.onended = () => { voices.delete(v); out.disconnect(); };
    return v;
  }

  function release(v, at) {
    const g = v.out.gain;
    if (v.start > at) {
      // Scheduled but not started yet: cancel it outright, so it never sounds.
      g.cancelScheduledValues(0);
      g.value = 0;
      v.oscs.forEach((o) => o.stop(at));
      return;
    }
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(at);
    else { g.cancelScheduledValues(at); g.setValueAtTime(g.value, at); }
    g.linearRampToValueAtTime(0, at + RELEASE);
    v.oscs.forEach((o) => o.stop(at + RELEASE + 0.02));
  }

  return {
    async resume() {
      if (!ctx) {
        ctx = new AudioContextCtor();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') await ctx.resume();
    },
    now: () => (ctx ? ctx.currentTime : 0),
    context: () => ctx,
    note(midi, at, dur, { gain = 0.18 } = {}) {
      if (!ctx) return;
      const v = voice(midi, at, gain);
      // Let go of the key: fade from wherever the decay has reached.
      const off = at + Math.max(ATTACK * 2, dur - RELEASE);
      v.out.gain.setTargetAtTime(0, off, RELEASE / 4);
      v.oscs.forEach((o) => o.stop(off + RELEASE + 0.05));
    },
    drone(midis) {
      if (!ctx) return () => {};
      const held = midis.map((m) => voice(m, ctx.currentTime, 0.12, { held: true }));
      return () => held.forEach((v) => release(v, ctx.currentTime));
    },
    stopAll() {
      if (!ctx) return;
      voices.forEach((v) => release(v, ctx.currentTime));
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
  };
}
