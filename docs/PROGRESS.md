# Progress bookmark

Last updated: 2026-11-24 (deferred minors fixed in #22; next: a sus2 chord in place of 7sus4, and passing diminished chords).
stands, so any future session (or person) can pick up from here.

## Live

- **App:** https://lydian-chromatic-explorer.davidpetry.workers.dev/
- **Hosting:** Cloudflare Workers (free), Worker `lydian-chromatic-explorer`,
  configured by `wrangler.jsonc`. Every merge to `main` redeploys; every pull
  request gets a preview build.
- **Linked from:** David's site, on the exercises page (under Drum Studio):
  https://david-petry.netlify.app/drum-exercises
- **Tests:** `npm test` runs on every pull request (GitHub Actions).
  Unit tests, plus Playwright tests under the real security headers.

## Done

| What | Where |
|---|---|
| Design and build plan | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| Practice view: chord → Lydian tonic, parent scale, seven principal scales ingoing → outgoing, keyboard, scale runs, drone, chord loop | #1 |
| Gravity view: twelve tones by the order of tonal gravity | #1 |
| Reference view: glossary, chord table, sources | #1 |
| Strict security policy, attack tests, accessibility fixes (WCAG 2.2 AA checks, 320 px reflow, reduced motion, screen-reader announcements) | #1 |
| Independent code review: all findings fixed, minors included | #1 |
| Live address in README and CLAUDE.md | #5 |
| `wrangler.jsonc`, so preview builds work | #6 |
| Dependabot updates: setup-node 7, checkout 7, Playwright 1.65.1 | #2, #3, #4 |
| Electric-piano sound; scale cards select without playing | #7 |
| MIDI keyboard: hold a chord to set it (bass note = root, inversions understood); review fixes: uneven releases, repeated strikes, unplugging, one announcement per chord, correct spellings | #8 |
| Each scale card also reads "From C: … · C Dorian" (major-mode names), with Start on: Chord root for playback | #9 |
| MIDI accepts seventh-family chords without the 5th (G B F = G7, G B F A = G9) | #9 |
| Site `CLAUDE.md`: new apps go on Cloudflare Workers; the Explorer's live address | david-petry-site#27 |
| 7 more chord types: 7♯11, maj9, add9, maj13, m9, m11, m13 (19 in all) | #10 |
| Slash chords and a bass-note drone everywhere (Drone on: bass, Lydian tonic, root, other) | #11 |
| Learn tab: six sourced, playable sections on tonal gravity, voice leading and the bass | #11 |
| Recorded grand piano (Salamander, CC BY 3.0) with the electric piano as fallback; **Stop after** (default 30 s) fades out drones, chord loops and scale runs; drones re-strike each bar; the chord loop holds its chord for the bar; Stop cancels a press still waiting for the piano | #13 |
| 9 more chord types from Russell's Chart A: m6, m7♭5, dim (inferred), 7♯5, 7alt, m(maj7), dim7, 7♭9, 7♯9 (28 in all; 7sus4 waits) | #14 |
| Scale runs an octave lower (octave 3, on the keyboard); **Stop after** in bars (2, 4, 6, 8 or until Stop; default 8); **Drone sound**: organ (default), synth pad, upright bass (VSCO 2 CE, CC0), piano, through a shared instrument format | #15 |
| **Voicings card** in Practice: your chord in sourced piano voicings (close, drop 2, drop 3, quartal, cluster, rootless A and B; drop 2 & 4 and spread wait for sources), extra notes from the Russell parent scale, Play/Stop toggles, Play all, and a tonal-gravity reading counted from the drone note (D-7 over G: G Mixolydian) | #16 |
| Docs and the paused bookmark | #17 |
| **Voice leading into a next chord** on the Voicings card: Smooth (smallest motion, aiming at the same voicing type) and Same shape (planing), each chord heard from its own drone note, each voice's move read toward home or away by gravity rank | #18 |
| `CLAUDE.md` rule: textbook, university and academic sources first; Wikipedia only when nothing better is found, and say so | #19 |
| Voicings sources upgraded to textbooks and university pages (Hutchinson, Berklee, SF Conservatory, Harvey Mudd, Stevens, Acevedo & Rush, Feezell); **drop 2 & 4 ships** | #20 |
| **Spread voicing** (Hutchinson's five notes: root, 7th and 3rd, then two parent-scale tones, keeping the chord's own colour tones); Smooth leads five voices into a triad; keys light only for notes on the keyboard | #21 |

## Decisions to remember

- **Dominant chords** take the Lydian scale a whole step below the root
  (G7 → F Lydian), following two sources on Russell's derivation.
- **Only chords with two agreeing sources ship (28 types; 7sus4 waits).** The rest are
  listed in the app under "Sources differ". See `docs/theory-sources.md`.
- **Hosting is Cloudflare, never Netlify,** because David's Netlify plan
  limits deploys.
- **Sound** is the Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0,
  credited in the footer and `THIRD-PARTY-NOTICES.md`): 25 notes, every
  three semitones from C1 to C7, 8 seconds each (so a bar at 40 bpm never drops out), about 2.3 MB, loaded from the app's own
  address on the first press (`connect-src 'self'`). Natural (stretch)
  tuning kept, as a real piano is tuned. Logic Pro's sounds can't be used:
  Apple's licence forbids redistributing them as samples.
- **Stop after** counts bars (2, 4, 6, 8 or until Stop; default 8, David's
  choice), following tempo changes; it applies to looping patterns only, and
  Learn examples always finish. Gravity counts at its 80 bpm.
