/**
 * Records every phrase and word the app can say, for every language app, with
 * free local neural voices (Piper, https://github.com/rhasspy/piper).
 *
 * - Latin: Italian-trained voices driven with classical Latin phonemes from src/lib/latin.ts.
 * - German, Spanish, French: native voices, phonemes from eSpeak NG (what Piper was trained on),
 *   plus a "say it like this" guide for each phrase, worked out from the same phonemes.
 *
 * Output: public/audio/[<lang>/][m/]<id>.mp3 and src/data/audio-index.json / audio-<lang>.json.
 * Only new or changed text is re-recorded, so re-running is quick.
 *
 *   npm run audio                     every language, both voices
 *   npm run audio -- --lang de        one language
 *   npm run audio -- --all            re-record everything
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/';
const TTS_DIR = join(root, 'tts');

const LANGS = {
  la: {
    name: 'Latin',
    female: { model: 'it_IT-paola-medium', path: 'it/it_IT/paola/medium/' },
    male: { model: 'it_IT-riccardo-x_low', path: 'it/it_IT/riccardo/x_low/' },
  },
  de: {
    name: 'German',
    espeak: 'de',
    female: { model: 'de_DE-kerstin-low', path: 'de/de_DE/kerstin/low/' },
    male: { model: 'de_DE-thorsten-medium', path: 'de/de_DE/thorsten/medium/' },
  },
  es: {
    name: 'Spanish',
    espeak: 'es',
    female: { model: 'es_ES-sharvard-medium', path: 'es/es_ES/sharvard/medium/', speaker: 'F' },
    male: { model: 'es_ES-sharvard-medium', path: 'es/es_ES/sharvard/medium/', speaker: 'M' },
  },
  fr: {
    name: 'French',
    espeak: 'fr-fr',
    female: { model: 'fr_FR-upmc-medium', path: 'fr/fr_FR/upmc/medium/', speaker: 'jessica' },
    male: { model: 'fr_FR-upmc-medium', path: 'fr/fr_FR/upmc/medium/', speaker: 'pierre' },
  },
};

/** Bump to re-record everything after changing the settings below. */
const SETTINGS = { v: 2, lengthScale: 1.2, noiseScale: 0.5, noiseW: 0.5, kbps: 40, gap: 0.3 };

const argv = process.argv.slice(2);
const only = argv.includes('--lang') ? argv[argv.indexOf('--lang') + 1] : null;
const all = argv.includes('--all');

