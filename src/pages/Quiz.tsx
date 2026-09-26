import { useEffect, useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import type { Course } from '../data/types';
import { Icon } from '../components/Icon';
import { AudioButton, ProgressBar, Ring, Say } from '../components/ui';
import { confetti } from '../lib/confetti';
import { cx, useKeys } from '../lib/hooks';
import { checkTyped } from '../lib/latin';
import { PASS_MARK } from '../lib/mastery';
import { actions, getProgress } from '../lib/progress';
import { buildQuiz, type Question } from '../lib/quiz';
import { speak, ttsSupported } from '../lib/speech';
import { href } from '../router';
import { NextLink } from './Course';

const KICKER: Record<string, string> = {
  'la-en': 'Translate',
  'en-la': 'Into Latin',
  listen: 'Listening',
  authored: 'Grammar & culture',
  type: 'Spelling',
};

const MACRONS = ['ā', 'ē', 'ī', 'ō', 'ū'];

const answerText = (q: Question): string => (q.kind === 'choice' ? q.options[q.answer] : q.solution);

export function Quiz({ course }: { course: Course }) {
  const build = () => buildQuiz(course, getProgress().words, Math.random, ttsSupported);
  const [qs, setQs] = useState(build);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState<'exact' | 'typo' | 'wrong' | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const q = qs[idx];
  const answered = q.kind === 'choice' ? picked !== null : typedResult !== null;

  // Move focus to "Next" once answered, so Enter/Space continues.
  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: true });
  }, [answered]);
  const last = idx === qs.length - 1;
  const correctSoFar = results.filter(Boolean).length;
  const word = (id?: string) => course.vocab.find((v) => v.id === id);

  useEffect(() => {
    if (finished) return;
    if (q.kind === 'type') inputRef.current?.focus();
    if (q.kind === 'choice' && q.mode === 'listen' && q.latin) {
      const t = setTimeout(() => speak(q.latin!), 350);
      return () => clearTimeout(t);
    }
  }, [idx, qs, finished]);

  const record = (ok: boolean) => {
    setResults((r) => [...r, ok]);
    if (q.wordId) actions.answer(q.wordId, ok, 10);
    else if (ok) actions.addXP(10);
  };

  const choose = (n: number) => {
    if (answered || q.kind !== 'choice') return;
    setPicked(n);
    record(n === q.answer);
  };

  const submitTyped = () => {
    if (answered || q.kind !== 'type' || !typed.trim()) return;
    const r = checkTyped(typed, q.accept);
    setTypedResult(r);
    record(r !== 'wrong');
  };

  const next = () => {
    if (!answered) return;
    if (!last) {
      setIdx(idx + 1);
      setPicked(null);
      setTyped('');
      setTypedResult(null);
      return;
    }
    const pct = Math.round((results.filter(Boolean).length / qs.length) * 100);
    actions.recordQuiz(course.id, pct);
    if (pct >= PASS_MARK) {
      actions.completeStep(course.id, 'quiz', 50);
      confetti([...course.colors, '#7c4dff', '#ffffff']);
    }
    setFinished(true);
  };

  const retry = () => {
    setQs(build());
    setIdx(0);
    setPicked(null);
    setTyped('');
    setTypedResult(null);
    setResults([]);
    setFinished(false);
  };

  const insertMacron = (ch: string) => {
    const el = inputRef.current;
    if (!el || answered) return;
    const start = el.selectionStart ?? typed.length;
    const end = el.selectionEnd ?? typed.length;
    const value = typed.slice(0, start) + ch + typed.slice(end);
    setTyped(value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };

  useKeys((e) => {
    if (finished) return;
    if (q.kind === 'choice' && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
    else if (e.key === 'Enter' && answered) {
      e.preventDefault();
      next();
    }
  });

  if (finished) {
    const pct = Math.round((correctSoFar / qs.length) * 100);
    const passed = pct >= PASS_MARK;
    const missed = qs.map((mq, k) => ({ mq, ok: results[k] })).filter((x) => !x.ok);
    return (
      <div class="drill">
        <div class="result-card">
          <Ring value={pct} size={140} stroke={11} colors={course.colors} label={`Score ${pct}%`}>
            <span class="ring-big">{pct}%</span>
          </Ring>
          <h1 class="result-title">{passed ? (pct === 100 ? 'Perfect score!' : 'Course passed!') : 'So close. Keep going!'}</h1>
          <p class="muted">
            {correctSoFar} of {qs.length} correct.{' '}
            {passed ? `You’ve passed ${course.title}.` : `You need ${PASS_MARK}% to pass. Every attempt strengthens your weakest words.`}
          </p>
          {missed.length > 0 && (
            <div class="review">
              <h2 class="h-sm">Review</h2>
              <ul>
                {missed.map(({ mq }, k) => (
                  <li key={k}>
                    <span class="review-q">
                      {mq.kind === 'type' ? `Latin for “${mq.english}”` : mq.latin && mq.mode === 'la-en' ? mq.latin : mq.prompt}
                    </span>
                    <span class="review-a">
                      <Icon name="check" size={14} />
                      <span lang={mq.kind === 'type' || mq.optionsLatin ? 'la' : undefined} class={mq.kind === 'type' || mq.optionsLatin ? 'la' : undefined}>
                        {answerText(mq)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div class="result-actions">
            <button type="button" class="btn btn-ghost" onClick={retry}>
              <Icon name="refresh" size={18} /> New quiz
            </button>
            {passed ? (
              <NextLink course={course} step="quiz" />
            ) : (
              <a class="btn btn-primary" href={href('course', course.id, 'flashcards')}>
                <Icon name="cards" size={18} /> Practise flashcards
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const kicker = KICKER[q.kind === 'type' ? 'type' : q.mode];
  const ok = q.kind === 'choice' ? picked === q.answer : typedResult !== 'wrong';
  const w = word(q.wordId);

  return (
    <div class="drill">
      <div class="drill-top">
        <ProgressBar value={((idx + (answered ? 1 : 0)) / qs.length) * 100} label="Quiz progress" />
        <span class="drill-count">
          {idx + 1}/{qs.length}
        </span>
        <span class="hud-chip good" aria-label={`${correctSoFar} correct`}>
          <Icon name="check" size={16} /> {correctSoFar}
        </span>
      </div>

      <div class="quiz-card" key={`${idx}-${qs.length}`}>
        <p class="q-kicker">{kicker}</p>
        <h1 class="q-prompt">{q.prompt}</h1>

        {q.kind === 'choice' && q.mode === 'la-en' && q.latin && (
          <p class="q-latin">
            <span lang="la">{q.latin}</span>
            <AudioButton text={q.latin} />
          </p>
        )}
        {q.kind === 'choice' && q.mode === 'listen' && q.latin && (
          <button type="button" class="btn btn-soft listen-btn" onClick={() => speak(q.latin!)}>
            <Icon name="headphones" size={20} /> Play again
          </button>
        )}

        {q.kind === 'choice' ? (
          <div class="options" role="group" aria-label="Answers">
            {q.options.map((o, n) => {
              const isAnswer = n === q.answer;
              const isPicked = n === picked;
              return (
                <button
                  type="button"
                  key={o}
                  class={cx(
                    'option',
                    q.optionsLatin && 'la',
                    answered && isAnswer && 'correct',
                    answered && isPicked && !isAnswer && 'incorrect',
                    answered && !isAnswer && !isPicked && 'dim',
                  )}
                  onClick={() => choose(n)}
                  disabled={answered}
                  aria-pressed={isPicked}
                >
                  <span class="key" aria-hidden="true">
                    {answered && isAnswer ? <Icon name="check" size={14} /> : answered && isPicked ? <Icon name="x" size={14} /> : n + 1}
                  </span>
                  <span class="txt" lang={q.optionsLatin ? 'la' : undefined}>
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <form
            class="type-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (answered) next();
              else submitTyped();
            }}
          >
            <p class="q-english">“{q.english}”</p>
            <input
              ref={inputRef}
              class={cx('type-input', typedResult && (typedResult === 'wrong' ? 'bad' : 'good'))}
              value={typed}
              onInput={(e) => setTyped((e.currentTarget as HTMLInputElement).value)}
              readOnly={answered}
              placeholder="Type in Latin…"
              aria-label={`Latin for ${q.english}`}
              autoComplete="off"
              autoCapitalize="off"
              spellcheck={false}
              lang="la"
            />
            <div class="macron-row">
              <span class="muted small">Macrons optional:</span>
              {MACRONS.map((m) => (
                <button type="button" key={m} class="macron" onClick={() => insertMacron(m)} disabled={answered} aria-label={`Insert ${m}`}>
                  {m}
                </button>
              ))}
              {!answered && (
                <button type="submit" class="btn btn-primary btn-sm check-btn" disabled={!typed.trim()}>
                  Check
                </button>
              )}
            </div>
          </form>
        )}

        {answered && (
          <div class={cx('feedback', ok ? 'good' : 'bad')} role="status">
            <span class="fb-icon">
              <Icon name={ok ? 'check' : 'x'} size={18} />
            </span>
            <div>
              <p class="fb-title">
                {ok ? (typedResult === 'typo' ? 'Correct, but watch the spelling' : 'Correct!') : 'Not quite'}
              </p>
              {(!ok || typedResult === 'typo') && (
                <p>
                  The answer is{' '}
                  <b class={q.kind === 'type' || (q.kind === 'choice' && q.optionsLatin) ? 'la' : undefined}>{answerText(q)}</b>
                  {q.kind === 'type' && (
                    <>
                      {' '}
                      <Say text={q.solution} />
                    </>
                  )}
                </p>
              )}
              {q.kind === 'choice' && q.why && <p class="muted">{q.why}</p>}
              {w && q.kind === 'choice' && (
                <p class="muted">
                  <span lang="la" class="la">
                    {headOf(w)}
                  </span>{' '}
                  = {w.en}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div class="quiz-next">
        {answered && (
          <button type="button" class="btn btn-primary btn-lg" onClick={next} ref={nextRef}>
            {last ? 'See results' : 'Next question'} <Icon name="arrow-right" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
