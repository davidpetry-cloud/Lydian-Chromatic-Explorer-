# Spread voicing: short design

Chosen by David on 2026-11-24: option A, Hutchinson's five-note spread. This
is a small change to the Voicings card (#16), whose sources were upgraded in
#20.

## Intent

To hear a chord opened right up across both hands, the way a pianist voices
it under a melody or a ballad, and to compare that with the close, drop and
rootless shapes already on the card.

## What it is (sources)

- **The base:** the root lowest, then the 7th and the 3rd. Hutchinson §31.7
  (hutchinson-jazz-voicings) and PianoGroove (pianogroove-spread) agree on
  this.
- **The top two:** two more notes above, a fourth or fifth apart, per
  Hutchinson.
- **Where sources differ:** PianoGroove's spread is the three-note base
  alone. The row says so: "Textbooks differ on the size; a three-note form
  (root, 3rd, 7th) also exists."
- **A 6th stands in for a missing 7th, and a sus 4th for a missing 3rd**
  (Hutchinson). Chords with neither a 7th nor a 6th (plain triads) get
  "Not for this chord".

## The rule (computed in `public/js/theory/voicings.js`)

1. **The base:** root, then 7th (or 6th), then 3rd (or sus 4th), rising, so
   the 3rd sits a 10th above the root. *My call:* this is the classic spread
   shape, and Hutchinson allows the 3rd above or below the 7th.
2. **The top two:** parent-scale tones not already in the base, stacked
   upward from the 3rd, each step a perfect fourth, then a perfect fifth,
   then an augmented fourth, tried in that order.
   - The chord's own extensions (9, 11, 13) are preferred, then the 5th.
   - Extra notes come from Russell's parent scale, as for the other voicings
     (David's decision).
   - If nothing stacks, the row reads "Not for this chord".
3. **Placement:** within G2–G5, the wide range, with the top as near G4 as
   it can be.

Expected results (in the tests):

| Chord | Spread |
|---|---|
| Cmaj7 | C B E A D (R 7 3 13 9) |
| Dm7 | D C F B E (R 7 3 13 9, the B from F Lydian) |
| G7 | G F B E A (R 7 3 13 9) |

## Everything else stays as it is

- Play toggle, Play all, the gravity reading, the octave-2 bass, Stop after
  and the lead-into-a-next-chord section all work as they do now. Voice
  leading already handles five voices.
- Spread is no longer listed under "Waiting for sources"; nothing is left
  waiting.
- The `docs/theory-sources.md` row becomes Verified, with the size noted as
  where the sources differ.

## Approaches considered

- **A. Hutchinson's five notes** (chosen): the full two-hand sound, and from
  a textbook.
- **B. PianoGroove's three-note shell:** lean, a left-hand shape, and gives
  the gravity reading little to work with.
- **C. Both, as two rows:** the most to compare, but a longer card.

## Left to the builder

- Tie-breaks between equally good top pairs.
- Test details.
