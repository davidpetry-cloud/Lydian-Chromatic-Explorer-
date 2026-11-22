// MIDI keyboard input. Nothing here runs until connect() is called from a
// button press. It asks for notes only (never SysEx), refuses inside another
// site's frame, reads note-on/note-off messages and ignores everything else,
// and stops listening after 20 quiet minutes. Browser APIs are passed in so
// the behaviour can be tested without a device.

const MESSAGES = {
  unsupported: "MIDI isn't available in this browser. Try Chrome, Edge or Firefox.",
  framed: 'MIDI stays off when this page is shown inside another site.',
  denied: "Permission was declined. You can allow MIDI in your browser's site settings, then try again.",
  'no-devices': "No MIDI keyboard found. Plug one in and it'll appear here.",
  'idle-stopped': 'Stopped listening after 20 quiet minutes. Press Connect to start again.',
  off: 'MIDI is off.',
};

export function createMidiInput({
  requestAccess, isFramed, onHeld, onStatus, onActivity = () => {},
  setTimer = setTimeout, clearTimer = clearTimeout,
  idleMs = 20 * 60 * 1000, settleMs = 250,
}) {
  let access = null;
  let listening = false;
  const held = new Set();
  let settleTimer = null;
  let idleTimer = null;
  let lastStatus = '';

  // Say each status once: re-attaching after a device change often repeats it.
  function status(state, message = MESSAGES[state]) {
    const key = `${state}|${message}`;
    if (key === lastStatus) return;
    lastStatus = key;
    onStatus({ state, message });
  }

  function resetIdle() {
    clearTimer(idleTimer);
    idleTimer = setTimer(() => stop('idle-stopped'), idleMs);
  }

  function onMessage({ data }) {
    if (!data || data.length < 3) return; // note messages are three bytes
    const kind = data[0] & 0xf0;
    const note = data[1];
    const pressed = kind === 0x90 && data[2] > 0;
    if (pressed) held.add(note);
    else if (kind === 0x80 || kind === 0x90) held.delete(note);
    else return;
    resetIdle();
    onActivity();
    clearTimer(settleTimer);
    // Report only after a key goes down: lifting fingers unevenly must not
    // turn Cmaj7 into C on the way out.
    if (pressed) settleTimer = setTimer(() => onHeld([...held].sort((a, b) => a - b)), settleMs);
  }

  function attach() {
    const inputs = [...access.inputs.values()].filter((i) => i.state !== 'disconnected');
    inputs.forEach((input) => { input.onmidimessage = onMessage; });
    if (inputs.length) status('listening', `Listening to ${inputs.map((i) => i.name || 'a MIDI keyboard').join(', ')}. Hold a chord.`);
    else status('no-devices');
  }

  function stop(state) {
    if (access) {
      for (const input of access.inputs.values()) input.onmidimessage = null;
      access.onstatechange = null;
    }
    clearTimer(settleTimer);
    clearTimer(idleTimer);
    held.clear();
    access = null;
    listening = false;
    status(state);
  }

  let pending = null;
  function connect() {
    // A second press while the browser is still asking shares the same request.
    if (!pending) pending = start().finally(() => { pending = null; });
    return pending;
  }

  async function start() {
    if (listening) { attach(); return; }
    if (isFramed()) { status('framed'); return; }
    if (typeof requestAccess !== 'function') { status('unsupported'); return; }
    try {
      access = await requestAccess({ sysex: false });
    } catch {
      access = null;
      status('denied');
      return;
    }
    listening = true;
    // A keyboard came or went: forget held notes (a pulled cable never sends note-offs).
    access.onstatechange = () => { if (listening) { held.clear(); attach(); } };
    attach();
    resetIdle();
  }

  return {
    connect,
    disconnect: () => stop('off'),
    isListening: () => listening,
  };
}
