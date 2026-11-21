// Sound, made in the browser with the Web Audio API: no sample files.
// Each voice is a triangle and a slightly detuned sine through a gentle
// low-pass filter and a short envelope. The AudioContext is created on the
// first resume(), which callers make from a user's press.
import { midiToFreq } from '../theory/notes.js';

const ATTACK = 0.01;
const RELEASE = 0.15;

export function createEngine({ AudioContextCtor = globalThis.AudioContext } = {}) {
  let ctx = null;
  let master = null;
  let volume = 0.7;
  const voices = new Set();

  function voice(midi, at, gain) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(gain, at + ATTACK);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    filter.connect(out).connect(master);
    const oscs = ['triangle', 'sine'].map((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = midiToFreq(midi);
      o.detune.value = i ? 4 : 0;
      o.connect(filter);
      o.start(at);
      return o;
    });
    const v = { out, oscs };
    voices.add(v);
    oscs[0].onended = () => { voices.delete(v); out.disconnect(); };
    return v;
  }

  function release(v, at) {
    v.out.gain.cancelScheduledValues(at);
    v.out.gain.setValueAtTime(v.out.gain.value, at);
    v.out.gain.linearRampToValueAtTime(0, at + RELEASE);
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
    note(midi, at, dur, { gain = 0.2 } = {}) {
      if (!ctx) return;
      const v = voice(midi, at, gain);
      v.out.gain.setValueAtTime(gain, at + Math.max(ATTACK, dur - RELEASE));
      v.out.gain.linearRampToValueAtTime(0, at + dur);
      v.oscs.forEach((o) => o.stop(at + dur + 0.02));
    },
    drone(midis) {
      if (!ctx) return () => {};
      const held = midis.map((m) => voice(m, ctx.currentTime, 0.12));
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
