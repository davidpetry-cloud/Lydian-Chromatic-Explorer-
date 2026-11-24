# Voice leading into a next chord: design

Approved direction by David on 2026-11-24. This is layer 2 of the sound and
arranging library, built on the Voicings card (#16).

## Intent and why

Having heard one chord voiced several ways, the player wants to hear **where
it goes**: how each voice of the chosen voicing moves into a next chord. Two
ways of moving are offered:
- **smooth voice leading**
- **planing**: the same shape moved in parallel, as in modal playing, e.g.
  D-7 → E♭-7

Each voice's move is read against tonal gravity, toward home or away, as a
**description, never a rule**. In David's words: "If it's going outward,
it's not necessarily going somewhere immediately."

## Goals

- A **Next chord** field on the Voicings card.
  - It accepts what the main chord field accepts, slash chords included.
  - It is empty by default. While it is empty, the section shows a hint and
    no rows.
- For the **selected voicing**, the section shows two ways in:
  - **Smooth:** each of the four voices moves to a tone of the next chord.
    - The four target pitch classes are `fourTones(next)`, the same
      convention as the drop voicings.
    - The assignment has the smallest total motion in semitones.
    - Voices don't cross: the output stays in voice order, lowest to
      highest.
    - Ties go to the assignment with the smaller largest single move, then
      to the lower result.
  - **Same shape (planing):**
    - If the next chord's quality equals the current one's, the whole shape
      moves by the root interval, the smallest signed interval from −6 to +6
      (D-7 → E♭-7 is every voice +1).
    - Otherwise the next chord gets the **same voicing type** (drop 2 stays
      drop 2) from `voiceAs(id, next)`, placed nearest: the octave placement
      whose notes are closest in total to the current voicing.
    - The row says which happened: "moves in parallel" or "same voicing
      type; the chord type changes".
    - If the voicing doesn't apply to the next chord, the row reads "Not for
      this chord".
- **Each row shows:**
  - each voice's move, e.g. `D→E♭ ↑1`, `C→C =`, `F→E ↓1` (spelled as each
    chord spells it)
  - the next chord's notes and "over <bass>"
  - a gravity line: for each voice, its rank before (from the current
    chord's centre) and after (from the next chord's centre), with a summary
    such as "two voices move toward home, one away; one stays"
  - The wording describes and never prescribes: no "must", "should" or
    "resolve". A test enforces this, as for the reading.
- **Centre per chord (David):** each chord is heard from **its own drone
  note**. The "Drone on" setting is resolved separately for the current
  chord and for the next chord.
  - "Bass note" (the default): Dm7/G → Ebm7/Ab are heard from G and A♭.
  - "Other note": both chords from the same fixed note, like a pedal.
  - "Lydian tonic" and "Chord root": each chord's own.
- **Play is a toggle on each row.**
  - The pattern is the current voicing for a bar, then the next chord's
    voicing for a bar, looping.
  - Each chord sounds over its own bass in octave 2, with the drone under
    each when "Hold the drone underneath" is ticked.
  - Stop after, the idle stop, the hidden-tab stop and the main Stop button
    all apply.
  - Changing either chord while it plays restarts it with the new chords.
- **The selected voicing** is the one playing, or else the last one played,
  or else Close.

## Non-goals

- Longer progressions (later: the Form & Gravity lab).
- MIDI input of the next chord (later).
- Horns and instrument ranges (later layers).
- Any rule that voices "must" move a certain way.

## Sources (two-source rule)

Each needs two independent sources, recorded in `docs/theory-sources.md`,
or a plain label as the app's convention:
- **Voice leading by the smallest motion** (smooth, or parsimonious, voice
  leading). The Learn tab already cites sources on stepwise resolution;
  confirm or add sources for the general principle.
- **Planing / parallel harmony:** moving a chord shape in parallel.
- **"Toward home or away"** compares gravity ranks from each chord's own
  centre. This is the app's convention (David's lens), labelled as such.

## Constraints

- All CLAUDE.md rules apply:
  - strict CSP; no inline code; tokens only
  - WCAG 2.2 AA:
    - labelled input
    - toggles with `aria-pressed`
    - moves shown as text, not colour alone
    - one polite announcement per press
  - sound only from a press, and it stops on its own
  - original words only
- Reflows at 320 px.
- No new storage. The next chord may be remembered later if David asks.

## Approaches

- **A Next chord section in the Voicings card, with a pure module
  `public/js/theory/voiceleading.js`** (chosen).
  - Smooth leading is a small exhaustive search: 24 assignments of four
    voices × octave choices.
  - Planing reuses `voiceAs`.
- **Reusing `voiceProgression` (`voicing.js`)** was considered and dropped.
  It re-voices whole chords from a fixed register and doesn't keep a given
  voicing's four voices, so it can't show "this voice goes there".
- **A separate tab or a progression builder** (David chose the single next
  chord).

## Left to the builder

- The layout of the section within the card.
- Exact wording of the summary.
- Test details.

## Open questions for David (from the builder check, 2026-11-24)

Paused here at David's request. These are to settle before planning:

1. **What "toward home", "away" and "stays" measure.**
   - Each voice is ranked from its own chord's centre, so a held common
     tone can change rank: C→C in Dm7/G → E♭m7/A♭ goes from rank 11 (from
     G) to rank 5 (from A♭).
   - Does "stays" mean the same pitch or the same rank, and does a held
     note whose rank drops count as "toward home"?
2. **Which voicing is "selected".**
   - During Play all: the one sounding this bar?
   - Does playing a voice-leading row count as "last played"?
   - If the last-played voicing doesn't fit a new main chord, does the
     section fall back to Close for now only, or reset?
3. **If two sources for smooth voice leading or planing can't be found:**
   hold the feature back as pending, or ship it labelled as the app's
   convention? The tie-break rules would be labelled as the app's
   convention either way.

Builder's note, not a question: a drone that changes with each chord needs
a transport change, to be planned as its own task.
