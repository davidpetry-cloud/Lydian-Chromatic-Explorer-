# Progress bookmark

Last updated: 2026-11-23 (after #11 went live). A snapshot of where the Lydian Chromatic Explorer
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

## Decisions to remember

- **Dominant chords** take the Lydian scale a whole step below the root
  (G7 → F Lydian), following two sources on Russell's derivation.
- **Only chords with two agreeing sources ship (19 types).** The rest are
  listed in the app under "Sources differ". See `docs/theory-sources.md`.
- **Hosting is Cloudflare, never Netlify,** because David's Netlify plan
  limits deploys.
- **Sound** is synthesized in the browser (FM electric piano). There are no
  sample files to license.
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

Start the **Form & Gravity lab** (gravity series, project 2) with a short
brainstorm: how David pictures building a section.

## Gravity series (agreed order)

1. **Learn tab:** done and live (#11), with slash chords and the bass-note
   drone. Review fixes included: examples play what the text says (G7 → C:
   B rises, F falls), Learn and Gravity playback isn't hijacked by Practice,
   the first chord is highlighted, and the "fifths" wording is exact.
2. **Form & Gravity lab:** sections of 4–8 bars, A/B sections that change key centre or harmonic rhythm, many chords at once, heard as the big picture.
3. **Live line feedback:** notes marked by gravity rank as you play (MIDI or clicks).

## Open ideas (not started)

1. **Book check:** with Russell's 4th edition, confirm or correct:
   - the "Sources differ" chords (10 waiting), then add them;
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
