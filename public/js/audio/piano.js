// The recorded piano: Salamander Grand Piano V3 by Alexander Holm (a Yamaha
// C5), CC BY 3.0, trimmed to five mono seconds per note (see
// THIRD-PARTY-NOTICES.md). One recording every three semitones from C1 to
// C7; every other key plays the nearest one, retuned by a semitone at most.

export const PIANO_SAMPLES = Object.freeze(Array.from({ length: 25 }, (_, i) => 24 + 3 * i));

const LOW = PIANO_SAMPLES[0];
const HIGH = PIANO_SAMPLES.at(-1);

/** The recording to play for a MIDI key, and the playback rate that tunes it. */
export function pickSample(midi) {
  const sample = Math.min(HIGH, Math.max(LOW, LOW + 3 * Math.round((midi - LOW) / 3)));
  return { sample, rate: 2 ** ((midi - sample) / 12) };
}

/**
 * Fetches and decodes every recording from this site (relative paths, so
 * the strict connect-src 'self' policy allows them). Resolves to a Map of
 * MIDI key → AudioBuffer, or rejects if any recording fails.
 */
export async function loadPiano(ctx, { fetchFn = (u) => globalThis.fetch(u), base = 'audio/piano/' } = {}) {
  const entries = await Promise.all(PIANO_SAMPLES.map(async (m) => {
    const res = await fetchFn(`${base}${m}.mp3`);
    if (!res.ok) throw new Error(`piano recording ${m} did not load`);
    return [m, await ctx.decodeAudioData(await res.arrayBuffer())];
  }));
  return new Map(entries);
}
