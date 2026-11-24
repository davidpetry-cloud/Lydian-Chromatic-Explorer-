// The upright bass: VSCO 2 Community Edition solo contrabass, plucked
// (pizzicato), by Versilian Studios, CC0 1.0 (see THIRD-PARTY-NOTICES.md).
// 14 notes from E1 to B3, mono, up to four seconds each.
import { loadSamples } from './samples.js';

export const BASS_SAMPLES = Object.freeze([28, 30, 31, 34, 36, 38, 40, 42, 44, 45, 49, 52, 56, 59]);

export const loadBass = (ctx, { fetchFn } = {}) => loadSamples(ctx, { keys: BASS_SAMPLES, base: 'audio/bass/', fetchFn });
