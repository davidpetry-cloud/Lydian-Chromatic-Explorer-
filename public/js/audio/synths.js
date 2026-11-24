// Instruments made in the browser, with no recordings.
//   Organ: Hammond-style drawbar harmonics (16', 5 1/3', 8', 4') with the
//     slow shimmer of a rotary speaker. It holds as long as the key is down.
//   Pad: three slightly detuned sawtooths and a soft sub, through a lowpass
//     filter, with a slow swell.
// Each voice returns { out, oscs, start } for the engine to release.
import { midiToFreq } from '../theory/notes.js';

const ORGAN_PARTIALS = [[0.5, 1], [1.5, 0.8], [1, 1], [2, 0.35]]; // [ratio, level]
const ORGAN_ATTACK = 0.02;
const TREMOLO_HZ = 0.8;
const TREMOLO_DEPTH = 0.18;
const PAD_DETUNE = [-8, 0, 8]; // cents
const PAD_ATTACK = 1.5;
const PAD_CUTOFF = 900;

function envelope(ctx, dest, at, gain, attack) {
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(gain, at + attack);
  out.connect(dest);
  return out;
}

// maxAttack (s): a short note's swell is shortened to fit inside it.
export function organVoice(ctx, dest, midi, at, gain, maxAttack = Infinity) {
  const f = midiToFreq(midi);
  const out = envelope(ctx, dest, at, gain, Math.min(ORGAN_ATTACK, maxAttack));
  const tremolo = ctx.createGain();
  tremolo.gain.value = 1;
  tremolo.connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = TREMOLO_HZ;
  const depth = ctx.createGain();
  depth.gain.value = TREMOLO_DEPTH;
  lfo.connect(depth).connect(tremolo.gain);
  const total = ORGAN_PARTIALS.reduce((n, [, level]) => n + level, 0);
  const oscs = [lfo];
  for (const [ratio, level] of ORGAN_PARTIALS) {
    const osc = ctx.createOscillator();
    osc.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.value = level / total;
    osc.connect(g).connect(tremolo);
    oscs.push(osc);
  }
  oscs.forEach((o) => o.start(at));
  return { out, oscs, start: at };
}

export function padVoice(ctx, dest, midi, at, gain, maxAttack = Infinity) {
  const f = midiToFreq(midi);
  const out = envelope(ctx, dest, at, gain, Math.min(PAD_ATTACK, maxAttack));
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = PAD_CUTOFF;
  filter.connect(out);
  const oscs = [];
  for (const cents of PAD_DETUNE) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = cents;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    osc.connect(g).connect(filter);
    oscs.push(osc);
  }
  const sub = ctx.createOscillator();
  sub.frequency.value = f / 2;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.3;
  sub.connect(subGain).connect(out);
  oscs.push(sub);
  oscs.forEach((o) => o.start(at));
  return { out, oscs, start: at };
}

/** How quickly each made-in-the-browser sound lets go of a released key (time constant, s). */
export const SYNTH_RELEASE = Object.freeze({ organ: 0.03, pad: 0.4 });
