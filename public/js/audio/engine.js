// Sound, played with the Web Audio API. The main voice is a recorded grand
// piano (piano.js), loaded from this site on the first resume(), which
// callers make from a user's press. If the recordings can't load, a small
// FM electric piano made in the browser takes over: a sine carrier whose
// tone is brightened by a second sine at the same pitch, fading after the
// attack, with a short high "tine" partial for the ping.
import { midiToFreq } from '../theory/notes.js';
import { loadPiano, PIANO_SAMPLES } from './piano.js';
import { loadBass, BASS_SAMPLES } from './bass.js';
import { pickNearest } from './samples.js';
import { organVoice, padVoice, SYNTH_RELEASE } from './synths.js';

const SYNTHS = { organ: organVoice, pad: padVoice };

const ATTACK = 0.005;
const RELEASE = 0.15;
// How a struck note settles: sustain level as a share of the peak, and the decay time constant in seconds
const SUSTAIN = 0.3;
const DECAY = 0.45;
const BRIGHT_INDEX = 2.2; // modulation depth at the attack, in multiples of the pitch
const MELLOW_INDEX = 0.12; // ... and once the note has settled
const TINE_RATIO = 7.1; // the tine's slightly inharmonic overtone
const DAMPER = 0.08; // piano: how quickly the damper silences a let-go key (time constant, s)
const LOAD_TIMEOUT = 15; // seconds to wait for the recordings before falling back

function softClipCurve(n = 2049) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < 0.8 ? a : 0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
  }
  return curve;
}

