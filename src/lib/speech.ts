import { useEffect, useReducer, useState } from 'preact/hooks';
import { audioId, audioKey, planClips } from './audio-key';
import { respell, stripMacrons, toItalianSpelling } from './latin';
import { LANG, LANG_ID, type LangId } from '../lang';

// ---------------------------------------------------------------------------
// Audio settings
// ---------------------------------------------------------------------------

export interface AudioSettings {
  /** "latin": the recorded LatinLearn voice. "browser": the browser's built-in voices. */
  voice: 'latin' | 'male' | 'browser';
  slow: boolean;
}

const SETTINGS_KEY = 'latinlearn:audio';
let settings: AudioSettings = { voice: 'latin', slow: false };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<AudioSettings> | null;
  if (saved) settings = { voice: saved.voice === 'browser' || saved.voice === 'male' ? saved.voice : 'latin', slow: !!saved.slow };
} catch {
  /* defaults */
}
const settingsListeners = new Set<() => void>();

export const getAudioSettings = (): AudioSettings => settings;

export function setAudioSettings(patch: Partial<AudioSettings>): void {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* session only */
  }
  settingsListeners.forEach((fn) => fn());
}

export function useAudioSettings(): AudioSettings {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    settingsListeners.add(force as () => void);
    return () => {
      settingsListeners.delete(force as () => void);
    };
  }, []);
  return settings;
}

// ---------------------------------------------------------------------------
// The LatinLearn voice: clips recorded ahead of time by `npm run audio`
// ---------------------------------------------------------------------------

/** The play file sits in the project folder, next to public/. */
const CLIP_BASE = (import.meta.env.MODE === 'play' ? 'public/audio/' : 'audio/') + (LANG_ID === 'la' ? '' : `${LANG_ID}/`);

interface VoiceIndex {
  ids: string[];
  /** Pronunciation guides for the modern languages, keyed by clip id. */
  say?: Record<string, string>;
}
const INDEX: Record<LangId, () => Promise<{ default: VoiceIndex }>> = {
  la: () => import('../data/audio-index.json'),
  de: () => import('../data/audio-de.json'),
  es: () => import('../data/audio-es.json'),
  fr: () => import('../data/audio-fr.json'),
  zh: () => import('../data/audio-zh.json'),
  ar: () => import('../data/audio-ar.json'),
  ja: () => import('../data/audio-ja.json'),
  ru: () => import('../data/audio-ru.json'),
  vi: () => import('../data/audio-vi.json'),
};
let guides: Record<string, string> = {};

/** "How to say it" guide: worked out live for Latin, recorded with the clips for other languages. */
export function sayGuide(text: string): string {
  if (LANG_ID === 'la') return respell(text);
  return guides[audioId(audioKey(text))] ?? '';
}
const canPlayClips = typeof Audio !== 'undefined';

let clips: Set<string> | null = null;
let clipsLoading: Promise<void> | null = null;
/** Set when clip files can't be found (e.g. the play file was moved away from its folder). */
let clipsMissing = false;

/** True once the clip list has loaded (starts loading it if needed). */
export function useVoiceReady(): boolean {
  const [ready, setReady] = useState(clips !== null);
  useEffect(() => {
    if (!ready) void loadVoice().then(() => setReady(true));
  }, []);
  return ready;
}

/** Load the list of recorded clips (a small separate chunk). */
export function loadVoice(): Promise<void> {
  clipsLoading ??= INDEX[LANG_ID]().then(
    (m) => {
      clips = new Set(m.default.ids);
      guides = m.default.say ?? {};
    },
    () => {
      clips = new Set();
    },
  );
  return clipsLoading;
}

const hasClip = (id: string) => !!clips?.has(id);

/** Both voices' recordings of a word or phrase (for voice match), or none if it wasn't recorded on its own. */
export async function referenceClips(text: string): Promise<string[]> {
  await loadVoice();
  const id = audioId(audioKey(text));
  return hasClip(id) ? [`${CLIP_BASE}${id}.mp3`, `${CLIP_BASE}m/${id}.mp3`] : [];
}

