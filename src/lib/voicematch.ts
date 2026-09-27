/**
 * Voice match: scores pronunciation by comparing the learner's recording with
 * the native voice clip of the same word. No speech recognition and nothing
 * sent anywhere: both sounds are cut from the start of the noise to the end,
 * turned into MFCCs (the "shape" of each moment of sound, the way ears hear it),
 * normalised so different voices and microphones compare fairly, and lined up
 * with dynamic time warping so saying it faster or slower doesn't matter.
 */

export const RATE = 16000;
const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms
const FFT = 512;
const MELS = 26;
const COEFFS = 12;

// ---------------------------------------------------------------------------
// Pure signal processing (also used by the calibration script and tests)
// ---------------------------------------------------------------------------

/** Resample to 16 kHz, averaging over each output step so high sounds don't alias. */
export function resample(x: Float32Array, from: number): Float32Array {
  if (from === RATE) return x;
  const step = from / RATE;
  const out = new Float32Array(Math.floor(x.length / step));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * step);
    const b = Math.max(a + 1, Math.floor((i + 1) * step));
    let s = 0;
    for (let k = a; k < b && k < x.length; k++) s += x[k];
    out[i] = s / (b - a);
  }
  return out;
}

const rms = (x: Float32Array, a: number, n: number) => {
  let s = 0;
  for (let i = a; i < a + n && i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / n);
};

/**
 * Cut from the start of the sound to its end. Returns null if there's no clear sound.
 * `mic` recordings must also stand out from the background noise; clean clips needn't.
 */
export function trimToSound(x: Float32Array, mic = true): Float32Array | null {
  const energies: number[] = [];
  for (let a = 0; a + FRAME <= x.length; a += HOP) energies.push(rms(x, a, FRAME));
  if (!energies.length) return null;
  const peak = Math.max(...energies);
  const sorted = [...energies].sort((p, q) => p - q);
  const noise = sorted[Math.floor(sorted.length * 0.1)];
  if (peak < 0.004 || (mic && peak < noise * 3)) return null; // silence, or only steady background noise
  const threshold = mic ? Math.max(noise * 2.5, peak * 0.06) : peak * 0.06;
  const first = energies.findIndex((e) => e >= threshold);
  let last = energies.length - 1;
  while (last > first && energies[last] < threshold) last--;
  if ((last - first) * HOP < RATE * (mic ? 0.12 : 0.04)) return null; // a click, not a word
  return x.subarray(Math.max(0, (first - 3) * HOP), Math.min(x.length, (last + 3) * HOP + FRAME));
}

// Precomputed window, mel filters and DCT.
const WINDOW = Float32Array.from({ length: FRAME }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));
const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
const hz = (m: number) => 700 * (10 ** (m / 2595) - 1);
const FILTERS: Float32Array[] = (() => {
  const lo = mel(100);
  const hi = mel(7000);
  const bins = Array.from({ length: MELS + 2 }, (_, i) => Math.floor(((FFT + 1) * hz(lo + ((hi - lo) * i) / (MELS + 1))) / RATE));
  return Array.from({ length: MELS }, (_, m) => {
    const f = new Float32Array(FFT / 2 + 1);
    for (let k = bins[m]; k < bins[m + 1]; k++) f[k] = (k - bins[m]) / Math.max(1, bins[m + 1] - bins[m]);
    for (let k = bins[m + 1]; k < bins[m + 2]; k++) f[k] = (bins[m + 2] - k) / Math.max(1, bins[m + 2] - bins[m + 1]);
    return f;
  });
})();
const DCT: Float32Array[] = Array.from({ length: COEFFS }, (_, c) =>
  Float32Array.from({ length: MELS }, (_, m) => Math.cos((Math.PI * (c + 1) * (m + 0.5)) / MELS)),
);

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** MFCC frames (coefficients 1–12), normalised to zero mean and unit variance per coefficient. */
export function features(x: Float32Array): Float32Array[] {
  const frames: Float32Array[] = [];
  const re = new Float64Array(FFT);
  const im = new Float64Array(FFT);
  for (let a = 0; a + FRAME <= x.length; a += HOP) {
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < FRAME; i++) re[i] = (x[a + i] - 0.97 * (a + i > 0 ? x[a + i - 1] : 0)) * WINDOW[i];
    fft(re, im);
    const logMel = new Float32Array(MELS);
    for (let m = 0; m < MELS; m++) {
      let e = 0;
      const f = FILTERS[m];
      for (let k = 0; k <= FFT / 2; k++) if (f[k]) e += f[k] * (re[k] * re[k] + im[k] * im[k]);
      logMel[m] = Math.log(e + 1e-8);
    }
    frames.push(Float32Array.from(DCT, (row) => row.reduce((s, w, m) => s + w * logMel[m], 0)));
  }
  // Mean and variance normalisation: removes the microphone and most of the voice difference.
  for (let c = 0; c < COEFFS; c++) {
    let mean = 0;
    for (const f of frames) mean += f[c];
    mean /= frames.length || 1;
    let v = 0;
    for (const f of frames) v += (f[c] - mean) ** 2;
    const sd = Math.sqrt(v / (frames.length || 1)) || 1;
    for (const f of frames) f[c] = (f[c] - mean) / sd;
  }
  return frames;
}

