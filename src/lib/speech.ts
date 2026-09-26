import { useEffect, useReducer, useState } from 'preact/hooks';
import { planClips } from './audio-key';
import { respell, stripMacrons, toItalianSpelling } from './latin';

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
const CLIP_BASE = import.meta.env.MODE === 'play' ? 'public/audio/' : 'audio/';
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
  clipsLoading ??= import('../data/audio-index.json').then(
    (m) => {
      clips = new Set(m.default.ids);
    },
    () => {
      clips = new Set();
    },
  );
  return clipsLoading;
}

const hasClip = (id: string) => !!clips?.has(id);

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
  return voices.find((v) => /^la([-_]|$)/i.test(v.lang)) ?? voices.find((v) => /^it([-_]|$)/i.test(v.lang));
}

export function browserVoiceDescription(): string {
  const v = pickVoice();
  if (!synth) return 'This browser has no built-in voices.';
  if (!v) return 'No Italian voice is installed, so an English voice reads the pronunciation guide.';
  if (/^la/i.test(v.lang)) return `Uses the Latin voice “${v.name}”.`;
  return `Uses the Italian voice “${v.name}” with adjusted spelling.`;
}

function browserSpeak(latin: string): void {
  if (!synth) return;
  const voice = pickVoice();
  const u = new SpeechSynthesisUtterance();
  if (voice && /^la/i.test(voice.lang)) {
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
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
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
  result: Promise<string[]>;
  cancel: () => void;
}

/**
 * Listen for one utterance. Browsers have no Latin model, so we use Italian,
 * whose spelling-to-sound rules are closest, and compare phonetically afterwards.
 */
export function listen(lang = 'it-IT', timeoutMs = 7000): Listening {
  if (!RecognitionImpl) return { result: Promise.reject(new Error('unsupported')), cancel: () => {} };
  const rec = new RecognitionImpl();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 5;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const result = new Promise<string[]>((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      done(() => resolve(alts));
    };
    rec.onerror = (e) => done(() => reject(new Error(e.error)));
    rec.onend = () => done(() => resolve([]));
    timer = setTimeout(() => {
      rec.abort();
      done(() => resolve([]));
    }, timeoutMs);
    try {
      rec.start();
    } catch (err) {
      done(() => reject(err as Error));
    }
  });

  return {
    result,
    cancel: () => {
      clearTimeout(timer);
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
