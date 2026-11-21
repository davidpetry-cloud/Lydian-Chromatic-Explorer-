// Chord input: root and type pickers kept in step with a text field that
// reads chord symbols. Emits { chord, source: 'ui' }; MIDI input can later
// be a second source of the same events.
import { parseNote, noteName, pc, asciiName } from '../theory/notes.js';
import { QUALITIES, SUPPORTED_QUALITIES, parseChord } from '../theory/chords.js';
import { writePref } from '../prefs.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const symbolFor = (rootText, qualityId) => rootText + QUALITIES[qualityId].aliases[0];

export function mountChordInput({ rootSelect, qualitySelect, text, error, initial, onChord }) {
  for (const r of ROOTS) rootSelect.add(new Option(noteName(parseNote(r)), r));
  for (const id of SUPPORTED_QUALITIES) qualitySelect.add(new Option(QUALITIES[id].label, id));

  let timer = null;

  function syncPickers(chord) {
    const match = ROOTS.find((r) => pc(parseNote(r)) === pc(chord.root));
    rootSelect.value = match;
    qualitySelect.value = chord.quality;
  }

  function accept(chord) {
    error.textContent = '';
    text.removeAttribute('aria-invalid');
    syncPickers(chord);
    writePref('lce.chord', text.value.trim());
    onChord({ chord, source: 'ui' });
  }

  function readText() {
    clearTimeout(timer);
    const result = parseChord(text.value);
    if (result.error) {
      error.textContent = result.error;
      text.setAttribute('aria-invalid', 'true');
      return;
    }
    accept(result);
  }

  function readPickers() {
    // Keep the spelling the player typed (C# stays C#) when the picker agrees on the pitch.
    const typed = parseChord(text.value);
    const sameRoot = !typed.error && pc(typed.root) === pc(parseNote(rootSelect.value));
    const rootText = sameRoot ? asciiName(typed.root) : rootSelect.value;
    const result = parseChord(symbolFor(rootText, qualitySelect.value));
    if (!result.error) text.value = symbolFor(rootText, qualitySelect.value);
    if (!result.error) accept(result);
  }

  text.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(readText, 300); });
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); readText(); } });
  rootSelect.addEventListener('change', readPickers);
  qualitySelect.addEventListener('change', readPickers);

  text.value = initial.text;
  syncPickers(initial.chord);
  onChord({ chord: initial.chord, source: 'ui' });
}