/** Average frame distance along the best time alignment (dynamic time warping). */
export function dtw(a: Float32Array[], b: Float32Array[]): number {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;
  const band = Math.max(Math.abs(n - m) + 2, Math.round(Math.max(n, m) * 0.15));
  const INF = Number.POSITIVE_INFINITY;
  let prev = new Float64Array(m + 1).fill(INF);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(INF);
    const centre = Math.round((i * m) / n);
    for (let j = Math.max(1, centre - band); j <= Math.min(m, centre + band); j++) {
      let d = 0;
      const fa = a[i - 1];
      const fb = b[j - 1];
      for (let c = 0; c < COEFFS; c++) d += (fa[c] - fb[c]) ** 2;
      d = Math.sqrt(d / COEFFS);
      cur[j] = d + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[m] / (n + m);
}

export interface Match {
  /** 0–1: how closely it matches the native voice. */
  score: number;
  /** Your length ÷ the voice's length (1 = same speed). */
  pace: number;
}

// Distance → score: calibrated on the recordings (same word said by the other voice ≈ GOOD,
// a different word ≈ BAD), with some slack for real voices and microphones.
const GOOD = 0.6;
const BAD = 0.86;

/** Compare a recording with one or more reference clips (e.g. the female and male voice); the best match counts. */
export function compare(yours: Float32Array, refs: Float32Array[]): Match | null {
  const mine = trimToSound(yours);
  if (!mine) return null;
  const f = features(mine);
  let best: Match = { score: 0, pace: 1 };
  for (const r of refs) {
    const theirs = trimToSound(r, false);
    if (!theirs) continue;
    const pace = mine.length / theirs.length;
    let d = dtw(f, features(theirs));
    // Much too short or long (a different word, or only part of it) costs extra.
    if (pace < 0.45 || pace > 2.6) d += 0.15;
    const score = Math.max(0, Math.min(1, 1 - (d - GOOD) / (BAD - GOOD)));
    if (score > best.score) best = { score, pace };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Browser: record the microphone as raw sound, and load reference clips
// ---------------------------------------------------------------------------

export const voiceMatchSupported =
  typeof window !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== 'undefined';

export interface Capture {
  /** Live loudness 0–1, for the level meter. */
  level: () => number;
  /** Stop and get the recording at 16 kHz. */
  stop: () => Promise<Float32Array>;
  cancel: () => void;
}

const newContext = () => new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

export async function startCapture(): Promise<Capture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const ctx = newContext();
  await ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is old but works in every browser, including iPhone Home Screen apps.
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let level = 0;
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(d));
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    level = Math.min(1, Math.sqrt(s / d.length) * 6);
  };
  src.connect(proc);
  proc.connect(ctx.destination); // silent: nothing is written to the output
  const end = () => {
    proc.onaudioprocess = null;
    proc.disconnect();
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
  return {
    level: () => level,
    cancel: end,
    stop: async () => {
      const rate = ctx.sampleRate;
      end();
      const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0;
      for (const c of chunks) (all.set(c, o), (o += c.length));
      return resample(all, rate);
    },
  };
}

const refCache = new Map<string, Promise<Float32Array>>();

/** A reference clip as 16 kHz sound (cached). */
export function loadClip(url: string): Promise<Float32Array> {
  if (!refCache.has(url)) {
    const p = (async () => {
      const buf = await (await fetch(url)).arrayBuffer();
      const ctx = newContext();
      try {
        const audio = await new Promise<AudioBuffer>((ok, fail) => ctx.decodeAudioData(buf, ok, fail));
        return resample(audio.getChannelData(0), audio.sampleRate);
      } finally {
        void ctx.close();
      }
    })();
    p.catch(() => refCache.delete(url));
    refCache.set(url, p);
  }
  return refCache.get(url)!;
}

/** A recording as a WAV file, so learners can play themselves back. */
export function toWav(x: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + x.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + x.length * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