- **Instruments** (`public/js/audio/instruments.js`) are the start of the
  future sound and arranging library: each says whether it holds or dies
  away. Organ and pad drones are one held voice; piano and bass re-strike.
- **Voicings** (David): piano first; extra notes from the Russell parent
  scale; Play is a toggle; gravity ranks are counted from the drone note,
  which is the app's convention (David's modal lens), labelled as such in
  `docs/theory-sources.md`; the wording describes and never prescribes
  ("if it's going outward, it's not necessarily going somewhere
  immediately").
- **Chords with two homes on Chart A** use the most ingoing one (David,
  2026-11-24), and the Reference table names the other. The two-source rule
  still comes first: 7♯9 uses the home both sources share (Auxiliary
  Diminished, tonic a whole step below), not the more ingoing one. Tonics a
  tritone or major third away take the spelling with fewer accidentals. The diminished
  triad ships as inferred (from m7♭5). 7sus4 waits: its pentatonic sound
  fits several Lydian tonics.
- **Two names for one scale:** Russell names a scale from the Lydian tonic
  (Cm7 → E♭ Lydian); cards also show it from the chord root (C Dorian),
  because players read it that way. Only the seven major-scale modes get
  mode names.
- **MIDI:** the bass note is the root; exact matches are tried before a
  missing 5th; rootless voicings are not guessed; chords settle 250 ms
  after the last key goes down; lifting keys never changes the chord.
- **Drone = bass note by default** (David): the slash note, or the root. Also
  Lydian tonic, chord root or any note. The bass never changes the Lydian
  analysis.
- **Learn tab** is for players arriving from David's site: every section
  names its tradition (Russell, classical or both) and cites two or more
  sources; practice ideas are labelled "Idea".
- **Model choice:** Opus (medium) for theory and feature work and reviews;
  Sonnet (medium) for small follow-ups.
- Sound starts only from a press. Picking a scale card only selects it.
  Changing the chord while something plays switches to the new chord.
  Gravity tones play over a tonic drone.

## Next step

1. **Later library layers** (the sound and arranging library): instrument
   ranges and timbres, horn sections (big band section writing), and the
   tension map (inside/outside, tension and release, coupled with tonal
   gravity).
2. **Form & Gravity lab** and the **book check** (see "Open ideas" 1).
3. **Drop 2 and drop 3 still cite Wikipedia and lesson sites:** Open Music
   Theory defines them but blocks automated reading. A page number from a
   Berklee Press book (Pease & Pullig, *Modern Jazz Voicings*) or a pasted
   passage would upgrade them.
4. **Deferred minors:** all fixed in #22 except two kept by design: 7♭9's
   spread tops out a 3rd apart (the row says "usually a fourth or fifth"),
   and Same shape from Spread into a triad reads "Not for this chord", as
   rootless and cluster do.

Working notes:
- The environment "David Petry sites" allows the research hosts used for
  theory checks: university and open-textbook sites (Puget Sound, Pressbooks,
  U of Minnesota, Harvey Mudd, Stevens, Berklee, SF Conservatory, Rutgers,
  LibreTexts, tobyrush.com, learnmusictheory.net) plus scholar.colorado.edu,
  files.mcclimon.org, www.diva-portal.org, jazzimproviser.com,
  www.italianpiano.com, www.andyfrench.co.uk and en.wikipedia.org. Pressbooks
  sites refuse automated reading even when allowed.
- Since #13 the first press loads the piano, so browser tests must wait for
  playback (`playing(page)` in `tests/e2e.test.mjs`) before reading what
  plays.

## Gravity series (agreed order)

1. **Learn tab:** done and live (#11), with slash chords and the bass-note
   drone. Review fixes included: examples play what the text says (G7 → C:
   B rises, F falls), Learn and Gravity playback isn't hijacked by Practice,
   the first chord is highlighted, and the "fifths" wording is exact.
2. **Form & Gravity lab:** sections of 4–8 bars, A/B sections that change key centre or harmonic rhythm, many chords at once, heard as the big picture.
3. **Live line feedback:** notes marked by gravity rank as you play (MIDI or clicks).

## Open ideas (not started)

0. **Passing diminished chords (David, 2026-11-24):** fully diminished 7th
   chords make good passing chords, e.g. Cmaj7 → C♯°7 → Dm7. Find two
   sources (textbook first), then add it to the dim7 row, the Learn tab or
   the next-chord section.

1. **Book check:** with Russell's 4th edition (or Baker), confirm or correct:
   - 7♯9's home (Auxiliary Diminished II in the app; Chart A also lists
     Lydian Diminished VII);
   - dim7's tonic (Lydian Diminished +IV; the second source names no mode);
   - the diminished triad (shipped as inferred, David's choice);
   - 7sus4, the one chord still pending (its pentatonic sound fits
     several Lydian tonics);
   - the dominant mapping (G7 → F Lydian);
   - positions 8–11 of the order of tonal gravity (inferred);
   - how Russell analyses a bass outside the parent scale (D/C). The app
     currently keeps the chord's own parent and says so.
2. **More MIDI** (David chose these out for now): lighting the on-screen
   keys from MIDI, inside/outside feedback while playing, playing MIDI
   notes through the app's sound.
3. **Horizontal scales:** the theory's horizontal side isn't in the app yet.
4. **Custom domain** (for example `lydian.<your domain>`), if David buys one.
5. **Cloudflare API connector** (`https://mcp.cloudflare.com/mcp`), which
   could read build logs. David chose to keep using the older Cloudflare
   Developer Platform connector, which works for status checks.
6. **Mode names beyond the major modes** (melodic-minor and other modes):
   names vary between sources, so they would need sourcing first.
