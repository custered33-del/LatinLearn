import { useEffect, useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import type { Course, VocabItem } from '../data/types';
import { Icon } from '../components/Icon';
import { ProgressBar, Ring, Say } from '../components/ui';
import { cx } from '../lib/hooks';
import { speechSimilarity } from '../lib/latin';
import { actions, getProgress } from '../lib/progress';
import {
  listen,
  recognitionSupported,
  recorderSupported,
  speak,
  startRecording,
  ttsSupported,
  type Listening,
  type Recording,
} from '../lib/speech';
import { NextLink } from './Course';

const SESSION = 8;
type Mode = 'auto' | 'self';
type Phase = 'idle' | 'listening' | 'recording' | 'result';

function pickItems(course: Course): VocabItem[] {
  const words = getProgress().words;
  return course.vocab
    .filter((v) => v.pos !== 'suffix')
    .map((v) => ({ v, k: (words[v.id] ?? 0) + Math.random() * 3 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, SESSION)
    .map((x) => x.v);
}

function verdict(score: number) {
  if (score >= 0.8) return { label: 'Excellent!', tone: 'good', tip: 'That sounded spot on.' };
  if (score >= 0.6) return { label: 'Close!', tone: 'warn', tip: 'Listen to the model once more, then try again.' };
  return { label: 'Not quite', tone: 'bad', tip: 'Follow the respelling and lean on the syllable in CAPITALS.' };
}

export function Speak({ course }: { course: Course }) {
  const [items, setItems] = useState(() => pickItems(course));
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>(recognitionSupported ? 'auto' : 'self');
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempt, setAttempt] = useState<{ score: number; heard?: string } | null>(null);
  const [best, setBest] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const listening = useRef<Listening | null>(null);
  const recording = useRef<Recording | null>(null);

  const item = items[i];
  const target = item ? headOf(item) : '';

  // Revoking happens in the effect below whenever the clip changes.
  const clearClip = () => setClip(null);

  useEffect(
    () => () => {
      listening.current?.cancel();
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

  const startListening = async () => {
    setError(null);
    setAttempt(null);
    setPhase('listening');
    const l = listen();
    listening.current = l;
    try {
      const alts = await l.result;
      if (listening.current !== l) return;
      if (!alts.length) {
        setPhase('idle');
        setError('Didn’t catch that. Tap the mic and speak clearly.');
        return;
      }
      const top = alts.map((heard) => ({ heard, score: speechSimilarity(heard, target) })).sort((a, b) => b.score - a.score)[0];
      setAttempt({ heard: top.heard, score: top.score });
      score(top.score);
    } catch (err) {
      const code = (err as Error).message;
      setPhase('idle');
      if (code === 'aborted') return;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone access is blocked. Allow it in your browser settings, or switch to self-check.');
      } else if (code === 'no-speech') {
        setError('No speech heard. Tap the mic and try again.');
      } else {
        setError('Speech checking isn’t available right now. Self-check mode still works.');
      }
    } finally {
      if (listening.current === l) listening.current = null;
    }
  };

  const stopListening = () => {
    listening.current?.cancel();
    listening.current = null;
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
          <h1 class="result-title">{avg >= 80 ? 'You sound like a Roman!' : avg >= 60 ? 'Getting there!' : 'Good practice!'}</h1>
          <ul class="score-list">
            {items.map((v, k) => {
              const s = Math.round((best[k] ?? 0) * 100);
              return (
                <li key={v.id}>
                  <span lang="la" class="la">
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

  const v = attempt && phase === 'result' ? verdict(attempt.score) : null;

  return (
    <div class="drill">
      <div class="drill-top">
        <ProgressBar value={(i / items.length) * 100} label="Words practised" />
        <span class="drill-count">
          {i + 1}/{items.length}
        </span>
        {recognitionSupported && (
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
            {mode === 'auto' ? 'Self-check' : 'Auto-check'}
          </button>
        )}
      </div>

      <div class="speak-card" key={i}>
        <p class="face-kicker">Say it in Latin</p>
        <p class="speak-word" lang="la">
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
              onClick={phase === 'listening' ? stopListening : startListening}
              aria-label={phase === 'listening' ? 'Stop listening' : 'Start speaking'}
            >
              <Icon name={phase === 'listening' ? 'stop' : 'mic'} size={34} />
            </button>
            <p class="mic-label" aria-live="polite">
              {phase === 'listening' ? 'Listening… say it now' : phase === 'result' ? 'Tap to try again' : 'Tap the mic and say it'}
            </p>
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
              {attempt.heard !== undefined && (
                <p class="heard">
                  We heard: “<span lang="la">{attempt.heard}</span>”
                </p>
              )}
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
          Speech checking uses your browser’s recogniser, which may send audio to an online service. Browsers don’t understand Latin, so
          we listen in Italian (the closest match) and compare the sounds rather than the spelling.
        </p>
      )}
    </div>
  );
}
