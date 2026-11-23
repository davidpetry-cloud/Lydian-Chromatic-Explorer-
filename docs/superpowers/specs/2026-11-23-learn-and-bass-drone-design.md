# Learn tab and bass-note drone: design

Date: 2026-11-23 · For David's approval · First of three "gravity" projects:
this Learn tab, then the Form & Gravity lab, then live line feedback.

## Intent

Players arriving from David's site should come away understanding tonal
gravity: ingoing and outgoing, vertical and horizontal, and how the bass and
harmonic rhythm steer the pull. They learn by reading short sections and
**hearing** each idea. Separately, the drone should always sound the note
the player puts in the bass.

## Goals

1. **Bass-note drone everywhere** (David's decision).
   - **Slash chords:** `Cmaj7/E` and `Dm7/G`. The bass may be any note,
     including one outside the chord (a pedal).
   - **"Drone on" picker** in Practice: *Bass note* (default), *Lydian
     tonic*, *Chord root*, or *Other note* (with a note picker). Saved as
     `lce.drone`.
   - **Bass, not Lydian tonic:** the "Hold the tonic underneath" option
     becomes "Hold the drone underneath", and the Drone button plays the
     chosen note. The chord loop voices the chord above its bass.
   - **MIDI:** when the lowest note played isn't the recognized chord's
     root, the chord gets that bass (E–G–B–C → `Cmaj7/E`).
   - **Analysis is unchanged by the bass:** the Lydian tonic and parent
     scale come from the chord. If a source shows Russell treating
     inversions differently, it gets flagged, not guessed.
   - **Gravity view:** its drone is the tonic picked there. That is the
     note the player selects in that view, so it already follows the rule.
2. **Learn tab** (a fourth tab: Practice · Gravity · Learn · Reference).
   Six short sections, each with a playable example, a text description of
   what you'll hear, a "try it" link, and sources:
   1. **Home and away:** what tonal gravity is. (Play: drone on the bass,
      then a near tone, then a far tone.)
   2. **Ingoing and outgoing tonal gravity:**
      - what it means: closeness to the centre, and Russell's ladder of
        seven scales
      - why it matters: tension you can dial, rather than "right and wrong
        notes"
      - **Ideas for using it**, labelled as practice ideas, not Russell's
        rules:
        - start ingoing, travel outgoing for a climax, then come home
        - an ingoing A section and an outgoing B section
        - over a pedal bass, step one scale further out each chorus
        - comp ingoing while the soloist goes outgoing

      (Play: the same four bars, ingoing then outgoing.)
   3. **Vertical: one chord, one centre.** (Cm7 → E♭ Lydian = C Dorian.)
   4. **Horizontal: a passage leaning toward one centre.** (Play: ii–V–I
      heard as one gravity.)
   5. **Voice leading and the bass** (the classical view, labelled as such):
      - tendency tones: the leading tone rises, 7ths fall
      - **harmonic rhythm:** how often the chords change, and how that sets
        the pull
      - **bass movement:** by fifths, by step, chromatic, and pedal points
      - **inversions:** the same chord over a different bass pulls
        differently (C → C/E → F)

      (Play: one progression with three bass lines and two harmonic
      rhythms.)
   6. **Two views side by side:** where Russell's gravity and classical
      voice leading agree and where they differ.

   It ends with "Next: build your own sections in the Form & Gravity lab",
   shown as "coming soon" until that project ships.

## Non-goals

- Building sections, bars or key changes (that's the Form & Gravity lab).
- Notation (no staff).
- Chord types beyond the 19 that are verified.

## Anti-goals

- **Theory without a source:** every claim cites two sources, per
  CLAUDE.md.
- **Practice ideas presented as Russell's rules.**
- **Mixing up the two traditions:** every section says whether an idea is
  Russell's or classical voice leading.
- **Sound-only information:** every example has a text description, and
  its notes are shown.

## Constraints

Everything in CLAUDE.md applies:
- strict CSP, with no inline code or styles
- tokens for all styling
- no network requests
- sound only after a press, stopping on its own after 20 idle minutes
- WCAG 2.2 AA
- original wording (no copying Russell's text)

## Approaches

| | Approach | Verdict |
|---|---|---|
| **Chosen** | Learn tab inside the app; sections are data (`public/js/data/learn.js`) played through the existing engine and transport | Reuses sound, analysis and security; one place to maintain |
| Rejected | A separate explainer page | It would duplicate the engine and analysis |
| Rejected | A document or PDF | It can't play examples |

## Design notes for the builder

- **Example voicing:** the bass goes in octave 2. The upper voices are the
  remaining chord tones in the C4–B4 window, with each chord's voicing
  chosen to move the fewest semitones from the last (simple nearest-voice
  leading). Examples are written as chord symbols, with slash basses and
  beats per chord, never as hand-written note lists.
- **Example playback** is a new transport pattern kind, `progression`:
  steps per beat, chords held for their beats, the bass in its own voice.
  Each example has Play and Stop, a now-playing line, and one live
  announcement. Its chords and bass notes are shown as text, with the
  current chord highlighted (not by colour alone).
- **Sources to add:** harmonic rhythm, chord inversion, pedal point,
  tendency tones and the leading tone (for example Wikipedia and Open
  Music Theory), plus the existing Russell sources for sections 2–4. These
  are recorded in `docs/theory-sources.md`.

## Calls made while writing this (David can override)

- Changing the root or chord-type picker keeps the current slash bass
  (`Cmaj7/E` → `Dm7/E`), so the pickers never silently drop it; typing a
  chord without a slash clears it.
- The saved drone choice is stored as `lce.drone` = `{ mode, note }`.

## Left to the builder

The exact prose (David's voice: playful, inviting, plain), the example
progressions within the rules above, the layout within the tokens, and the
order of the "Drone on" options in the picker.