export function createEngine({
  AudioContextCtor = globalThis.AudioContext,
  volume: startVolume = 0.7,
  loadSamples = loadPiano,
  loadBass: loadBassSamples = loadBass,
  loadTimeout = LOAD_TIMEOUT,
  onSound = () => {},
} = {}) {
  let ctx = null;
  let master = null;
  let volume = startVolume;
  let samples = null;
  let sound = 'off'; // 'off' → 'loading' → 'piano' or 'electric'
  let loading = null;
  // The bass loads on its first use: 'off' → 'loading' → 'ready' or 'failed'.
  let bass = null;
  let bassState = 'off';
  let bassLoading = null;
  const voices = new Set();

  function setSound(s) { sound = s; onSound(s); }

  // Waits up to loadTimeout for the recordings, then falls back to the
  // electric piano; if they arrive later after all, the piano takes over.
  function load() {
    setSound('loading');
    const real = loadSamples(ctx).then(
      (map) => { samples = map; setSound('piano'); },
      () => { if (sound === 'loading') setSound('electric'); },
    );
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(resolve, loadTimeout * 1000); })
      .then(() => { if (sound === 'loading') setSound('electric'); });
    return Promise.race([real, timeout]).finally(() => clearTimeout(timer));
  }

  // One struck key of a recorded instrument: the nearest recording, retuned.
  function sampleVoice(bank, keys, midi, at, gain) {
    const { sample, rate } = pickNearest(keys, midi);
    const src = ctx.createBufferSource();
    src.buffer = bank.get(sample);
    src.playbackRate.value = rate;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setValueAtTime(gain, at);
    src.connect(out).connect(master);
    src.start(at);
    const v = { out, oscs: [src], start: at };
    voices.add(v);
    src.onended = () => { voices.delete(v); out.disconnect(); };
    return v;
  }

  function voice(midi, at, gain) {
    const f = midiToFreq(midi);
    const out = ctx.createGain();
    out.gain.value = 0; // silent until its envelope starts, even if that is cancelled
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(gain, at + ATTACK);
    out.gain.setTargetAtTime(gain * SUSTAIN, at + ATTACK, DECAY);
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
    depth.gain.setValueAtTime(f * BRIGHT_INDEX, at);
    depth.gain.setTargetAtTime(f * MELLOW_INDEX, at, 0.25);
    modulator.connect(depth).connect(carrier.frequency);

    const tine = ctx.createOscillator();
    tine.frequency.value = f * TINE_RATIO;
    const ping = ctx.createGain();
    ping.gain.value = 0;
    ping.gain.setValueAtTime(0, at);
    ping.gain.linearRampToValueAtTime(0.18, at + 0.002);
    ping.gain.setTargetAtTime(0, at + 0.002, 0.04);
    tine.connect(ping).connect(filter);

    const oscs = [carrier, modulator, tine];
    oscs.forEach((o) => o.start(at));
    const v = { out, oscs, start: at };
    voices.add(v);
    carrier.onended = () => { voices.delete(v); out.disconnect(); };
    return v;
  }

  // One key of a made-in-the-browser instrument (organ or pad).
  function synthVoice(instrument, midi, at, gain) {
    const v = SYNTHS[instrument](ctx, master, midi, at, gain);
    voices.add(v);
    v.oscs[0].onended = () => { voices.delete(v); v.out.disconnect(); };
    return v;
  }

  function release(v, at, fade = RELEASE) {
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
    g.linearRampToValueAtTime(0, at + fade);
    v.oscs.forEach((o) => o.stop(at + fade + 0.02));
  }

  return {
    async resume() {
      if (!ctx) {
        ctx = new AudioContextCtor();
        master = ctx.createGain();
        master.gain.value = volume;
        // A soft ceiling, so a big chord never clips: untouched below 0.8,
        // gently rounded above. (A compressor would also lift quiet sounds.)
        const ceiling = ctx.createWaveShaper();
        ceiling.curve = softClipCurve();
        master.connect(ceiling).connect(ctx.destination);
        loading = load();
      } else if (sound === 'loading') {
        onSound('loading'); // another press while still loading: say so again
      }
      // Resume first, while still inside the press, then wait for the piano.
      const resumed = ctx.state === 'suspended' ? ctx.resume() : null;
      await resumed;
      await loading;
    },
    now: () => (ctx ? ctx.currentTime : 0),
    context: () => ctx,
    /** Which sound plays: 'off' (not started), 'loading', 'piano' or 'electric'. */
    sound: () => sound,
    note(midi, at, dur, { gain = 0.18, instrument = 'piano' } = {}) {
      if (!ctx || sound === 'loading' || sound === 'off') return;
      if (SYNTHS[instrument]) {
        const v = synthVoice(instrument, midi, at, gain);
        const off = at + Math.max(0.05, dur - SYNTH_RELEASE[instrument]);
        v.out.gain.cancelScheduledValues(off);
        v.out.gain.setTargetAtTime(0, off, SYNTH_RELEASE[instrument]);
        v.oscs.forEach((o) => o.stop(off + SYNTH_RELEASE[instrument] * 6));
        return;
      }
      if (instrument === 'bass') {
        if (bassState === 'failed') { this.note(midi, at, dur, { gain, instrument: 'organ' }); return; }
        if (!bass) return; // ensure('bass') loads it before anything plays
        const v = sampleVoice(bass, BASS_SAMPLES, midi, at, gain);
        const off = at + Math.max(0.05, dur - DAMPER);
        v.out.gain.setTargetAtTime(0, off, DAMPER / 2);
        v.oscs[0].stop(off + DAMPER * 4);
        return;
      }
      if (samples) {
        const v = sampleVoice(samples, PIANO_SAMPLES, midi, at, gain);
        // Let go of the key: the damper comes down.
        const off = at + Math.max(0.05, dur - DAMPER);
        v.out.gain.setTargetAtTime(0, off, DAMPER / 2);
        v.oscs[0].stop(off + DAMPER * 4);
        return;
      }
      const v = voice(midi, at, gain);
      // Let go of the key: fade from wherever the decay has reached.
      const off = at + Math.max(ATTACK * 2, dur - RELEASE);
      v.out.gain.setTargetAtTime(0, off, RELEASE / 4);
      v.oscs.forEach((o) => o.stop(off + RELEASE + 0.05));
    },
    /**
     * Makes an instrument ready to play: loads the bass recordings on their
     * first use. Resolves 'ready', or 'fallback' when the bass couldn't load
     * and the organ plays in its place (said once through onSound).
     */
    async ensure(instrument) {
      if (instrument !== 'bass' || !ctx) return 'ready';
      if (bassState === 'off') {
        bassState = 'loading';
        let timer;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), loadTimeout * 1000); });
        bassLoading = Promise.race([loadBassSamples(ctx), timeout])
          .then((map) => { bass = map; bassState = 'ready'; }, () => { bassState = 'failed'; onSound('bass-fallback'); })
          .finally(() => clearTimeout(timer));
      }
      await bassLoading;
      return bassState === 'ready' ? 'ready' : 'fallback';
    },
    /**
     * Holds notes on a sustaining instrument (organ or pad) until the returned
     * function releases them, over `fade` seconds. Stop and stopAll() release
     * them too.
     */
    hold(midis, at, { gain = 0.12, instrument = 'organ' } = {}) {
      if (!ctx || !SYNTHS[instrument]) return () => {};
      const held = midis.map((m) => synthVoice(instrument, m, at, gain));
      return (fade) => held.forEach((v) => { if (voices.has(v)) release(v, ctx.currentTime, fade); });
    },
    /** Lets go of every sounding note, over `fade` seconds (a quick release by default). */
    stopAll(fade) {
      if (!ctx) return;
      voices.forEach((v) => release(v, ctx.currentTime, fade));
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
  };
}
