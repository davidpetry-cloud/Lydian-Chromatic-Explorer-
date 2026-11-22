import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMidiInput } from '../public/js/input/midi-input.js';

function fakeTimers() {
  let now = 0; let next = 1; const pending = new Map();
  return {
    setTimer: (fn, ms) => { const id = next++; pending.set(id, { fn, at: now + ms }); return id; },
    clearTimer: (id) => { pending.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, t] of [...pending].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= now && pending.has(id)) { pending.delete(id); t.fn(); }
      }
    },
  };
}

function fakeAccess(names = ['Test Keys']) {
  const access = { inputs: new Map(), onstatechange: null };
  names.forEach((name, i) => access.inputs.set(`in${i}`, { name, onmidimessage: null }));
  return access;
}

const send = (input, data) => input.onmidimessage?.({ data: Uint8Array.from(data) });

function setup({ access = fakeAccess(), requestAccess, isFramed = () => false } = {}) {
  const timers = fakeTimers();
  const held = []; const statuses = []; const calls = [];
  const midi = createMidiInput({
    requestAccess: requestAccess === undefined ? async (opts) => { calls.push(opts); return access; } : requestAccess,
    isFramed,
    onHeld: (notes) => held.push(notes),
    onStatus: (s) => statuses.push(s),
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  return { midi, timers, held, statuses, calls, access, last: () => statuses.at(-1) };
}

test('no Web MIDI in the browser → unsupported', async () => {
  const s = setup({ requestAccess: null });
  await s.midi.connect();
  assert.equal(s.last().state, 'unsupported');
  assert.equal(s.last().message, "MIDI isn't available in this browser. Try Chrome, Edge or Firefox.");
  assert.equal(s.midi.isListening(), false);
});

test('inside another site\'s frame → refuses without asking for MIDI', async () => {
  let asked = false;
  const s = setup({ isFramed: () => true, requestAccess: async () => { asked = true; return fakeAccess(); } });
  await s.midi.connect();
  assert.equal(s.last().state, 'framed');
  assert.equal(asked, false);
});

test('permission declined → denied', async () => {
  const s = setup({ requestAccess: async () => { throw new Error('NotAllowedError'); } });
  await s.midi.connect();
  assert.equal(s.last().state, 'denied');
});

test('asks for notes only, never SysEx', async () => {
  const s = setup();
  await s.midi.connect();
  assert.deepEqual(s.calls, [{ sysex: false }]);
  assert.equal(s.last().state, 'listening');
  assert.equal(s.last().message, 'Listening to Test Keys. Hold a chord.');
});

test('no keyboard, then plugged in → listening', async () => {
  const access = fakeAccess([]);
  const s = setup({ access });
  await s.midi.connect();
  assert.equal(s.last().state, 'no-devices');
  access.inputs.set('x', { name: 'Late Keys', onmidimessage: null });
  access.onstatechange?.({});
  assert.equal(s.last().state, 'listening');
  assert.match(s.last().message, /Late Keys/);
});

test('unplugged mid-session → no-devices', async () => {
  const s = setup();
  await s.midi.connect();
  s.access.inputs.clear();
  s.access.onstatechange?.({});
  assert.equal(s.last().state, 'no-devices');
});

test('a rolled chord is reported once, after it settles', async () => {
  const s = setup();
  await s.midi.connect();
  const input = s.access.inputs.get('in0');
  send(input, [0x90, 60, 90]); s.timers.advance(50);
  send(input, [0x90, 64, 90]); s.timers.advance(50);
  send(input, [0x91, 67, 90]);
  s.timers.advance(150);
  assert.deepEqual(s.held, [[60, 64, 67]]);
});

test('note-off and velocity-0 note-on both release; other messages are ignored', async () => {
  const s = setup();
  await s.midi.connect();
  const input = s.access.inputs.get('in0');
  [60, 64, 67].forEach((n) => send(input, [0x90, n, 100]));
  send(input, [0xB0, 1, 64]);
  send(input, [0x90, 64, 0]);
  send(input, [0x80, 60, 0]);
  s.timers.advance(150);
  assert.deepEqual(s.held.at(-1), [67]);
  send(input, [0x80, 67, 0]);
  s.timers.advance(150);
  assert.deepEqual(s.held.at(-1), []);
});

test('pressing Connect twice does not double-report', async () => {
  const s = setup();
  await s.midi.connect();
  await s.midi.connect();
  send(s.access.inputs.get('in0'), [0x90, 60, 100]);
  s.timers.advance(150);
  assert.equal(s.held.length, 1);
});

test('stops listening after 20 quiet minutes', async () => {
  const s = setup();
  await s.midi.connect();
  s.timers.advance(19 * 60 * 1000);
  send(s.access.inputs.get('in0'), [0x90, 60, 100]);
  s.timers.advance(19 * 60 * 1000);
  assert.equal(s.midi.isListening(), true);
  s.timers.advance(60 * 1000 + 1);
  assert.equal(s.last().state, 'idle-stopped');
  assert.equal(s.midi.isListening(), false);
  assert.equal(s.access.inputs.get('in0').onmidimessage, null);
});

test('disconnect turns everything off', async () => {
  const s = setup();
  await s.midi.connect();
  s.midi.disconnect();
  assert.equal(s.last().state, 'off');
  assert.equal(s.last().message, 'MIDI is off.');
  assert.equal(s.access.inputs.get('in0').onmidimessage, null);
  assert.equal(s.access.onstatechange, null);
  assert.equal(s.midi.isListening(), false);
});
