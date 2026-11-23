// The only place that touches localStorage. Values are JSON. Every access is
// wrapped, so a private window or blocked storage never breaks the app.
export function readPref(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** The saved volume, 0–100 (default 70), whatever is in storage. */
export function volumePref() {
  const v = readPref('lce.volume', 70);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 70;
}

const DRONE_DEFAULT = Object.freeze({ mode: 'bass', note: 'C' });

/** The saved drone choice, { mode, note }, falling back to the bass note. */
export function dronePref() {
  const v = readPref('lce.drone', null);
  const modes = ['bass', 'tonic', 'root', 'other'];
  if (!v || typeof v !== 'object' || !modes.includes(v.mode) || typeof v.note !== 'string') return { ...DRONE_DEFAULT };
  if (!/^[A-G](#|b)?$/.test(v.note)) return { ...DRONE_DEFAULT }; // one of the twelve picker notes
  return { mode: v.mode, note: v.note };
}

export function writePref(key, value) {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
