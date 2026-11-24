// Shared by the recorded instruments (piano, upright bass): pick the nearest
// recording for a key, and load a set of recordings from this site (relative
// paths, so the strict connect-src 'self' policy allows them).

/** The recording to play for a MIDI key, and the playback rate that tunes it (ties go low). */
export function pickNearest(keys, midi) {
  let sample = keys[0];
  for (const k of keys) if (Math.abs(k - midi) < Math.abs(sample - midi)) sample = k;
  return { sample, rate: 2 ** ((midi - sample) / 12) };
}

/** Fetches and decodes `${base}${key}.mp3` for every key; rejects if any fails. */
export async function loadSamples(ctx, { keys, base, fetchFn = (u) => globalThis.fetch(u) }) {
  const entries = await Promise.all(keys.map(async (k) => {
    const res = await fetchFn(`${base}${k}.mp3`);
    if (!res.ok) throw new Error(`recording ${base}${k} did not load`);
    return [k, await ctx.decodeAudioData(await res.arrayBuffer())];
  }));
  return new Map(entries);
}
