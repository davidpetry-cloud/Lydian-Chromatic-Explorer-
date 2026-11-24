// The recorded piano: Salamander Grand Piano V3 by Alexander Holm (a Yamaha
// C5), CC BY 3.0, trimmed to eight mono seconds per note (see
// THIRD-PARTY-NOTICES.md). One recording every three semitones from C1 to
// C7; every other key plays the nearest one, retuned by a semitone at most.

import { pickNearest, loadSamples } from './samples.js';

export const PIANO_SAMPLES = Object.freeze(Array.from({ length: 25 }, (_, i) => 24 + 3 * i));

/** The recording to play for a MIDI key, and the playback rate that tunes it. */
export const pickSample = (midi) => pickNearest(PIANO_SAMPLES, midi);

/** Every piano recording, from this site: a Map of MIDI key → AudioBuffer. */
export const loadPiano = (ctx, { fetchFn, base = 'audio/piano/' } = {}) => loadSamples(ctx, { keys: PIANO_SAMPLES, base, fetchFn });
