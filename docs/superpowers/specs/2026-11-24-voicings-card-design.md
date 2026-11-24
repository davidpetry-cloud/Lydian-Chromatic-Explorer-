# Voicings card: design

Approved direction by David on 2026-11-24. This is the first layer of the
**sound and arranging library**.

## Intent and why

A player sets a chord in Practice and hears **the same chord voiced several
ways** (close, drop 2, clusters and more), so they learn by ear what each
voicing does: how open or tight it sounds, where the colour sits, how it
leans. David's words: "hear different voicings of my chord, like drop 2 and
clusters". It is for **piano** (two hands), using the app's recorded piano.

Later layers will build on the same voicing engine. They are not part of
this design:
- a tension and inside/outside reading of each voicing, against Russell's
  chromatic tonal gravity
- instrument ranges and timbres; big band section writing (horns)
- score writing, an improviser, performance tools

## Goals

- A **Voicings** card in Practice for the current chord (slash chords
  included), with one row per voicing:
  - its name
  - its notes, low to high, spelled like the chord
  - a Play button
  - a one-line plain description in original words, citing its sources
- **Play is a toggle** (David): press it and the voicing sounds; press the
  same button again and it stops.
  - While it plays, the voicing is struck again each bar at the Practice
    tempo, so the piano doesn't die away.
  - "Stop after", the idle stop, the hidden-tab stop and the main Stop button
    still end it.
  - The button shows its state (`aria-pressed`, "▶ Play" / "■ Stop").
  - Starting another voicing switches to it.
- **Play all** is a toggle too. It steps through every shipped voicing in
  order, a bar each, and repeats until pressed again or "Stop after" ends
  it.
- The chord's **bass note sounds in octave 2** under every voicing, so slash
  chords and inversions keep their bass. Because octave 2 is below the
  on-screen keyboard, the bass is named in the row text: "over E".
- The keys light on the on-screen keyboard (C3–B4) as each voicing plays.
  Voicings are placed so their notes fall inside C3–B4.
- Changing the chord updates the card. If a voicing is playing, it switches
  to the new chord, as the scale run does today.

## Non-goals and anti-goals

- No horns, ranges or timbres yet (later layers), and no tension meter yet.
- **Anti-goal:** shipping a voicing definition that sources disagree on, or
  wording copied from a book. Each definition needs two independent sources
  (the repo's two-source rule), cited in `docs/theory-sources.md`. A voicing
  without two is listed as "Waiting for sources" and not offered.
- **Anti-goal:** hand-written note lists. Voicings are computed from the
  chord's intervals in `public/js/theory/`.

## The voicings (the first set, subject to sources)

**Close:** the chord tones as close together as possible, inside an octave.

**Drop 2, drop 3, drop 2 & 4:** start from a four-note close voicing, then
move the 2nd voice from the top (or the 3rd, or the 2nd and 4th) down an
octave.

**Spread (open):** the tones spread over more than an octave. This is the
exact rule the sources give.

**Quartal:** the tones stacked in fourths. This needs a stated rule for
chords whose tones don't stack in fourths: the voicing either uses the
chord's scale tones as the sources describe, or it isn't offered for that
chord.

**Cluster:** the tones packed in seconds, using the chord tones and the
tensions the sources allow.

**Rootless A and B:** the common jazz left-hand shapes (3–5–7–9 and 7–9–3–5,
or as the sources define them). The bass note still sounds below them.

## Decided after the builder check (2026-11-24)

- **Extra notes** (the tones beyond the chord's own, used by quartal,
  cluster and rootless voicings) come from the chord's **Russell parent
  scale**, the one the app already shows (Cmaj7 → C Lydian, so ♯11 may
  appear).
  - *My call:* David moved on without choosing.
  - The alternatives were the selected scale card, or the usual jazz
    avoid-note rules.
  - It's easy to change: the engine takes the scale as a parameter.
- **Two-source rule:** each voicing's *definition* needs two independent
  sources. Applying a definition to any chord is computation, like scales.
  The rootless A/B voicings are offered only on the chord families their
  sources cover. *My call.*
- **Hands:** the upper voicing may use both hands (a span of up to two
  octaves, inside C3–B4). The octave-2 bass is a separate bass voice, as a
  bassist would play it. *My call.*

## Tonal gravity and modal freedom (David, 2026-11-24)

- **Extra notes come from Russell's parent scale.** This is now David's
  decision, not my call.
- **Every row shows a gravity reading:**
  - each note's rank in the order of tonal gravity (1–12), counted from the
    **centre**
  - a one-line reading of how far out the voicing reaches (its most outward
    tone)
  - **No resolution arrows.** David: "If it's going outward, it's not
    necessarily going somewhere immediately." The wording describes and
    never tells the player to resolve. Example: "reaches outward to F♯ (♯4);
    it can stay there."
- **The centre is the drone note** ("Drone on: Bass note / Lydian tonic /
  Chord root / Other note"; default the bass note).
  - Example: D-7 with the drone on G (or typed D-7/G) is counted from G.
  - The card names the colour from the centre when it is a major-scale mode:
    "heard from G: G Mixolydian".
  - Russell's own analysis (Lydian tonic F, parent F Lydian) stays shown and
    unchanged; the centre is an extra lens.
- **Next step, not this one:** voice leading into a chosen next chord
  (including modal planing, e.g. D-7 → E♭-7), with each voice's move marked
  toward home or away, as a choice and never an obligation.

## Rules the builder must settle, with sources

Each of these must be sourced or stated as the app's own convention in
`docs/theory-sources.md`:

- **Chords that don't have four tones.**
  - Triads: which tone is doubled for four-note voicings.
  - 6/9, 9, 11 and 13 chords: which four tones are kept (for example 3, 5
    or 13, 7, 9) for the drop voicings.
- **Which inversion of the close voicing each drop voicing starts from.**
  Proposed: the one whose top note is nearest the middle of the keyboard
  window, as a stated convention.
- **What each voicing does with the root** when the bass already sounds it.

## Constraints

- All CLAUDE.md rules apply:
  - strict CSP; no inline code
  - tokens only; WCAG 2.2 AA
  - sound starts only from a press and stops on its own (Stop after, idle,
    hidden tab)
  - `localStorage` via `prefs.js` (nothing new needs storing)
- **Accessibility:**
  - Each row is reachable by keyboard.
  - Play buttons have names that include the voicing ("Play drop 2").
  - The playing row is marked without colour alone.
  - The notes are text, so screen readers read them.
  - Announcements are polite and one per press.
- Reflows at 320 px with no sideways scroll.
- Uses the existing piano sound and the drone setting is unaffected.
  Voicings play without the drone unless "Hold the drone underneath" is
  ticked, as the scale run does.

## Approaches considered

1. **A Voicings card in Practice** (chosen by David). It uses the chord
   already set and the existing keyboard, so it is the fastest way to hear
   your chord. It can move to its own tab later.
2. **A new Voicings tab.** More room for sections and tension maps later,
   but it means switching tabs and losing sight of the scales.
3. **Voicings inside each scale card.** This mixes two ideas and crowds the
   cards.

## The how, as decided

- Piano only (David).
- The card sits in Practice (David).
- A pure module `public/js/theory/voicings.js` computes each voicing from the
  chord. The existing `voicing.js` (used by Learn's progressions) stays as
  it is.
- Data for each voicing: id, name, sources, status ('verified' or
  'pending'), and a function from chord to MIDI notes.

## Left to the builder

- Exact placement within C3–B4.
- Whether Play all pauses a beat between voicings.
- The card's visual layout within the existing tokens.
- Test details.
