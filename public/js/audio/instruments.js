// The app's instruments: what each sound is and how it behaves, so the
// engine and the transport can play any of them. This is the first piece of
// a future sound and arranging library (see docs/superpowers/specs/
// 2026-11-24-bars-and-drone-sounds-design.md).
//   holds: the sound sustains, so a drone is one held voice.
//   restrikeBeats: a sound that dies away is struck again this often.

const i = (id, name, kind, holds, restrikeBeats, credit) =>
  Object.freeze({ id, name, kind, holds, restrikeBeats, credit });

export const INSTRUMENTS = Object.freeze({
  piano: i('piano', 'Piano', 'recorded', false, 4, 'Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0)'),
  organ: i('organ', 'Organ', 'synth', true, null, null),
  pad: i('pad', 'Synth pad', 'synth', true, null, null),
  bass: i('bass', 'Upright bass', 'recorded', false, 2, 'VSCO 2 Community Edition by Versilian Studios (CC0 1.0)'),
});

/** The choices for the drone's sound, in picker order. */
export const DRONE_SOUNDS = Object.freeze(['organ', 'pad', 'bass', 'piano']);

/** The MIDI notes a drone on pitch class `pc` plays with this sound. */
export function droneMidis(soundId, pc) {
  if (soundId === 'bass') return [36 + pc]; // a bassist's root, in octave 2
  return [48 + pc, 55 + pc]; // root and fifth in octave 3
}
