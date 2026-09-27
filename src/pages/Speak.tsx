import { L, LANG } from '../lang';
import { useEffect, useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import type { Course, VocabItem } from '../data/types';
import { Icon } from '../components/Icon';
import { ProgressBar, Ring, Say } from '../components/ui';
import { cx } from '../lib/hooks';
import { actions, getProgress } from '../lib/progress';
import { recorderSupported, referenceClips, speak, startRecording, ttsSupported, type Recording } from '../lib/speech';
import { compare, loadClip, startCapture, toWav, voiceMatchSupported, type Capture } from '../lib/voicematch';
import { NextLink } from './Course';

const SESSION = 8;
type Mode = 'auto' | 'self';
type Phase = 'idle' | 'listening' | 'checking' | 'recording' | 'result';

function pickItems(course: Course): VocabItem[] {
  const words = getProgress().words;
  return course.vocab
    .filter((v) => v.pos !== 'suffix')
    .map((v) => ({ v, k: (words[v.id] ?? 0) + Math.random() * 3 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, SESSION)
    .map((x) => x.v);
}

function verdict(score: number, pace = 1) {
  const speed = pace < 0.6 ? ' You said it a lot faster than the voice: try it slower.' : pace > 1.8 ? ' You said it a lot slower than the voice: try it more smoothly.' : '';
  if (score >= 0.8) return { label: 'Excellent!', tone: 'good', tip: `That matches the voice really well.${speed}` };
  if (score >= 0.6) return { label: 'Close!', tone: 'warn', tip: `Listen to the voice once more, then try again.${speed}` };
  return { label: 'Not quite', tone: 'bad', tip: `Play the voice, copy its rhythm and the syllable in CAPITALS, then try again.${speed}` };
}

export function Speak({ course }: { course: Course }) {
  const [items, setItems] = useState(() => pickItems(course));
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>(voiceMatchSupported ? 'auto' : 'self');
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempt, setAttempt] = useState<{ score: number; pace?: number } | null>(null);
  const [best, setBest] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0);
  const capture = useRef<Capture | null>(null);
  const refs = useRef<Promise<Float32Array[]> | null>(null);
  const recording = useRef<Recording | null>(null);

  const item = items[i];
  const target = item ? headOf(item) : '';

  // Revoking happens in the effect below whenever the clip changes.
  const clearClip = () => setClip(null);

  useEffect(
    () => () => {
      capture.current?.cancel();
      void recording.current?.stop();
    },
    [],
  );
  useEffect(() => () => void (clip && URL.revokeObjectURL(clip)), [clip]);

  const score = (s: number) => {
    const prev = best[i] ?? 0;
    if (s >= 0.8 && prev < 0.8) actions.addXP(10);
    setBest((b) => {
      const n = [...b];
      n[i] = Math.max(prev, s);
      return n;
    });
    setAttempt((a) => ({ ...a, score: s }));
    setPhase('result');
  };

  // Live level meter while recording.
  useEffect(() => {
    if (phase !== 'listening') return;
    const t = setInterval(() => setLevel(capture.current?.level() ?? 0), 80);
    return () => clearInterval(t);
  }, [phase]);

  /** Voice match: record, then compare with the native voice (no speech recognition). */
  const startListening = async () => {
    setError(null);
    setAttempt(null);
    clearClip();
    try {
      capture.current = await startCapture();
      setPhase('listening');
      // Get the voice's recordings of this word ready while the learner speaks.
      refs.current = referenceClips(target).then((urls) => Promise.all(urls.map(loadClip)));
    } catch {
      setPhase('idle');
      setError('Microphone access is blocked. Allow it in your browser settings, or use self-check.');
    }
  };

  /** Tapping the mic again: stop and compare with the voice. */
  const finishListening = async () => {
    const c = capture.current;
    if (!c) return;
    capture.current = null;
    setPhase('checking');
    const mine = await c.stop();
    setClip(URL.createObjectURL(toWav(mine)));
    let voices: Float32Array[] = [];
    try {
      voices = (await refs.current) ?? [];
    } catch {
      /* offline and not cached */
    }
    if (!voices.length) {
      setPhase('idle');
      setError('Couldn’t load the voice for this word. Check your internet, or use self-check.');
      return;
    }
    const m = compare(mine, voices);
    if (!m) {
      setPhase('idle');
      setError('Didn’t hear you clearly. Tap the mic, say the word, then tap the mic again.');
      return;
    }
    setAttempt({ score: m.score, pace: m.pace });
    score(m.score);
  };

  const stopListening = () => {
    capture.current?.cancel();
    capture.current = null;
    setPhase('idle');
  };

  const beginRecording = async () => {
    setError(null);
    try {
      recording.current = await startRecording();
      clearClip();
      setPhase('recording');
    } catch {
      setError('Microphone access is blocked. You can still say it aloud and rate yourself.');
    }
  };

  const endRecording = async () => {
    const rec = recording.current;
    recording.current = null;
    setPhase('idle');
    if (!rec) return;
    const blob = await rec.stop();
    setClip(URL.createObjectURL(blob));
  };

  const retrySelf = () => {
    setAttempt(null);
    setPhase('idle');
  };

  const next = () => {
    stopListening();
    clearClip();
    setAttempt(null);
    setError(null);
    setPhase('idle');
    if (i + 1 < items.length) {
      setI(i + 1);
      return;
    }
    const avg = Math.round((items.reduce((a, _, k) => a + (best[k] ?? 0), 0) / items.length) * 100);
    actions.recordSpeak(course.id, avg);
    actions.completeStep(course.id, 'speak', 20);
    setFinished(true);
  };

  const restart = () => {
    setItems(pickItems(course));
    setI(0);
    setBest([]);
    setFinished(false);
  };

  if (finished) {
    const avg = Math.round((items.reduce((a, _, k) => a + (best[k] ?? 0), 0) / items.length) * 100);
    return (
      <div class="drill">
        <div class="result-card">
          <Ring value={avg} size={128} stroke={10} colors={course.colors} label={`Average ${avg}%`}>
            <span class="ring-big">{avg}%</span>
          </Ring>
          <h1 class="result-title">
            {avg >= 80 ? (LANG.id === 'la' ? 'You sound like a Roman!' : `You sound like a real ${LANG.language} speaker!`) : avg >= 60 ? 'Getting there!' : 'Good practice!'}
          </h1>
          <ul class="score-list">
            {items.map((v, k) => {
              const s = Math.round((best[k] ?? 0) * 100);
              return (
                <li key={v.id}>
                  <span lang={L} class="la">
                    {headOf(v)}
                  </span>
                  <ProgressBar value={s} label={`${headOf(v)} score`} />
                  <span class="score-num">{s}%</span>
                </li>
              );
            })}
          </ul>
          <div class="result-actions">
            <button type="button" class="btn btn-ghost" onClick={restart}>
              <Icon name="refresh" size={18} /> Practise again
            </button>
            <NextLink course={course} step="speak" />
          </div>
        </div>
      </div>
    );
  }

  const v = attempt && phase === 'result' ? verdict(attempt.score, attempt.pace) : null;

  return (
    <div class="drill">
      <div class="drill-top">
        <ProgressBar value={(i / items.length) * 100} label="Words practised" />
        <span class="drill-count">
          {i + 1}/{items.length}
        </span>
        {voiceMatchSupported && (
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => {
              stopListening();
              setAttempt(null);
              setError(null);
              setMode(mode === 'auto' ? 'self' : 'auto');
            }}
          >
            <Icon name="swap" size={16} />
            {mode === 'auto' ? 'Self-check' : 'Voice match'}
          </button>
        )}
      </div>

      <div class="speak-card" key={i}>
        <p class="face-kicker">Say it in {LANG.language}</p>
        <p class="speak-word" lang={L}>
          {target}
        </p>
        <Say text={target} />
        <p class="muted speak-en">{item.en}</p>
        {ttsSupported && (
          <button type="button" class="btn btn-soft btn-sm" onClick={() => speak(target)}>
            <Icon name="volume" size={16} /> Hear it first
          </button>
        )}

        {mode === 'auto' ? (
          <>
            <button
              type="button"
              class={cx('mic', phase === 'listening' && 'live')}
              onClick={phase === 'listening' ? finishListening : startListening}
              disabled={phase === 'checking'}
              aria-label={phase === 'listening' ? 'Finished speaking: compare it' : 'Start speaking'}
            >
              <Icon name={phase === 'listening' ? 'stop' : 'mic'} size={34} />
            </button>
            {phase === 'listening' && (
              <div class="mic-level" aria-hidden="true">
                <span style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            )}
            <p class="mic-label" aria-live="polite">
              {phase === 'listening'
                ? 'Recording… say it, then tap the mic again'
                : phase === 'checking'
                  ? 'Comparing with the voice…'
                  : phase === 'result'
                    ? 'Tap the mic to try again'
                    : 'Tap the mic, say it, then tap the mic again'}
            </p>
            {clip && phase !== 'listening' && (
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => void new Audio(clip).play()}>
                <Icon name="play" size={16} /> Play yours
              </button>
            )}
          </>
        ) : (
          <div class="self-check">
            {recorderSupported && (
              <div class="self-row">
                <button
                  type="button"
                  class={cx('mic small', phase === 'recording' && 'live')}
                  onClick={phase === 'recording' ? endRecording : beginRecording}
                  aria-label={phase === 'recording' ? 'Stop recording' : 'Record yourself'}
                >
                  <Icon name={phase === 'recording' ? 'stop' : 'mic'} size={26} />
                </button>
                {clip && (
                  <button type="button" class="btn btn-ghost btn-sm" onClick={() => void new Audio(clip).play()}>
                    <Icon name="play" size={16} /> Play yours
                  </button>
                )}
              </div>
            )}
            <p class="mic-label">
              {phase === 'recording'
                ? 'Recording… tap to stop'
                : recorderSupported
                  ? 'Record yourself, compare with the model, then rate it'
                  : 'Say it out loud, compare with the model, then rate it'}
            </p>
            {phase !== 'result' && (
              <div class="rate-row" role="group" aria-label="Rate your pronunciation">
                <button type="button" class="btn btn-sm rate bad" onClick={() => score(0.3)}>
                  Not yet
                </button>
                <button type="button" class="btn btn-sm rate warn" onClick={() => score(0.7)}>
                  Close
                </button>
                <button type="button" class="btn btn-sm rate good" onClick={() => score(1)}>
                  Nailed it
                </button>
              </div>
            )}
          </div>
        )}

        <div aria-live="polite">
          {v && attempt && (
            <div class={cx('verdict', v.tone)}>
              <div class="meter">
                <span style={{ width: `${Math.round(attempt.score * 100)}%` }} />
              </div>
              <p class="verdict-label">
                {v.label} <span class="muted">{Math.round(attempt.score * 100)}%</span>
              </p>
              <p class="muted small">{v.tip}</p>
            </div>
          )}
          {error && (
            <p class="error-msg" role="alert">
              <Icon name="info" size={16} /> {error}
            </p>
          )}
        </div>
      </div>

      <div class="flash-actions">
        {phase === 'result' ? (
          <button type="button" class="btn btn-ghost" onClick={mode === 'auto' ? startListening : retrySelf}>
            <Icon name="refresh" size={18} /> Try again
          </button>
        ) : (
          <button type="button" class="btn btn-ghost" onClick={next}>
            Skip
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={next} disabled={phase !== 'result'}>
          {i + 1 < items.length ? 'Next' : 'Finish'} <Icon name="arrow-right" size={18} />
        </button>
      </div>
      {mode === 'auto' && (
        <p class="fine-print">
          Voice match compares the sound of your recording, from the moment you start to the moment you stop, with the native voice
          saying the same word. It all happens on your device: nothing is sent anywhere.
        </p>
      )}
    </div>
  );
}
