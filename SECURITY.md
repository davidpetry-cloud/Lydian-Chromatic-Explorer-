# Security

## What protects this app

Every page is served with these headers (set in `public/_headers`):

| Header | Value | What it means |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-ancestors 'none'; …` | Only this app's own script, style and font files load. No inline scripts, `onclick=` attributes or inline styles run. The page can't send data anywhere, and no other site can frame it. |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(self)` | Device features are off, except MIDI for this site only. |
| X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy | `nosniff`, `strict-origin-when-cross-origin`, `same-origin` | Standard hardening. |

The app uses no cookies, accounts, analytics or trackers, makes no network
requests and collects no personal data. It keeps three preferences in your
browser's `localStorage` (theme, last chord, volume), and works without them.

MIDI keyboards: the app asks the browser for MIDI only when you press
**Connect MIDI keyboard**, and asks again on each visit (nothing is
remembered). It requests note messages only (`sysex: false`), reads
note-on and note-off and ignores everything else, shows on screen and in
text whether it is listening, stops listening after 20 minutes without a
note, and refuses to start if the page is shown inside another site's frame
(on top of `frame-ancestors 'none'`). Device names are shown as plain text.
Nothing MIDI-related is stored or sent anywhere.

Sound starts only when you press a button, is always shown on screen and
in text, and stops on its own after 20 minutes without input or when you
switch tabs.

## How it's tested

`npm test` runs on every pull request. It serves the app under these exact
headers and attacks it:

- **Injected code:** an inline `<script>`, an `onerror=` attribute and an
  `innerHTML` handler are added to the live page. None of them run, and the
  browser logs a policy violation.
- **Outside scripts:** a `<script src>` pointing at another site is refused.
- **Sending data out:** `fetch()` and `navigator.sendBeacon()` to another
  site are blocked, and no request leaves the page.
- **Framing:** another site's page that frames the app gets nothing.
- **The page shell:** `public/index.html` must contain no inline scripts,
  styles or `on…=` handlers, and `public/_headers` must keep the policy.
- **Local preview server** (`tests/serve.mjs`, never deployed): it refuses
  malformed or `../` paths and never serves `_headers`.

Code review (November 2026) found no use of `innerHTML`, `eval`,
`new Function`, `document.write` or network APIs in `public/`. Values read
back from storage are re-checked: an unknown chord falls back to Cmaj7, the
volume is clamped to 0–100, and the theme must be `light` or `dark`.

## Reporting a vulnerability

Please report security problems privately, not in a public issue: use
**"Report a vulnerability"** under this repository's **Security** tab, or
contact David Petry through https://david-petry.netlify.app/.
