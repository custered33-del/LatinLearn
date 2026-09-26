import { useEffect, useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import type { Course } from '../data/types';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ui';
import { cx } from '../lib/hooks';
import { actions, courseOf, getProgress } from '../lib/progress';
import { shuffle } from '../lib/random';
import { NextLink } from './Course';

const PAIRS_PER_ROUND = 6;
const MAX_ROUNDS = 2;
/** Matching is recognition, not recall, so it can only build a word up to this strength. */
const MATCH_CAP = 3;

interface Round {
  left: string[];
  right: string[];
}

function buildRounds(course: Course): Round[] {
  const ids = shuffle(course.vocab.map((v) => v.id)).slice(0, PAIRS_PER_ROUND * MAX_ROUNDS);
  const rounds: Round[] = [];
  for (let i = 0; i < ids.length; i += PAIRS_PER_ROUND) {
    const chunk = ids.slice(i, i + PAIRS_PER_ROUND);
    if (chunk.length >= 3) rounds.push({ left: chunk, right: shuffle(chunk) });
  }
  return rounds;
}

export function Match({ course }: { course: Course }) {
  const byId = (id: string) => course.vocab.find((v) => v.id === id)!;
  const [rounds, setRounds] = useState(() => buildRounds(course));
  const [r, setR] = useState(0);
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const missed = useRef(new Set<string>());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [prevBest, setPrevBest] = useState<number | undefined>(undefined);

  const totalPairs = rounds.reduce((a, x) => a + x.left.length, 0);
  const round = rounds[r];
  const done = finalTime !== null;

  useEffect(() => {
    if (!startedAt || done) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [startedAt, done]);

  const elapsed = done ? finalTime! : startedAt ? Math.max(0, now - startedAt) / 1000 : 0;

  const finish = (endAt: number) => {
    const secs = Math.round(((endAt - (startedAt ?? endAt)) / 1000) * 10) / 10;
    setPrevBest(courseOf(getProgress(), course.id).bestMatch);
    actions.recordMatch(course.id, secs, mistakes);
    actions.completeStep(course.id, 'match', 20);
    setFinalTime(secs);
  };

  const tryPair = (l: string, rt: string) => {
    if (l === rt) {
      const next = new Set(matched).add(l);
      setMatched(next);
      actions.answer(l, !missed.current.has(l), 5, MATCH_CAP);
      setSelL(null);
      setSelR(null);
      if (round.left.every((id) => next.has(id))) {
        const endAt = Date.now();
        setTimeout(() => {
          if (r + 1 < rounds.length) {
            setR(r + 1);
            setMatched(new Set());
          } else finish(endAt);
        }, 450);
      }
    } else {
      missed.current.add(l);
      setMistakes((m) => m + 1);
      setWrong([l, rt]);
      setTimeout(() => {
        setWrong(null);
        setSelL(null);
        setSelR(null);
      }, 450);
    }
  };

  const pick = (side: 'l' | 'r', id: string) => {
    if (wrong || matched.has(id)) return;
    if (!startedAt) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
    if (side === 'l') {
      const next = selL === id ? null : id;
      setSelL(next);
      if (next && selR) tryPair(next, selR);
    } else {
      const next = selR === id ? null : id;
      setSelR(next);
      if (next && selL) tryPair(selL, next);
    }
  };

  const restart = () => {
    setRounds(buildRounds(course));
    setR(0);
    setMatched(new Set());
    setMistakes(0);
    missed.current = new Set();
    setStartedAt(null);
    setFinalTime(null);
    setSelL(null);
    setSelR(null);
  };

  if (done) {
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const newBest = prevBest === undefined || finalTime! < prevBest;
    return (
      <div class="drill">
        <div class="result-card">
          <div class="stars" role="img" aria-label={`${stars} out of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <span key={n} class={cx('star', n <= stars && 'on')} style={{ '--i': n }}>
                <Icon name="star" size={40} />
              </span>
            ))}
          </div>
          <h1 class="result-title">{stars === 3 ? 'Flawless!' : stars === 2 ? 'Nice matching!' : 'All matched!'}</h1>
          <div class="result-stats">
            <div>
              <span class="rs-value">{finalTime!.toFixed(1)}s</span>
              <span class="rs-label">{newBest ? 'New best time!' : `Best: ${prevBest}s`}</span>
            </div>
            <div>
              <span class="rs-value">{mistakes}</span>
              <span class="rs-label">{mistakes === 1 ? 'mistake' : 'mistakes'}</span>
            </div>
            <div>
              <span class="rs-value">{totalPairs}</span>
              <span class="rs-label">pairs</span>
            </div>
          </div>
          <div class="result-actions">
            <button type="button" class="btn btn-ghost" onClick={restart}>
              <Icon name="refresh" size={18} /> Play again
            </button>
            <NextLink course={course} step="match" />
          </div>
        </div>
      </div>
    );
  }

  const matchedSoFar = rounds.slice(0, r).reduce((a, x) => a + x.left.length, 0) + matched.size;

  return (
    <div class="drill drill-wide">
      <div class="drill-top">
        <ProgressBar value={(matchedSoFar / totalPairs) * 100} label="Pairs matched" />
        <span class="hud-chip" aria-label="Time">
          <Icon name="clock" size={16} /> {elapsed.toFixed(1)}s
        </span>
        <span class={cx('hud-chip', mistakes > 0 && 'bad')} aria-label="Mistakes">
          <Icon name="x" size={16} /> {mistakes}
        </span>
      </div>
      <p class="drill-instructions">
        {startedAt ? `Round ${r + 1} of ${rounds.length}` : 'Tap a Latin word, then its meaning. The clock starts on your first tap.'}
      </p>
      <div class="match-board" key={r}>
        <div class="match-col" role="group" aria-label="Latin">
          {round.left.map((id, i) => (
            <button
              type="button"
              key={id}
              lang="la"
              style={{ '--i': i }}
              class={cx('tile la', selL === id && 'sel', matched.has(id) && 'done', wrong?.[0] === id && 'wrong')}
              onClick={() => pick('l', id)}
              aria-pressed={selL === id}
              disabled={matched.has(id)}
            >
              {headOf(byId(id))}
            </button>
          ))}
        </div>
        <div class="match-col" role="group" aria-label="English">
          {round.right.map((id, i) => {
            const v = byId(id);
            return (
              <button
                type="button"
                key={id}
                style={{ '--i': i }}
                class={cx('tile', selR === id && 'sel', matched.has(id) && 'done', wrong?.[1] === id && 'wrong')}
                onClick={() => pick('r', id)}
                aria-pressed={selR === id}
                disabled={matched.has(id)}
              >
                {v.swatch && <span class="swatch-dot" style={{ background: v.swatch }} aria-hidden="true" />}
                {v.match ?? v.en}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
