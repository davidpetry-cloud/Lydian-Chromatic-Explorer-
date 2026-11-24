# Stop after in bars, and drone sounds: design

Approved by David on 2026-11-24 (short design for a small change).

## Why

- The drone and loops should stop on a musical boundary that follows the
  tempo, not a clock.
- Piano is a poor drone: it dies away and must be re-struck. David asked
  for an upright bass, a Hammond B3-style organ or a synth pad. He heard
  demos of all three.
- This is also the first brick of a future **sound and arranging library**
  (instruments, ranges, voicings, textures; later score writing, an
  improviser and performance tools). That library will get its own
  brainstorm and design. Here we only lay the shared instrument format it
  will grow from.

## What

1. **Stop after:** 2, 4, 6 or 8 bars, or "Until I press Stop". The default
   is 8 bars (David). It replaces the seconds choices.
   - Bars are 4 beats at the current tempo. Gravity's drone uses its own
     80 bpm.
   - A loop ends on the bar line, then fades over 2 s. Nothing is struck at
     or after the final bar line.
   - A tempo change mid-loop still counts bars correctly, because elapsed
     beats are tracked as the tempo changes.
   - Each Gravity tone restarts the count, as today. Learn examples are
     never cut.
   - The setting is saved as `lce.stopAfterBars`. An old seconds value in
     `lce.stopAfter` is ignored, and the default applies.
2. **Drone sound:** a "Drone sound" picker in Practice, with organ, synth
   pad, upright bass and piano.
   - The default is **organ**. This was my call, because David didn't pick
     one; it's easy to change.
   - Gravity's drone uses the same choice. The setting is saved as
     `lce.droneSound`.
   - **Organ:** made in the browser from Hammond-style drawbar harmonics
     (16′, 5⅓′, 8′, 4′) with a slow rotary-speaker tremolo. It holds.
   - **Pad:** three detuned sawtooth oscillators plus a soft sub, through a
     lowpass filter, with a slow swell. It holds.
   - **Upright bass:** VSCO 2 Community Edition solo contrabass pizzicato
     recordings (CC0, Versilian Studios, credited). About 14 notes, trimmed
     mono MP3, roughly 0.6 MB, loaded only when the bass is first used.
     It is plucked on beats 1 and 3, root only, in octave 2.
   - **Piano:** as today. It is struck once a bar on the drone notes.
   - Sounds that hold play as one held voice for the whole loop. Sounds
     that die away are re-struck: piano every bar, bass every half bar.
   - If the bass recordings fail to load, the drone falls back to the organ,
     and the app says so.
3. **Scale runs one octave lower** (octave 3, inside the on-screen keyboard
   C3–B4). This is already done, in commit d798fdd.

## Approaches considered

- **A shared instrument format** (chosen). Each sound declares its name,
  type (recorded or made in the browser), whether it holds or dies away,
  its register, how often to re-strike, its credit and licence, and how to
  play a note. The engine and transport ask the instrument what to do.
  This is the base for the future library.
- **A drone-only switch inside the engine.** Faster, but every later
  instrument would need rework.
- **A third-party sound library (e.g. Tone.js).** More sounds, but adds a
  dependency and gives less control, under the strict CSP and the
  licence-tracking rules.

## Constraints

- Strict CSP: no new hosts. The bass files are served from
  `public/audio/bass/` and fetched same-origin.
- No inline code.
- WCAG 2.2 AA: the picker is labelled, and the state is shown and spoken.
- Sound starts only from a press, and the 20-minute idle stop is kept.
- Licences go in `THIRD-PARTY-NOTICES.md`, with credits in the footer.

## Left to the builder

- Exact synth levels so all four sounds sit at a similar loudness under the
  piano.
- The file layout of the instrument modules.
- Test details.
