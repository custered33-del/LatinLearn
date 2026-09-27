import { LANG } from '../lang';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { COURSES } from '../data/courses';
import type { Course } from '../data/types';
import { cx, useTitle } from '../lib/hooks';
import { compActive, compRanking, refreshFamily, submitScore, timeLeft, useFamily } from '../lib/family';
import { href } from '../router';
import { Speed } from './Challenges';
import { BattleCard } from './Settings';

/** Family speed battle: 60-second rounds on every word of the current language; best score wins. */
export function Compete() {
  useTitle('Speed battle');
  const { account, mine, data } = useFamily();
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const [last, setLast] = useState<{ points: number; saved: boolean } | null>(null);
  const [, tick] = useState(0);

  // Everyone's scores arrive every few seconds while the page is open.
  useEffect(() => {
    void refreshFamily().catch(() => undefined);
    const poll = setInterval(() => void refreshFamily().catch(() => undefined), 8000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  const allWords: Course = useMemo(() => {
    const seen = new Set<string>();
    const vocab = COURSES.flatMap((c) => c.vocab).filter((v) => v.pos !== 'suffix' && !seen.has(v.en) && !!seen.add(v.en));
    return { ...COURSES[0], vocab };
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

  const comp = data?.comp;
  const active = compActive(comp);
  const ranking = compRanking(comp);

  const finish = (_right: number, _tries: number, score = 0) => {
    setPlaying(false);
    setLast({ points: score, saved: false });
    void submitScore(score)
      .then(() => setLast({ points: score, saved: true }))
      .catch(() => setLast({ points: score, saved: false }));
  };

  return (
    <div class="container battle-page">
      <header class="page-head">
        <p class="eyebrow">Family speed battle</p>
        <h1>{active ? `⚡ Ends in ${timeLeft(comp.end - Date.now())}` : comp ? 'Battle over!' : 'Speed battle'}</h1>
        {active && <p class="lede-sm">Play as many 60-second rounds as you like in {LANG.language}. Only your best score counts.</p>}
      </header>

      {playing ? (
        <div class="battle-game">
          <Speed
            key={round}
            course={allWords}
            onFinish={finish}
            intro="Every word from every course. Right = +1, wrong = −1, so guessing won’t win"
          />
        </div>
      ) : (
        <>
          {last && (
            <div class="battle-result">
              <p class="battle-points">{last.points}</p>
              <p class="muted">{last.saved ? 'points, sent to your family!' : 'points (saving…)'}</p>
            </div>
          )}
          {active ? (
            <button
              type="button"
              class="btn btn-primary btn-lg battle-play"
              onClick={() => {
                setRound((n) => n + 1);
                setPlaying(true);
              }}
            >
              ⚡ {last ? 'Play again' : 'Play a round'}
            </button>
          ) : (
            <BattleCard comp={comp} />
          )}
          <section class="battle-board">
            <h2 class="h-md">{active ? 'Leaderboard' : 'Final results'}</h2>
            {ranking.length === 0 ? (
              <p class="muted">No scores yet. Be the first!</p>
            ) : (
              <ol class="family-list">
                {ranking.map(([id, s], i) => (
                  <li key={id} class={cx(id === mine.id && 'me')}>
                    <span class="family-rank">{i === 0 ? '🏆' : i + 1}</span>
                    <span class="family-who">
                      {s.name}
                      {id === mine.id && ' (you)'} <span aria-hidden="true">{s.flag}</span>
                    </span>
                    <span class="family-num muted small">
                      {s.plays} round{s.plays === 1 ? '' : 's'}
                    </span>
                    <span class="family-num">
                      <b>{s.best}</b> pts
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
