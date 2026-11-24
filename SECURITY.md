# Security

## What protects this app

Every page is served with these headers (set in `public/_headers`):

| Header | Value | What it means |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; …` | Only this app's own script, style, font and audio files load. No inline scripts, `onclick=` attributes or inline styles run. The page can fetch from this site only (for the piano recordings), so it can't send data to any other site, and no other site can frame it. |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(self)` | Device features are off, except MIDI for this site only. |
| X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy | `nosniff`, `strict-origin-when-cross-origin`, `same-origin` | Standard hardening. |

The app uses no cookies, accounts, analytics or trackers and collects no
personal data. Its only network requests fetch its own recordings from
this site: the piano (`public/audio/piano/`) once, on the first press of a
play button, and the upright bass (`public/audio/bass/`) only if someone
chooses it as the drone sound; the site is static, so there is nothing there that could receive
data. If they fail to load, the built-in electric piano plays instead. It
keeps a few preferences in your browser's `localStorage` (theme, last
chord, volume, drone note, "Stop after"), and works without them.

**Why `connect-src 'self'` and not `'none'`:** the recordings are decoded
with `fetch()` and `decodeAudioData()`, which `connect-src` governs.
`'self'` allows this site only; every other address stays blocked, and the
attack tests below check that.

MIDI keyboards: the app asks the browser for MIDI only when you press
**Connect MIDI keyboard**, and asks again on each visit (nothing is
remembered). It requests note messages only (`sysex: false`), reads
note-on and note-off and ignores everything else, shows on screen and in
text whether it is listening, stops listening after 20 minutes without a
note, and refuses to start if the page is shown inside another site's frame
(on top of `frame-ancestors 'none'`). Device names are shown as plain text.
Nothing MIDI-related is stored or sent anywhere.

Sound starts only when you press a button, is always shown on screen and
in text, and stops on its own: drones, chord loops and scale runs fade out
after the "Stop after" time (30 seconds unless you choose longer), and
anything stops after 20 minutes without input or when you switch tabs.
Pressing Stop while the piano is still loading cancels the press.

## How it's tested

`npm test` runs on every pull request. It serves the app under these exact
headers and attacks it:

- **Injected code:** an inline `<script>`, an `onerror=` attribute and an
  `innerHTML` handler are added to the live page. None of them run, and the
  browser logs a policy violation.
- **Outside scripts:** a `<script src>` pointing at another site is refused.
- **Sending data out:** `fetch()` and `navigator.sendBeacon()` to another
  site are blocked, and no request leaves the page. The piano recordings
  are all fetched from the app's own address, and `_headers` must never
  list another site in `connect-src`.
- **Framing:** another site's page that frames the app gets nothing.
- **The page shell:** `public/index.html` must contain no inline scripts,
  styles or `on…=` handlers, and `public/_headers` must keep the policy.
- **Local preview server** (`tests/serve.mjs`, never deployed): it refuses
  malformed or `../` paths and never serves `_headers`.

Code review (November 2026) found no use of `innerHTML`, `eval`,
`new Function` or `document.write` in `public/`. The one network call is
`fetch()` in `public/js/audio/piano.js`, for the app's own recordings, by
relative path. Values read
back from storage are re-checked: an unknown chord falls back to Cmaj7, the
volume is clamped to 0–100, and the theme must be `light` or `dark`.

## Reporting a vulnerability

Please report security problems privately, not in a public issue: use
**"Report a vulnerability"** under this repository's **Security** tab, or
contact David Petry through https://david-petry.netlify.app/.
