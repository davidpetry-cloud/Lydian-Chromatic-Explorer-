// The MIDI panel in the "Your chord" card: a Connect button, a status line,
// and what the app heard. A chord held on the keyboard is handed to the
// chord input, exactly as if it had been typed.
import { createMidiInput } from '../input/midi-input.js';
import { recognizeChord } from '../input/recognize.js';

export function mountMidiPanel({ setChord }) {
  const connect = document.getElementById('midi-connect');
  const disconnect = document.getElementById('midi-disconnect');
  const status = document.getElementById('midi-status');
  const heard = document.getElementById('midi-heard');
  const label = connect.querySelector('.midi-label');

  function show({ state, message }) {
    const on = state === 'listening' || state === 'no-devices';
    status.textContent = message;
    connect.setAttribute('aria-pressed', String(on));
    connect.classList.toggle('is-listening', state === 'listening');
    label.textContent = on ? 'Listening' : 'Connect MIDI keyboard';
    disconnect.hidden = !on;
    if (!on) heard.textContent = '';
  }

  const midi = createMidiInput({
    requestAccess: typeof navigator.requestMIDIAccess === 'function' ? navigator.requestMIDIAccess.bind(navigator) : null,
    isFramed: () => window.top !== window.self,
    onStatus: show,
    onHeld(notes) {
      const result = recognizeChord(notes);
      if (!result) return; // fewer than three notes, or keys released: keep the chord
      if (result.error) { heard.textContent = result.error; return; }
      heard.textContent = `Heard ${result.heard} → ${result.chord.symbol}`;
      setChord(result.chord, 'midi');
    },
  });

  // A toggle: press to connect, press again to stop.
  connect.addEventListener('click', () => { if (midi.isListening()) midi.disconnect(); else midi.connect(); });
  disconnect.addEventListener('click', () => { midi.disconnect(); connect.focus(); });
}
