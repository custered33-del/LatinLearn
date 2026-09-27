import { LANG } from '../lang';
import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSES, courseById } from '../data/courses';
import type { CourseId } from '../data/types';
import { cx, useTitle } from '../lib/hooks';
import {
  beginRound,
  closeVoting,
  compPhase,
  compRanking,
  refreshFamily,
  submitScore,
  tally,
  timeLeft,
  useFamily,
  vote,
} from '../lib/family';
import { href } from '../router';
import { Speed } from './Challenges';
import { BattleCard } from './Settings';

const ORDER = COURSES.map((c) => c.id);

/** Family speed battle: vote for a course, then everyone gets one 60-second round on it. */
export function Compete() {
  useTitle('Speed battle');
  const { account, mine, data } = useFamily();
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const [, tick] = useState(0);
  const polling = useRef(true);

  // Votes and scores from the rest of the family arrive every few seconds.
  useEffect(() => {
    const load = () => polling.current && void refreshFamily().then(() => closeVoting(ORDER)).catch(() => undefined);
    load();
    const poll = setInterval(load, 5000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  if (!account || !mine) {
    return (
      <div class="container empty-page">
        <p class="eyebrow">Speed battle</p>
        <h1 class="display-sm">Join a family first</h1>
        <p class="muted">Speed battles are for families. Log in and make or join a family in Settings.</p>
        <a class="btn btn-primary" href={href('settings')}>
          Go to Settings
        </a>
      </div>
    );
  }
  if (!data) {
    return (
      <div class="container empty-page">
        <p class="muted">Loading your family…</p>
      </div>
    );
  }

  const comp = data.comp;
  const phase = compPhase(comp, data.members);
  const ranking = compRanking(comp);
  const course = comp?.course ? courseById(comp.course as CourseId) : undefined;
  const mineScore = comp?.scores?.[mine.id];
  const memberIds = Object.keys(data.members);

  const act = (fn: () => Promise<void>) => {
    setBusy(true);
    void fn()
      .catch(() => alert('Couldn’t reach the cloud. Check your internet.'))
      .finally(() => setBusy(false));
  };

  if (playing && course) {
    return (
      <div class="container battle-page">
        <header class="page-head">
          <p class="eyebrow">Family speed battle · {course.title}</p>
          <h1>One round. Make it count!</h1>
        </header>
        <div class="battle-game">
          <Speed
            course={course}
            intro="One go only. Right = +1, wrong = −1, so guessing won’t win"
            onFinish={(_right, _tries, score = 0) => {
              polling.current = true;
              setPlaying(false);
              setLast(score);
              void submitScore(score).catch(() => undefined);
            }}
          />
        </div>
      </div>
    );
  }

  let body;
  if (phase === 'vote' && comp) {
    const { counts, winner } = tally(comp, ORDER);
    const myVote = comp.votes?.[mine.id];
    const voted = Object.keys(comp.votes ?? {});
    body = (
      <>
        <p class="lede-sm">
          Tap a course to vote. The battle starts when everyone has voted ({voted.length} of {memberIds.length} so far).
          {winner && ` Winning right now: ${courseById(winner as CourseId)?.title}.`}
        </p>
        <div class="vote-grid">
          {COURSES.map((c) => (
            <button
              key={c.id}
              type="button"
              class={cx('vote-option', myVote === c.id && 'mine')}
              style={{ '--c1': c.colors[0], '--c2': c.colors[1] }}
              disabled={busy}
              aria-pressed={myVote === c.id}
              onClick={() => act(() => vote(c.id, ORDER))}
            >
              <span class="vote-title">{c.title}</span>
              <span class="vote-count">{counts[c.id] ? `${counts[c.id]} vote${counts[c.id] === 1 ? '' : 's'}` : ''}</span>
            </button>
          ))}
        </div>
        <p class="muted small">
          Waiting for: {memberIds.filter((id) => !voted.includes(id)).map((id) => data.members[id].name).join(', ') || 'nobody'}
        </p>
        {comp.byId === mine.id && winner && (
          <button type="button" class="btn btn-ghost" disabled={busy} onClick={() => act(() => closeVoting(ORDER, true))}>
            Stop voting and start the battle now
          </button>
        )}
      </>
    );
  } else if (phase === 'play' && comp && course) {
    body = (
      <>
        <p class="lede-sm">
          The family picked <b>{course.title}</b>. Everyone gets one 60-second round in their own language. Ends in {timeLeft((comp.end ?? 0) - Date.now())}.
        </p>
        {last !== null || mineScore ? (
          <div class="battle-result">
            <p class="battle-points">{last ?? mineScore?.best ?? 0}</p>
            <p class="muted">points: your round is done. Waiting for the others…</p>
          </div>
        ) : (
          <button
            type="button"
            class="btn btn-primary btn-lg battle-play"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await beginRound();
                polling.current = false; // don't redraw the page under a running round
                setPlaying(true);
              })
            }
          >
            ⚡ Play my round ({LANG.language})
          </button>
        )}
      </>
    );
  } else {
    body = <BattleCard data={data} mineId={mine.id} />;
  }

  const showBoard = phase === 'play' || (phase === 'done' && ranking.length > 0);
  return (
    <div class="container battle-page">
      <header class="page-head">
        <p class="eyebrow">Family speed battle</p>
        <h1>{phase === 'vote' ? 'Vote for the course' : phase === 'play' ? `⚡ ${course?.title ?? ''} battle` : phase === 'done' ? 'Battle over!' : 'Speed battle'}</h1>
      </header>
      {body}
      {showBoard && (
        <section class="battle-board">
          <h2 class="h-md">{phase === 'play' ? 'Scores so far' : `Final results${course ? ` · ${course.title}` : ''}`}</h2>
          <ol class="family-list">
            {ranking.map(([id, s], i) => (
              <li key={id} class={cx(id === mine.id && 'me')}>
                <span class="family-rank">{i === 0 && s.done ? '🏆' : i + 1}</span>
                <span class="family-who">
                  {s.name}
                  {id === mine.id && ' (you)'} <span aria-hidden="true">{s.flag}</span>
                </span>
                <span class="family-num">{s.done ? <b>{s.best} pts</b> : <span class="muted">playing…</span>}</span>
              </li>
            ))}
            {memberIds
              .filter((id) => !comp?.scores?.[id])
              .map((id) => (
                <li key={id} class="waiting">
                  <span class="family-rank">·</span>
                  <span class="family-who">{data.members[id].name}</span>
                  <span class="family-num muted">{phase === 'play' ? 'not played yet' : 'didn’t play'}</span>
                </li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}