let player: HTMLAudioElement | null = null;
let queue: string[] = [];
let queueText = '';
let gapTimer: ReturnType<typeof setTimeout> | undefined;
/** Pause between clips pieced together from separate words, so they don't run into each other. */
const WORD_GAP_MS = 140;

/** Tapping the same speaker again soon after replays it slowly. */
let lastText = '';
let lastAt = 0;
let slowNow = false;

function playNext(): void {
  const id = queue.shift();
  if (!id || !player) return;
  player.src = `${CLIP_BASE}${settings.voice === 'male' ? 'm/' : ''}${id}.mp3`;
  player.defaultPlaybackRate = player.playbackRate = slowNow ? 0.6 : settings.slow ? 0.75 : 1;
  player.play().catch((err: Error) => {
    // Autoplay blocks and interrupted plays are harmless; a missing file is not.
    if (err.name === 'NotSupportedError') onClipError();
  });
}

let clipPlayed = false;

/** A clip wouldn't load: say it with the browser voice instead. */
function onClipError(): void {
  if (!queueText) return;
  const text = queueText;
  queueText = '';
  queue = [];
  // If no clip has ever played, the audio folder is missing: stop trying.
  if (!clipPlayed) clipsMissing = true;
  browserSpeak(text);
}

function playClips(ids: string[], text: string): void {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.addEventListener('ended', () => {
      if (queue.length) gapTimer = setTimeout(playNext, WORD_GAP_MS);
    });
    player.addEventListener('playing', () => (clipPlayed = true));
    player.addEventListener('error', onClipError);
  }
  stopSpeaking();
  queue = ids.slice();
  queueText = text;
  playNext();
}

