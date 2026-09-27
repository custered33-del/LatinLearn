import { afterEach, describe, expect, it, vi } from 'vitest';

/** A pretend browser recogniser: the test says things and ends sessions like a phone does. */
class FakeRecognition {
  static last: FakeRecognition;
  static starts = 0;
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    FakeRecognition.starts++;
  }
  stop() {
    queueMicrotask(() => this.onend?.());
  }
  abort() {
    queueMicrotask(() => this.onend?.());
  }
  say(parts: { text: string[]; final: boolean }[]) {
    const results = parts.map((p) => Object.assign(p.text.map((t) => ({ transcript: t, confidence: 0.9 })), { isFinal: p.final }));
    this.onresult?.({ results });
  }
}

async function load() {
  vi.resetModules();
  vi.stubGlobal('window', { webkitSpeechRecognition: FakeRecognition });
  FakeRecognition.starts = 0;
  return import('./speech');
}

afterEach(() => vi.unstubAllGlobals());

describe('listen', () => {
  it('keeps listening through pauses and checks everything once stopped', async () => {
    const { listen } = await load();
    const live: string[] = [];
    const l = listen((t) => live.push(t), 'it-IT');
    const rec = FakeRecognition.last;
    expect(rec.continuous).toBe(true);

    rec.say([{ text: ['quid', 'qui'], final: true }]);
    rec.onend?.(); // the phone ended the session after a pause: it should restart
    expect(FakeRecognition.starts).toBe(2);
    rec.say([{ text: ['agis'], final: false }]);
    expect(live[live.length - 1]).toBe('quid agis');

    l.stop();
    const heard = await l.result;
    expect(heard[0]).toBe('quid agis');
    expect(heard).toContain('qui');
  });

  it('gives nothing back when nothing was said, and rejects when cancelled', async () => {
    const { listen } = await load();
    const quiet = listen(undefined, 'it-IT');
    quiet.stop();
    expect(await quiet.result).toEqual([]);

    const gone = listen(undefined, 'it-IT');
    gone.cancel();
    await expect(gone.result).rejects.toThrow('aborted');
  });
});
