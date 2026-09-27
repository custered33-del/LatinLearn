import { describe, expect, it } from 'vitest';
import { RATE, compare, trimToSound } from './voicematch';
import { seeded } from './random';

/** A made-up "word": a few vowel-like buzzes with pitch and timbre that change over time. */
function word(parts: [number, number][], gap = 0.25, noise = 0, rng = seeded(1)): Float32Array {
  const seg = 0.12 * RATE;
  const pad = gap * RATE;
  const out = new Float32Array(pad * 2 + seg * parts.length);
  parts.forEach(([f0, formant], k) => {
    for (let i = 0; i < seg; i++) {
      const t = i / RATE;
      let v = 0;
      for (let h = 1; h * f0 < 4000; h++) v += Math.sin(2 * Math.PI * h * f0 * t) * Math.exp(-(((h * f0 - formant) / 500) ** 2));
      out[pad + k * seg + i] = v * 0.2;
    }
  });
  if (noise) for (let i = 0; i < out.length; i++) out[i] += (rng() - 0.5) * noise;
  return out;
}

describe('voice match', () => {
  const ref = word([[200, 700], [200, 1200], [200, 2300], [200, 900]], 0);
  it('finds the sound between the silences', () => {
    const x = word([[150, 700]], 0.5, 0.004);
    const t = trimToSound(x)!;
    expect(t.length).toBeLessThan(x.length * 0.5);
  });
  it('ignores silence and steady background noise', () => {
    expect(compare(new Float32Array(RATE), [ref])).toBeNull();
    expect(compare(word([], 0.5, 0.01), [ref])).toBeNull();
  });
  it('scores the same word in a lower voice with noise above a different word', () => {
    const same = compare(word([[120, 700], [120, 1200], [120, 2300], [120, 900]], 0.3, 0.01), [ref])!;
    const other = compare(word([[120, 2300], [120, 700], [120, 700], [120, 2300]], 0.3, 0.01), [ref])!;
    expect(same.score).toBeGreaterThan(other.score);
    expect(same.pace).toBeGreaterThan(0.8);
  });
});