/** Fetch every clip for the chosen voice so the offline cache has them all. */
export async function downloadVoiceForOffline(onProgress: (done: number, total: number) => void): Promise<void> {
  await loadVoice();
  const ids = [...(clips ?? [])];
  const dir = `${CLIP_BASE}${settings.voice === 'male' ? 'm/' : ''}`;
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      await fetch(`${dir}${id}.mp3`).catch(() => undefined);
      onProgress(++done, ids.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

/** Can the LatinLearn voice say this (whole, or pieced together from recorded words)? */
export function voiceCanSay(text: string): boolean {
  return !!clips && !clipsMissing && planClips(text, hasClip) !== null;
}

export type VoiceUsed = 'latin' | 'browser' | 'none';

/** Which voice `speak(text)` will use right now. */
export function voiceFor(text: string): VoiceUsed {
  if (settings.voice !== 'browser' && canPlayClips && voiceCanSay(text)) return 'latin';
  return synth ? 'browser' : 'none';
}

// ---------------------------------------------------------------------------
// Browser voices (fallback)
// ---------------------------------------------------------------------------

const synth: SpeechSynthesis | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => {
  voices = synth?.getVoices() ?? [];
};
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

/** Browsers almost never ship a Latin voice; Italian vowels are the closest widely available match. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const is = (code: string) => (v: SpeechSynthesisVoice) => new RegExp(`^${code}([-_]|$)`, 'i').test(v.lang);
  if (LANG_ID !== 'la') return voices.find(is(LANG_ID));
  return voices.find(is('la')) ?? voices.find(is('it'));
}

export function browserVoiceDescription(): string {
  const v = pickVoice();
  if (!synth) return 'This browser has no built-in voices.';
  if (LANG_ID !== 'la') return v ? `Uses the ${LANG.language} voice “${v.name}”.` : `No ${LANG.language} voice is installed in this browser.`;
  if (!v) return 'No Italian voice is installed, so an English voice reads the pronunciation guide.';
  if (/^la/i.test(v.lang)) return `Uses the Latin voice “${v.name}”.`;
  return `Uses the Italian voice “${v.name}” with adjusted spelling.`;
}

function browserSpeak(latin: string): void {
  if (!synth) return;
  const voice = pickVoice();
  const u = new SpeechSynthesisUtterance();
  if (LANG_ID !== 'la') {
    u.text = latin;
    u.lang = LANG.speech;
  } else if (voice && /^la/i.test(voice.lang)) {
    u.text = stripMacrons(latin);
  } else if (voice) {
    u.text = toItalianSpelling(latin);
  } else {
    u.text = respell(latin).replace(/-/g, ' ').toLowerCase();
    u.lang = 'en-GB';
  }
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  }
  u.rate = slowNow || settings.slow ? 0.6 : 0.8;
  synth.cancel();
  synth.speak(u);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const ttsSupported = canPlayClips || !!synth;

export function stopSpeaking(): void {
  queue = [];
  clearTimeout(gapTimer);
  player?.pause();
  synth?.cancel();
}

/** Say some Latin with the best available voice. */
export function speak(latin: string): void {
  const now = Date.now();
  slowNow = latin === lastText && now - lastAt < 5000 && !slowNow;
  lastText = latin;
  lastAt = now;
  say(latin);
}

function say(latin: string): void {
  if (settings.voice !== 'browser' && canPlayClips && !clipsMissing) {
    if (!clips) {
      // First use before the clip list arrived: it's tiny and local, so wait for it.
      void loadVoice().then(() => say(latin));
      return;
    }
    const plan = planClips(latin, hasClip);
    if (plan) return playClips(plan, latin);
  }
  browserSpeak(latin);
}

// ---------------------------------------------------------------------------
// Speech recognition
// ---------------------------------------------------------------------------

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const RecognitionImpl: RecognitionCtor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
    : undefined;

export const recognitionSupported = !!RecognitionImpl;

export interface Listening {
  /** Everything heard, best guesses first; empty if nothing was heard. */
  result: Promise<string[]>;
  /** Finish: stop listening and check what was said. */
  stop: () => void;
  /** Throw it away. */
  cancel: () => void;
}

/**
 * Listen until the learner taps stop (pauses don't end it). Browsers have no
 * Latin model, so Latin uses Italian, whose spelling-to-sound rules are
 * closest, and is compared phonetically afterwards. `onHeard` gets the words
 * so far, live.
 */
export function listen(onHeard?: (text: string) => void, lang = LANG_ID === 'la' ? 'it-IT' : LANG.speech, maxMs = 30_000): Listening {
  if (!RecognitionImpl) return { result: Promise.reject(new Error('unsupported')), stop: () => {}, cancel: () => {} };
  const rec = new RecognitionImpl();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 5;

  // Phones end recognition after a short pause: keep what was heard and restart until stop.
  const past: string[][] = [];
  let finals: string[][] = [];
  let interim = '';
  let stopped = false;
  let cancelled = false;
  const deadline = Date.now() + maxMs;
  const heard = () =>
    [...past, ...finals]
      .map((a) => a[0])
      .concat(interim)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = new Promise<string[]>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancelled) return reject(new Error('aborted'));
      const out = new Set<string>();
      const all = heard();
      if (all) out.add(all);
      for (const alts of [...past, ...finals]) for (const a of alts) if (a) out.add(a);
      if (interim) out.add(interim);
      resolve([...out]);
    };
    rec.onresult = (e) => {
      finals = [];
      interim = '';
      for (const r of Array.from(e.results)) {
        const alts = Array.from(r).map((a) => a.transcript.trim());
        if (r.isFinal) finals.push(alts);
        else interim = `${interim} ${alts[0] ?? ''}`.trim();
      }
      onHeard?.(heard());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // onend follows
      settled = true;
      clearTimeout(timer);
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!stopped && !cancelled && Date.now() < deadline) {
        past.push(...finals);
        if (interim) past.push([interim]);
        finals = [];
        interim = '';
        try {
          rec.start();
          return;
        } catch {
          /* couldn't restart: finish with what we have */
        }
      }
      finish();
    };
    timer = setTimeout(() => {
      stopped = true;
      rec.stop();
    }, maxMs);
    try {
      rec.start();
    } catch (err) {
      settled = true;
      clearTimeout(timer);
      reject(err as Error);
    }
  });

  return {
    result,
    stop: () => {
      stopped = true;
      rec.stop();
    },
    cancel: () => {
      cancelled = true;
      rec.abort();
    },
  };
}

// ---------------------------------------------------------------------------
// Recording (fallback when recognition is unavailable)
// ---------------------------------------------------------------------------

export const recorderSupported =
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export interface Recording {
  stop: () => Promise<Blob>;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        };
        rec.stop();
      }),
  };
}
