/**
 * Records every phrase and word LatinLearn can say with a free, local neural
 * voice (Piper, https://github.com/rhasspy/piper). The voice was trained on
 * Italian; we drive it with classical Latin phonemes from src/lib/latin.ts.
 *
 * Output: public/audio/<id>.mp3 and src/data/audio-index.json.
 * Only new or changed text is re-recorded, so re-running is quick.
 *
 *   npm run audio            record what's missing
 *   npm run audio -- --all   re-record everything
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// --male records the same clips with a male voice into public/audio/m/.
const MALE = process.argv.includes('--male');
const VOICE = MALE ? 'it_IT-riccardo-x_low' : 'it_IT-paola-medium';
const VOICE_URL = `https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/${MALE ? 'riccardo/x_low' : 'paola/medium'}/`;
const TTS_DIR = join(root, 'tts');
const OUT_DIR = join(root, 'public', 'audio', ...(MALE ? ['m'] : []));
const INDEX = join(root, 'src', 'data', 'audio-index.json');
const CACHE = join(TTS_DIR, MALE ? 'cache-male.json' : 'cache.json');

/** Bump to re-record everything after changing the settings below. */
const SETTINGS = { v: 2, lengthScale: 1.2, noiseScale: 0.5, noiseW: 0.5, kbps: 40, gap: 0.3 };

async function download(file) {
  const dest = join(TTS_DIR, file);
  if (existsSync(dest)) return dest;
  mkdirSync(TTS_DIR, { recursive: true });
  console.log(`Downloading voice ${file}…`);
  const res = await fetch(VOICE_URL + file);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${VOICE_URL + file}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

// --- Load the app's own text and phoneme code through Vite --------------------

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { speakablePhrases, speakableWords } = await vite.ssrLoadModule('/src/data/speakable.ts');
const { toPhonemes } = await vite.ssrLoadModule('/src/lib/latin.ts');
const { audioKey, audioId } = await vite.ssrLoadModule('/src/lib/audio-key.ts');
await vite.close();

const phrases = speakablePhrases();
const jobs = new Map(); // id → { key, text, ipa }
for (const text of [...phrases, ...speakableWords(phrases)]) {
  const key = audioKey(text);
  const id = audioId(key);
  const prev = jobs.get(id);
  if (prev && prev.key !== key) throw new Error(`Clip id clash: "${prev.key}" and "${key}". Change one of them slightly.`);
  if (!prev) jobs.set(id, { key, text, ipa: toPhonemes(text) });
}

// --- Synthesis -----------------------------------------------------------------

const ort = require('onnxruntime-node');
const { Mp3Encoder } = await import('@breezystack/lamejs');
const config = JSON.parse(readFileSync(await download(`${VOICE}.onnx.json`), 'utf8'));
const session = await ort.InferenceSession.create(await download(`${VOICE}.onnx`));
const RATE = config.audio.sample_rate;
const idMap = config.phoneme_id_map;

function phonemeIds(ipa) {
  const ids = [...idMap['^'], ...idMap['_']];
  for (const ch of Array.from(ipa)) {
    if (!idMap[ch]) throw new Error(`Voice has no phoneme "${ch}" (in "${ipa}")`);
    ids.push(...idMap[ch], ...idMap['_']);
  }
  ids.push(...idMap['$']);
  return ids;
}

async function synthSentence(ipa) {
  const ids = phonemeIds(ipa);
  const out = await session.run({
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([SETTINGS.noiseScale, SETTINGS.lengthScale, SETTINGS.noiseW]), [3]),
  });
  return trim(out.output.data);
}

/** Cut leading and trailing silence, keeping a short natural margin. */
function trim(a) {
  const frame = Math.round(RATE / 100);
  let peak = 0;
  for (const x of a) peak = Math.max(peak, Math.abs(x));
  const loud = (i) => {
    for (let k = i; k < Math.min(a.length, i + frame); k++) if (Math.abs(a[k]) > peak * 0.04) return true;
    return false;
  };
  let start = 0;
  while (start < a.length && !loud(start)) start += frame;
  let end = a.length - frame;
  while (end > start && !loud(end)) end -= frame;
  return a.subarray(Math.max(0, start - frame * 4), Math.min(a.length, end + frame * 10));
}

async function synth(ipa) {
  const sentences = ipa.split(/(?<=[.!?])\s+/).filter(Boolean);
  const parts = [];
  for (const [i, s] of sentences.entries()) {
    if (i) parts.push(new Float32Array(Math.round(RATE * SETTINGS.gap)));
    parts.push(await synthSentence(s));
  }
  const len = parts.reduce((n, p) => n + p.length, 0);
  const all = new Float32Array(len);
  let o = 0;
  let peak = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  for (const x of all) peak = Math.max(peak, Math.abs(x));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(all[i] * gain * 32767)));
  return { pcm, seconds: len / RATE };
}

function mp3(pcm) {
  const enc = new Mp3Encoder(1, RATE, SETTINGS.kbps);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  chunks.push(enc.flush());
  return Buffer.concat(chunks.filter((c) => c.length).map((c) => Buffer.from(c.buffer, c.byteOffset, c.length)));
}

// --- Record what's new -------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const all = process.argv.includes('--all');
const cache = !all && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const stamp = (ipa) => `${SETTINGS.v}|${SETTINGS.lengthScale}|${SETTINGS.noiseScale}|${SETTINGS.noiseW}|${SETTINGS.kbps}|${ipa}`;

let made = 0;
let seconds = 0;
const started = Date.now();
for (const [id, job] of jobs) {
  const file = join(OUT_DIR, `${id}.mp3`);
  if (cache[id] === stamp(job.ipa) && existsSync(file)) continue;
  const clip = await synth(job.ipa);
  writeFileSync(file, mp3(clip.pcm));
  cache[id] = stamp(job.ipa);
  seconds += clip.seconds;
  if (++made % 100 === 0) console.log(`  ${made} clips…`);
}

// Remove clips for text that no longer exists.
let removed = 0;
for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith('.mp3'))) {
  const id = f.replace(/\.mp3$/, '');
  if (!jobs.has(id)) {
    unlinkSync(join(OUT_DIR, f));
    delete cache[id];
    removed++;
  }
}

writeFileSync(CACHE, JSON.stringify(cache));
if (!MALE) writeFileSync(INDEX, JSON.stringify({ voice: 'Paola (Piper, open-source neural voice)', ids: [...jobs.keys()].sort() }) + '\n');

let bytes = 0;
for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith('.mp3'))) bytes += readFileSync(join(OUT_DIR, f)).length;
console.log(
  `Recorded ${made} new clip(s) (${seconds.toFixed(0)} s of speech) in ${((Date.now() - started) / 1000).toFixed(1)} s, removed ${removed}. ` +
    `${jobs.size} clips, ${(bytes / 1e6).toFixed(1)} MB total.`,
);