async function download(path, file) {
  const dest = join(TTS_DIR, file);
  if (existsSync(dest)) return dest;
  mkdirSync(TTS_DIR, { recursive: true });
  console.log(`  downloading voice ${file}…`);
  const res = await fetch(HF + path + file);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${HF + path + file}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

// --- The app's own text and phoneme code, loaded through Vite --------------------

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => vite.ssrLoadModule(p);
const { speakablePhrases, speakableWords } = await load('/src/data/speakable.ts');
const { toPhonemes } = await load('/src/lib/latin.ts');
const { audioKey, audioId } = await load('/src/lib/audio-key.ts');
const courseSets = {};
const refs = {};
for (const id of Object.keys(LANGS)) {
  courseSets[id] = (await load(`/src/data/courses/${id}.ts`).catch(() => load(`/src/data/courses/${id}/index.ts`))).courses;
  refs[id] = (await load(`/src/data/ref/${id}.ts`)).ref;
}
await vite.close();

// --- eSpeak NG phonemes (for the modern languages) ----------------------------------

let espeak;
async function espeakIpa(lang, text) {
  if (!espeak) {
    const { default: Module } = await import('@echogarden/espeak-ng-emscripten');
    espeak = new (await Module()).eSpeakNGWorker();
  }
  espeak.set_voice(lang);
  return espeak.synthesize_ipa(text).ipa.trim().replace(/_/g, '').replace(/\n+/g, ', ');
}

/** Phonemes for one phrase, sentence by sentence, keeping the closing punctuation. */
async function phonemes(lang, text) {
  if (lang === 'la') return toPhonemes(text);
  const sentences = text.replace(/[¡¿«»“”"]/g, '').match(/[^.!?]+[.!?]*/g) ?? [];
  const out = [];
  for (const s of sentences) {
    const end = /[.!?]$/.test(s.trim()) ? s.trim().slice(-1) : '';
    const body = s.replace(/[.!?…]+/g, ' ').trim();
    if (body) out.push((await espeakIpa(LANGS[lang].espeak, body)) + end);
  }
  return out.join(' ');
}

// --- "Say it like this" guides from IPA ----------------------------------------------

const SAY = [
  ['ɑ̃', 'ahn'], ['ɔ̃', 'ohn'], ['ɛ̃', 'an'], ['œ̃', 'un'],
  ['aɪ', 'eye'], ['aʊ', 'ow'], ['ɔʏ', 'oy'], ['ɔɪ', 'oy'], ['eɪ', 'ay'],
  ['tʃ', 'ch'], ['dʒ', 'j'], ['ts', 'ts'], ['pf', 'pf'],
  ['aː', 'ah'], ['a', 'ah'], ['ɑ', 'ah'], ['ɐ', 'uh'], ['ə', 'uh'],
  ['eː', 'ay'], ['e', 'ay'], ['ɛː', 'eh'], ['ɛ', 'eh'],
  ['iː', 'ee'], ['i', 'ee'], ['ɪ', 'i'],
  ['oː', 'oh'], ['o', 'oh'], ['ɔ', 'o'],
  ['uː', 'oo'], ['u', 'oo'], ['ʊ', 'u'],
  ['yː', 'ü'], ['y', 'ü'], ['ʏ', 'ü'], ['øː', 'ö'], ['ø', 'ö'], ['œ', 'ö'],
  ['ʃ', 'sh'], ['ʒ', 'zh'], ['ç', 'kh'], ['x', 'kh'], ['χ', 'kh'], ['ʁ', 'r'], ['r', 'rr'], ['ɾ', 'r'],
  ['j', 'y'], ['ɲ', 'ny'], ['ŋ', 'ng'], ['ʎ', 'ly'], ['θ', 'th'], ['ð', 'th'], ['β', 'b'], ['ɣ', 'g'],
  ['ɡ', 'g'], ['ɥ', 'w'], ['ʔ', ''], ['ɫ', 'l'],
];
const VOWEL_SAY = new Set(['ahn', 'ohn', 'an', 'un', 'eye', 'ow', 'oy', 'ay', 'ah', 'uh', 'eh', 'ee', 'i', 'oh', 'o', 'oo', 'u', 'ü', 'ö']);

function wordSay(ipa) {
  const segs = [];
  let stressNext = false;
  for (let i = 0; i < ipa.length; ) {
    const ch = ipa[i];
    if (ch === 'ˈ') {
      stressNext = true;
      i++;
      continue;
    }
    if ('ˌːˑ̯̩-'.includes(ch)) {
      i++;
      continue;
    }
    const hit = SAY.find(([k]) => ipa.startsWith(k, i));
    const [k, v] = hit ?? [ch, /[a-z]/.test(ch) ? ch : ''];
    i += k.length;
    if (!v) continue;
    const vowel = hit ? VOWEL_SAY.has(v) && !['ch', 'j'].includes(v) : false;
    segs.push({ v, vowel, stress: vowel && stressNext });
    if (vowel) stressNext = false;
  }
  // Syllables: each vowel takes the consonants before it (one stays behind if there are several).
  const sylls = [];
  let cur = { text: '', stress: false, hasVowel: false };
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.vowel && cur.hasVowel) {
      sylls.push(cur);
      cur = { text: '', stress: false, hasVowel: false };
    }
    if (!s.vowel && cur.hasVowel) {
      const rest = segs.slice(i);
      const next = rest.findIndex((x) => x.vowel);
      if (next > 0 && next < 2) {
        sylls.push(cur);
        cur = { text: '', stress: false, hasVowel: false };
      }
    }
    cur.text += s.v;
    if (s.vowel) cur.hasVowel = true;
    if (s.stress) cur.stress = true;
  }
  if (cur.text) {
    if (!cur.hasVowel && sylls.length) sylls[sylls.length - 1].text += cur.text;
    else sylls.push(cur);
  }
  const many = sylls.length > 1;
  return sylls.map((s) => (many && s.stress ? s.text.toUpperCase() : s.text)).join('-');
}

const ipaToSay = (ipa) => ipa.replace(/[.,!?;:]/g, ' ').split(/\s+/).filter(Boolean).map(wordSay).join(' ');

// --- Synthesis -------------------------------------------------------------------------

const ort = require('onnxruntime-node');
const { Mp3Encoder } = await import('@breezystack/lamejs');
const sessions = new Map();

async function voice(v) {
  if (!sessions.has(v.model)) {
    const config = JSON.parse(readFileSync(await download(v.path, `${v.model}.onnx.json`), 'utf8'));
    const session = await ort.InferenceSession.create(await download(v.path, `${v.model}.onnx`));
    sessions.set(v.model, { config, session });
  }
  const { config, session } = sessions.get(v.model);
  return { config, session, sid: v.speaker !== undefined ? config.speaker_id_map[v.speaker] : undefined };
}

function trim(a, rate) {
  const frame = Math.round(rate / 100);
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

async function synth(vc, ipa) {
  const map = vc.config.phoneme_id_map;
  const rate = vc.config.audio.sample_rate;
  const parts = [];
  for (const [i, s] of ipa.split(/(?<=[.!?])\s+/).filter(Boolean).entries()) {
    const ids = [...map['^'], ...map['_']];
    for (const ch of Array.from(s)) if (map[ch]) ids.push(...map[ch], ...map['_']);
    ids.push(...map['$']);
    const feeds = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([SETTINGS.noiseScale, SETTINGS.lengthScale, SETTINGS.noiseW]), [3]),
    };
    if (vc.sid !== undefined) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(vc.sid)]), [1]);
    if (i) parts.push(new Float32Array(Math.round(rate * SETTINGS.gap)));
    parts.push(trim((await vc.session.run(feeds)).output.data, rate));
  }
  const len = parts.reduce((n, p) => n + p.length, 0);
  const pcmF = new Float32Array(len);
  let o = 0;
  for (const p of parts) (pcmF.set(p, o), (o += p.length));
  let peak = 0;
  for (const x of pcmF) peak = Math.max(peak, Math.abs(x));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(pcmF[i] * gain * 32767)));
  const enc = new Mp3Encoder(1, rate, SETTINGS.kbps);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  chunks.push(enc.flush());
  return { mp3: Buffer.concat(chunks.filter((c) => c.length).map((c) => Buffer.from(c.buffer, c.byteOffset, c.length))), seconds: len / rate };
}

