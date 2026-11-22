# MIDI chord input: design (short)

Date: 2026-11-22 · Approved by David in conversation · Builds on
`2026-11-21-lydian-chromatic-explorer-design.md` (section 6.6 left the seam).

## Intent

Let a player hold a chord on a real MIDI keyboard and have the Practice view
set that chord, the same as typing it, so their hands stay on the keys.

## Goals / non-goals

- **Goal:** chord recognition from held notes sets the current chord.
- **Non-goals (David chose these out):** lighting on-screen keys from MIDI,
  inside/outside feedback, playing MIDI notes through the app's sound.
- **Anti-goals:** anything touching MIDI before a press; remembering access
  between visits; SysEx; naming chords the app hasn't verified.

## Approaches

| | Approach | Verdict |
|---|---|---|
| **Chosen** | Browser Web MIDI API, no library | A few lines to read note messages; nothing to patch |
| Rejected | A MIDI library (WEBMIDI.js) | A dependency for little gain |
| Rejected | A native bridge or plug-in | The app must stay a plain web page |

## Design

1. **Connect:** a "Connect MIDI keyboard" button in the "Your chord" card.
   `navigator.requestMIDIAccess({ sysex: false })` runs only on that press,
   and again on each visit; nothing is remembered.
2. **Status line** (`role="status"`, always visible):
   - "Listening to <device names>"
   - "No MIDI keyboard found — plug one in"
   - "MIDI isn't available in this browser — try Chrome, Edge or Firefox"
   - "Permission was declined"
   - "Stopped listening after 20 quiet minutes"

   A Disconnect button sits beside it. Hot-plugging updates the device list.
3. **Recognition** (pure function, `public/js/input/recognize.js`):
   - It runs on the set of held notes, 150 ms after the last change, when 3
     or more distinct pitch classes are held.
   - It matches the pitch-class set exactly against `SUPPORTED_QUALITIES`.
     The root candidates are the lowest note first, then the other held
     pitch classes in ascending order from the bass. The first exact match
     wins (C–E–G–A with C in the bass → C6; with A in the bass → Am7;
     E–G–B–C with E in the bass → Cmaj7).
   - Root spelling comes from the picker roots
     (C D♭ D E♭ E F F♯ G A♭ A B♭ B).
   - No match: "<notes> isn't a chord I know yet", and the current chord is
     kept. Releasing the keys keeps the chord.
4. **Hand-off:** a recognized chord goes through the same path as typing.
   The text field and pickers update, the chord is saved, and the change is
   announced. The source is tagged `'midi'`.
5. **Security** (CLAUDE.md):
   - `Permissions-Policy` changes `midi=()` to `midi=(self)`.
   - MIDI refuses to start if `window.top !== window.self` (defence in
     depth on top of `frame-ancestors 'none'`).
   - Note-on and note-off messages are read only (note-on with velocity 0
     counts as off); everything else is ignored.
   - Listening stops after 20 minutes without notes.
   - No network use (`connect-src 'none'` stays).
6. **Tests:**
   - unit tests for `recognize.js`: inversions, doubled notes, C6 vs Am7,
     unknown sets, fewer than 3 notes
   - e2e with a simulated `requestMIDIAccess`: connect, recognize, unknown
     chord, unsupported browser, declined permission, framed refusal,
     disconnect
   - the policy test updated for `midi=(self)`

## Left to the builder

Button styling within the tokens, exact copy wording (David's playful
voice), the module split.
