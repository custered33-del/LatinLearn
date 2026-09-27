import { L, LANG, LANG_ID } from '../lang';
import { useEffect, useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import { Icon } from '../components/Icon';
import { AudioButton, ProgressBar, Say } from '../components/ui';
import { DAILY_SECONDS, DIFFICULTY, DailySession, KIND_LABEL, MAX_GAP_MS, type Item } from '../lib/daily';
import { cx, useKeys, useTitle } from '../lib/hooks';
import { checkTyped, headword } from '../lib/latin';
import { actions, dayKey, getProgress, useProgress } from '../lib/progress';
import { speak, voiceFor } from '../lib/speech';
import { href } from '../router';

/** Letters that are hard to type on some keyboards (they're optional: answers ignore accents). */
const EXTRA: Record<typeof LANG_ID, string[]> = {
  la: ['ā', 'ē', 'ī', 'ō', 'ū'],
  de: ['ä', 'ö', 'ü', 'ß'],
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ'],
  fr: ['é', 'è', 'ê', 'à', 'ç', 'ô'],
  zh: [],
  ar: [],
  ja: [],
  ru: [],
  vi: ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư'],
};
const BONUS_XP = 25;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Daily() {
  useTitle('Daily lesson');
  const p = useProgress();
  const session = useRef<DailySession | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState<'exact' | 'typo' | 'wrong' | null>(null);
  const [active, setActive] = useState(0); // seconds of active practice today in this lesson
  const [stats, setStats] = useState({ right: 0, total: 0, xp: 0, startLevel: 0 });
  const [finished, setFinished] = useState(false);
  const [extra, setExtra] = useState(false); // kept going after the 10 minutes
  const [bonus, setBonus] = useState(0);
  const lastAt = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const current = useRef<Item | null>(null);
  const activeRef = useRef(0);
  activeRef.current = active;

  const today = p.daily?.days[dayKey()] ?? 0;
  const doneToday = today >= DAILY_SECONDS / 60;

  // Save the level and minutes when leaving halfway.
  useEffect(
    () => () => {
      const s = session.current;
      if (s) actions.recordDaily(s.level, Math.floor(activeRef.current / 60));
    },
    [],
  );
  const start = () => {
    const s = new DailySession(getProgress, (w) => voiceFor(headOf(w)) === 'latin');
    session.current = s;
    setStats({ right: 0, total: 0, xp: 0, startLevel: s.level });
    setActive(Math.min(today, DAILY_SECONDS / 60) * 60);
    setExtra(doneToday); // already done today: practise with no finish line
    lastAt.current = Date.now();
    show(s.next());
  };

  const show = (next: Item) => {
    current.current = next;
    setItem(next);
    setPicked(null);
    setTyped('');
    setTypedResult(null);
    if (next.kind === 'intro' || next.kind === 'listen') setTimeout(() => speak(headOf(next.word)), 250);
    if (next.kind === 'type') setTimeout(() => input.current?.focus(), 50);
  };

  const tick = () => {
    const now = Date.now();
    const gained = Math.min(now - lastAt.current, MAX_GAP_MS) / 1000;
    lastAt.current = now;
    return gained;
  };

  const answered = picked !== null || typedResult !== null;
  const correct = item && (item.kind === 'type' ? typedResult !== null && typedResult !== 'wrong' : picked === item.answer);

  const settle = (ok: boolean) => {
    const s = session.current!;
    const it = item!;
    s.record(it, ok);
    const xp = ok ? 1 + Math.ceil(DIFFICULTY[it.kind] / 2) : 0;
    actions.answer(it.word.id, ok, xp);
    setStats((st) => ({ ...st, right: st.right + (ok ? 1 : 0), total: st.total + 1, xp: st.xp + xp }));
    // Right answers move on by themselves; wrong ones wait so you can read the answer.
    if (ok && it.kind !== 'type') setTimeout(() => current.current === it && advance(), 700);
  };

  const choose = (n: number) => {
    if (answered || !item || !item.options.length) return;
    setPicked(n);
    settle(n === item.answer);
  };

  const submitTyped = () => {
    if (answered || !item || !typed.trim()) return;
    const r = checkTyped(typed, [headOf(item.word), headword(item.word.la)]);
    setTypedResult(r);
    settle(r !== 'wrong');
    if (r === 'wrong') speak(headOf(item.word));
  };

  // Move on: count the time, save now and then, and finish at 10 minutes.
  const advance = () => {
    const s = session.current;
    if (!s) return;
    const seconds = activeRef.current + tick();
    setActive(seconds);
    const reached = seconds >= DAILY_SECONDS;
    if (reached && !finished && !extra) {
      setBonus(doneToday ? 0 : BONUS_XP);
      actions.recordDaily(s.level, Math.floor(seconds / 60), doneToday ? 0 : BONUS_XP);
      setFinished(true);
      return;
    }
    if (stats.total % 5 === 0) actions.recordDaily(s.level, Math.floor(seconds / 60));
    show(s.next());
  };

  const introDone = () => {
    if (!item) return;
    actions.answer(item.word.id, true, 1);
    advance();
  };

  useKeys((e) => {
    if (!item || finished) return;
    if (item.kind === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      introDone();
    } else if (answered && e.key === 'Enter') {
      e.preventDefault();
      advance();
    } else if (!answered && item.options.length && /^[1-5]$/.test(e.key)) choose(Number(e.key) - 1);
  });

  // Start screen
  if (!item) {
    const level = new DailySession(getProgress, () => false).level;
    return (
      <div class="container drill daily">
        <div class="daily-start">
          <p class="eyebrow">Daily lesson · 10 minutes</p>
          <h1>{doneToday ? 'Today’s lesson is done! 🔥' : 'Your lesson for today'}</h1>
          <p class="lede-sm">
            Built for you: your weakest {LANG.language} words first, new words from where you are in the courses, and old favourites so you
            don’t forget them. It gets harder as you get better, and easier if you’re struggling.
          </p>
          <div class="daily-facts">
            <div>
              <b>{level.toFixed(1)}</b>
              <span>your level (1–10)</span>
            </div>
            <div>
              <b>{Math.min(today, 10)}/10</b>
              <span>minutes today</span>
            </div>
            <div>
              <b>+{BONUS_XP}</b>
              <span>XP for finishing</span>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-lg" onClick={start}>
            {doneToday ? 'Practise some more' : today > 0 ? 'Carry on' : 'Start'} <Icon name="arrow-right" size={18} />
          </button>
          <p class="muted small">Only time spent answering counts. Take a break and the clock waits for you.</p>
        </div>
      </div>
    );
  }

  const s = session.current!;
  const levelNow = s.level;

  if (finished) {
    const pct = stats.total ? Math.round((stats.right / stats.total) * 100) : 0;
    const change = levelNow - stats.startLevel;
    return (
      <div class="container drill daily">
        <div class="result-card">
          <div class="ring">
            <span class="ring-big">🔥</span>
          </div>
          <h1 class="result-title">Daily lesson done!</h1>
          <p class="muted">Your streak is safe for today.</p>
          <div class="daily-facts">
            <div>
              <b>{pct}%</b>
              <span>
                right ({stats.right}/{stats.total})
              </span>
            </div>
            <div>
              <b>
                {levelNow.toFixed(1)} {change > 0.05 ? '↑' : change < -0.05 ? '↓' : ''}
              </b>
              <span>level {change > 0.05 ? 'up!' : change < -0.05 ? '(easier tomorrow)' : '(steady)'}</span>
            </div>
            <div>
              <b>+{stats.xp + bonus}</b>
              <span>XP</span>
            </div>
          </div>
          <div class="result-actions">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => {
                setExtra(true);
                setFinished(false);
                lastAt.current = Date.now();
                show(s.next());
              }}
            >
              Keep going
            </button>
            <a class="btn btn-primary" href={href()}>
              Back home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const w = item.word;
  const head = headOf(w);
  const english = w.match ?? w.en;
  const optionsInLanguage = item.kind === 'produce';

  return (
    <div class="drill daily">
      <div class="drill-top">
        <ProgressBar value={Math.min(100, (active / DAILY_SECONDS) * 100)} label="Daily lesson time" />
        <span class="drill-count">{extra ? `+${mmss(active - DAILY_SECONDS)}` : mmss(Math.max(0, DAILY_SECONDS - active))}</span>
        <span class="hud-chip" title="Difficulty adapts as you answer">
          <Icon name="sliders" size={16} /> {levelNow.toFixed(1)}
        </span>
        <span class="hud-chip good" aria-label={`${stats.right} correct`}>
          <Icon name="check" size={16} /> {stats.right}
        </span>
      </div>

      <div class="quiz-card" key={`${stats.total}-${w.id}-${item.kind}`}>
        <p class="q-kicker">
          {KIND_LABEL[item.kind]} · {w.course}
        </p>

        {item.kind === 'intro' && (
          <>
            <p class="q-latin daily-new">
              <span lang={L}>{head}</span>
              <AudioButton text={head} />
            </p>
            <Say text={head} />
            <h1 class="q-prompt">{w.en}</h1>
            {w.ex && (
              <p class="muted">
                <span lang={L} class="la">
                  {w.ex[0]}
                </span>{' '}
                ({w.ex[1]})
              </p>
            )}
            <div class="quiz-next">
              <button type="button" class="btn btn-primary btn-lg" onClick={introDone}>
                Got it <Icon name="arrow-right" size={18} />
              </button>
            </div>
          </>
        )}

        {item.kind === 'recognise' && (
          <>
            <h1 class="q-prompt">What does this mean?</h1>
            <p class="q-latin">
              <span lang={L}>{head}</span>
              <AudioButton text={head} />
            </p>
          </>
        )}
        {item.kind === 'produce' && <h1 class="q-prompt">How do you say “{english}”?</h1>}
        {item.kind === 'listen' && (
          <>
            <h1 class="q-prompt">What did you hear?</h1>
            <button type="button" class="btn btn-soft listen-btn" onClick={() => speak(head)}>
              <Icon name="headphones" size={20} /> Play again
            </button>
          </>
        )}

        {item.options.length > 0 && (
          <div class="options" role="group" aria-label="Answers">
            {item.options.map((o, n) => {
              const isAnswer = n === item.answer;
              const isPicked = n === picked;
              return (
                <button
                  type="button"
                  key={o}
                  class={cx(
                    'option',
                    optionsInLanguage && 'la',
                    answered && isAnswer && 'correct',
                    answered && isPicked && !isAnswer && 'incorrect',
                    answered && !isAnswer && !isPicked && 'dim',
                  )}
                  onClick={() => choose(n)}
                  disabled={answered}
                >
                  <span class="key" aria-hidden="true">
                    {answered && isAnswer ? <Icon name="check" size={14} /> : answered && isPicked ? <Icon name="x" size={14} /> : n + 1}
                  </span>
                  <span class="txt" lang={optionsInLanguage ? L : undefined}>
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {item.kind === 'type' && (
          <form
            class="type-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (answered) advance();
              else submitTyped();
            }}
          >
            <p class="q-english">“{english}”</p>
            <input
              ref={input}
              class={cx('type-input', typedResult && (typedResult === 'wrong' ? 'bad' : 'good'))}
              value={typed}
              onInput={(e) => setTyped((e.currentTarget as HTMLInputElement).value)}
              readOnly={answered}
              placeholder={`Type in ${LANG.language}…`}
              aria-label={`${LANG.language} for ${english}`}
              autoComplete="off"
              autoCapitalize="off"
              spellcheck={false}
              lang={L}
            />
            <div class="macron-row">
              <span class="muted small">{LANG_ID === 'la' ? 'Macrons' : 'Accents'} optional:</span>
              {EXTRA[LANG_ID].map((m) => (
                <button
                  type="button"
                  key={m}
                  class="macron"
                  disabled={answered}
                  onClick={() => {
                    setTyped((t) => t + m);
                    input.current?.focus();
                  }}
                >
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
          <div class={cx('feedback', correct ? 'good' : 'bad')} role="status">
            <span class="fb-icon">
              <Icon name={correct ? 'check' : 'x'} size={18} />
            </span>
            <div>
              <p class="fb-title">{correct ? (typedResult === 'typo' ? 'Right, but watch the spelling' : 'Correct!') : 'Not quite. It’ll come back soon'}</p>
              <p>
                <b class="la" lang={L}>
                  {head}
                </b>{' '}
                = {w.en}
              </p>
            </div>
          </div>
        )}
      </div>

      <div class="quiz-next">
        {answered && (!correct || item.kind === 'type') && (
          <button type="button" class="btn btn-primary btn-lg" onClick={advance}>
            Next <Icon name="arrow-right" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
