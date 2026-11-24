# Progress bookmark

Last updated: 2026-11-24 (Stop after in bars, drone sounds and a lower scale octave, in review in #15).
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

1. **#15**: review, checks, then merge when David says.
2. **Sound and arranging library** (David, 2026-11-24): instruments, ranges,
   voicings (drop 2, clusters, big band section writing) and textures tied
   to tension and release, and to inside and outside on the chromatic tonal
   gravity; later score writing, an improviser and performance tools.
   Brainstorm first. Open questions for David: what a player should do with
   it first, and what he means by "coupled" and "entangled".
3. **Form & Gravity lab** and the **book check** (see "Open ideas" 1).

Working notes:
- The environment "David Petry sites" now allows the research hosts used
  for theory checks: scholar.colorado.edu, files.mcclimon.org,
  www.diva-portal.org, jazzimproviser.com, www.italianpiano.com,
  www.andyfrench.co.uk and en.wikipedia.org.
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