// --- Record each language ------------------------------------------------------------------

for (const [lang, L] of Object.entries(LANGS)) {
  if (only && only !== lang) continue;
  const courses = courseSets[lang];
  if (!courses?.length) continue;
  const phrases = speakablePhrases(courses, refs[lang], lang === 'la');
  const jobs = new Map(); // id → { key, text, ipa }
  for (const text of [...phrases, ...speakableWords(phrases)]) {
    const key = audioKey(text);
    const id = audioId(key);
    const prev = jobs.get(id);
    if (prev && prev.key !== key) throw new Error(`Clip id clash in ${lang}: "${prev.key}" and "${key}". Change one of them slightly.`);
    if (!prev) jobs.set(id, { key, text, ipa: await phonemes(lang, text) });
  }

  const base = join(root, 'public', 'audio', ...(lang === 'la' ? [] : [lang]));
  for (const [kind, v] of [['female', L.female], ['male', L.male]]) {
    const dir = kind === 'male' ? join(base, 'm') : base;
    const cacheFile = join(TTS_DIR, `cache-${lang}-${kind}.json`);
    mkdirSync(dir, { recursive: true });
    const cache = !all && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
    const stamp = (ipa) => `${SETTINGS.v}|${SETTINGS.lengthScale}|${SETTINGS.noiseScale}|${SETTINGS.noiseW}|${SETTINGS.kbps}|${v.model}|${v.speaker ?? ''}|${ipa}`;
    const vc = await voice(v);
    let made = 0;
    let seconds = 0;
    for (const [id, job] of jobs) {
      const file = join(dir, `${id}.mp3`);
      if (cache[id] === stamp(job.ipa) && existsSync(file)) continue;
      const clip = await synth(vc, job.ipa);
      writeFileSync(file, clip.mp3);
      cache[id] = stamp(job.ipa);
      seconds += clip.seconds;
      if (++made % 200 === 0) console.log(`  ${L.name} ${kind}: ${made} clips…`);
    }
    let removed = 0;
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.mp3'))) {
      if (!jobs.has(f.slice(0, -4))) {
        unlinkSync(join(dir, f));
        delete cache[f.slice(0, -4)];
        removed++;
      }
    }
    writeFileSync(cacheFile, JSON.stringify(cache));
    console.log(`${L.name} ${kind} (${v.model}${v.speaker ? ` ${v.speaker}` : ''}): ${made} new clip(s), ${seconds.toFixed(0)} s of speech, ${removed} removed, ${jobs.size} total.`);
  }

  const ids = [...jobs.keys()].sort();
  const index = { voice: `${L.female.model} / ${L.male.model} (Piper)`, ids };
  if (lang !== 'la') index.say = Object.fromEntries(ids.map((id) => [id, ipaToSay(jobs.get(id).ipa)]));
  writeFileSync(join(root, 'src', 'data', lang === 'la' ? 'audio-index.json' : `audio-${lang}.json`), JSON.stringify(index) + '\n');
}
