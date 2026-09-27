/**
 * Challenges step: a hub of per-course games plus the player for each type.
 * Lazy-loaded, like the Lexicon.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { challengesOf, headOf } from '../data/courses';
import type { BuildItem, Challenge, ChallengeType, Course, GapItem, PaintRegion, VocabItem } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { TaskList } from '../components/TaskList';
import { AudioButton, ProgressBar } from '../components/ui';
import { confetti } from '../lib/confetti';
import { cx, useKeys, useTitle } from '../lib/hooks';
import { fold } from '../lib/latin';
import { actions, getProgress, useProgress } from '../lib/progress';
import { shuffle } from '../lib/random';
import { SPEED_STARS, challengesDone, speedStars, starsFor } from '../lib/tasks';
import { href } from '../router';
import { NextLink } from './Course';
import './challenges.css';
import { L, LANG } from '../lang';

const TYPE_INFO: Record<ChallengeType, { label: string; icon: IconName }> = {
  gapfill: { label: 'Fill the gap', icon: 'edit' },
  builder: { label: 'Sentence builder', icon: 'blocks' },
  dialogue: { label: 'Conversation', icon: 'chat' },
  spot: { label: 'Picture puzzle', icon: 'pin' },
  paint: { label: 'Paint it', icon: 'brush' },
  speed: { label: 'Speed round', icon: 'zap' },
};

type Finish = (correct: number, total: number, score?: number) => void;

function Stars({ n, size = 18, label = true }: { n: number; size?: number; label?: boolean }) {
  return (
    <span class="stars-row" role={label ? 'img' : undefined} aria-label={label ? `${n} of 3 stars` : undefined}>
      {[1, 2, 3].map((k) => (
        <span key={k} class={cx('star', k <= n && 'on')}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}

/** Progress bar + "item n of total" counter shared by the item-based games. */
function GameTop({ index, solved, total, label }: { index: number; solved: boolean; total: number; label: string }) {
  return (
    <div class="drill-top">
      <ProgressBar value={((index + (solved ? 1 : 0)) / total) * 100} label={label} />
      <span class="drill-count">
        {Math.min(index + 1, total)}/{total}
      </span>
    </div>
  );
}

/** Focus the "Next" button when it appears, so Enter / Space continues. */
function NextButton({ show, last, onClick }: { show: boolean; last: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (show) ref.current?.focus({ preventScroll: true });
  }, [show]);
  return (
    <div class="game-next">
      {show && (
        <button type="button" class="btn btn-primary btn-lg" onClick={onClick} ref={ref}>
          {last ? 'Finish' : 'Next'} <Icon name="arrow-right" size={18} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fill the gap
// ---------------------------------------------------------------------------

function GapFill({ items, onFinish }: { items: GapItem[]; onFinish: Finish }) {
  const deck = useMemo(() => shuffle(items).map((it) => ({ ...it, opts: shuffle(it.options) })), [items]);
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const item = deck[i];
  const answer = item.options[0];
  const [before, after] = item.la.split('___');

  const pick = (o: string) => {
    if (solved || wrong.includes(o)) return;
    if (o === answer) {
      setSolved(true);
      if (!wrong.length) setScore((s) => s + 1);
    } else setWrong([...wrong, o]);
  };
  const next = () => {
    if (i + 1 < deck.length) {
      setI(i + 1);
      setWrong([]);
      setSolved(false);
    } else onFinish(score, deck.length);
  };

  useKeys((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= item.opts.length) pick(item.opts[n - 1]);
  });

  return (
    <>
      <GameTop index={i} solved={solved} total={deck.length} label="Challenge progress" />
      <div class="game-card" key={i}>
        {item.show && (
          <div class="gap-show" role="img" aria-label={item.showLabel ?? item.show}>
            {item.show}
          </div>
        )}
        <p class="gap-sentence" lang={L}>
          {before}
          <span class={cx('gap', solved && 'filled')}>{solved ? answer : '?'}</span>
          {after}
          {solved && <AudioButton text={item.la.replace('___', answer)} size="sm" />}
        </p>
        {item.en && <p class="gap-en">{item.en}</p>}
        <div class="gap-options" role="group" aria-label="Choices">
          {item.opts.map((o, k) => (
            <button
              type="button"
              key={o}
              lang={L}
              class={cx('opt', wrong.includes(o) && 'wrong', solved && o === answer && 'right')}
              disabled={solved || wrong.includes(o)}
              onClick={() => pick(o)}
            >
              <span class="opt-key" aria-hidden="true">
                {k + 1}
              </span>
              {o}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          {!solved && wrong.length > 0 && <p class="try-again">Not quite. Try another one!</p>}
          {solved && (
            <div class="feedback good">
              <span class="fb-icon">
                <Icon name="check" size={18} />
              </span>
              <div>
                <p class="fb-title">{wrong.length ? 'Got there!' : 'Correct first time!'}</p>
                {item.why && <p class="muted">{item.why}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      <NextButton show={solved} last={i === deck.length - 1} onClick={next} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sentence builder
// ---------------------------------------------------------------------------

const words = (s: string) =>
  s
    .replace(/[.,!?;:—…¿¡«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
const normalizeSentence = (s: string) => words(fold(s)).join(' ');
const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * Tiles for a model sentence. Sentence-initial capitals are dropped so they don't
 * give the word order away (whichever tile is placed first gets the capital).
 * Proper nouns keep theirs, so model answers shouldn't start with a name.
 */
function sentenceTiles(s: string): string[] {
  const out: string[] = [];
  let start = true;
  for (const tok of s.split(/\s+/)) {
    const w = tok.replace(/[.,!?;:—…¿¡«»]/g, '');
    if (w) out.push(start ? w.charAt(0).toLowerCase() + w.slice(1) : w);
    start = /[.!?]$/.test(tok);
  }
  return out;
}

function Builder({ items, onFinish }: { items: BuildItem[]; onFinish: Finish }) {
  const deck = useMemo(
    () => shuffle(items).map((it) => ({ ...it, tiles: shuffle([...sentenceTiles(it.answers[0]), ...it.extra]).map((w, id) => ({ id, w })) })),
    [items],
  );
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'right' | 'revealed'>('idle');
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const item = deck[i];
  const done = status === 'right' || status === 'revealed';
  const tileText = (id: number) => item.tiles[id].w;

  const place = (id: number) => !done && setPlaced((p) => (p.includes(id) ? p : [...p, id]));
  const remove = (id: number) => !done && setPlaced((p) => p.filter((x) => x !== id));

  const check = () => {
    if (!placed.length || done) return;
    const guess = normalizeSentence(placed.map(tileText).join(' '));
    if (item.answers.some((a) => normalizeSentence(a) === guess)) {
      setStatus('right');
      if (misses === 0) setScore((s) => s + 1);
    } else {
      setMisses((m) => m + 1);
      setStatus('wrong');
      setTimeout(() => setStatus((s) => (s === 'wrong' ? 'idle' : s)), 700);
    }
  };
  const next = () => {
    if (i + 1 < deck.length) {
      setI(i + 1);
      setPlaced([]);
      setStatus('idle');
      setMisses(0);
    } else onFinish(score, deck.length);
  };

  useKeys((e) => {
    if (e.key === 'Enter' && !done) check();
    else if (e.key === 'Backspace' && !done) setPlaced((p) => p.slice(0, -1));
  });

  return (
    <>
      <GameTop index={i} solved={done} total={deck.length} label="Challenge progress" />
      <div class="game-card" key={i}>
        <p class="q-kicker">Say it in {LANG.language}</p>
        <p class="build-en">“{item.en}”</p>
        <div class={cx('build-answer', status)} aria-live="polite" aria-label="Your sentence">
          {placed.length === 0 && <span class="build-placeholder">Tap the tiles below to build the sentence…</span>}
          {placed.map((id, k) => (
            <button type="button" key={id} class="tile-word placed" lang={L} onClick={() => remove(id)} disabled={done}>
              {k === 0 ? capitalize(tileText(id)) : tileText(id)}
            </button>
          ))}
        </div>
        <div class="build-bank" role="group" aria-label="Word tiles">
          {item.tiles.map((t) => (
            <button
              type="button"
              key={t.id}
              lang={L}
              class={cx('tile-word', placed.includes(t.id) && 'used')}
              onClick={() => place(t.id)}
              disabled={done || placed.includes(t.id)}
            >
              {t.w}
            </button>
          ))}
        </div>
        {!done && (
          <div class="build-controls">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setPlaced([])} disabled={!placed.length}>
              Clear
            </button>
            {misses > 0 && (
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setStatus('revealed')}>
                Show answer
              </button>
            )}
            <button type="button" class="btn btn-primary" onClick={check} disabled={!placed.length}>
              Check <kbd>Enter</kbd>
            </button>
          </div>
        )}
        <div aria-live="polite">
          {status === 'wrong' && <p class="try-again">Not quite. Check the endings and the word order.</p>}
          {done && (
            <div class={cx('feedback', status === 'right' ? 'good' : 'bad')}>
              <span class="fb-icon">
                <Icon name={status === 'right' ? 'check' : 'info'} size={18} />
              </span>
              <div>
                <p class="fb-title">{status === 'right' ? (misses ? 'You got it!' : 'Perfect first time!') : 'Here’s the answer'}</p>
                <p>
                  <b class="la" lang={L}>
                    {item.answers[0]}
                  </b>{' '}
                  <AudioButton text={item.answers[0]} size="sm" />
                </p>
                {item.answers.length > 1 && <p class="muted small">Other correct word orders work too.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      <NextButton show={done} last={i === deck.length - 1} onClick={next} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

interface Line {
  who: 'them' | 'me';
  la: string;
  en?: string;
}

function Dialogue({ challenge, onFinish }: { challenge: Extract<Challenge, { type: 'dialogue' }>; onFinish: Finish }) {
  const { turns, partner, outro } = challenge;
  const [t, setT] = useState(0);
  const [log, setLog] = useState<Line[]>([{ who: 'them', la: turns[0].say, en: turns[0].en }]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [ended, setEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [showEn, setShowEn] = useState<Set<number>>(new Set());
  const bottom = useRef<HTMLDivElement>(null);
  const turn = turns[t];
  const opts = useMemo(() => shuffle(turn.options), [turn]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [log.length, typing, wrong.length]);

  const reply = (la: string) => {
    if (typing || ended || wrong.includes(la)) return;
    if (la !== turn.options[0].la) return setWrong([...wrong, la]);
    if (!wrong.length) setScore((s) => s + 1);
    setLog((l) => [...l, { who: 'me', la }]);
    setWrong([]);
    setTyping(true);
    setTimeout(() => {
      const nextTurn = turns[t + 1];
      setLog((l) => [...l, nextTurn ? { who: 'them', la: nextTurn.say, en: nextTurn.en } : { who: 'them', la: outro[0], en: outro[1] }]);
      setTyping(false);
      if (nextTurn) setT(t + 1);
      else setEnded(true);
    }, 750);
  };

  const toggleEn = (k: number) =>
    setShowEn((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const lastWrong = wrong.length ? turn.options.find((o) => o.la === wrong[wrong.length - 1]) : undefined;

  return (
    <>
      <GameTop index={t} solved={ended} total={turns.length} label="Conversation progress" />
      <div class="game-card chat-card">
        <div class="chat" aria-live="polite">
          {log.map((line, k) => (
            <div key={k} class={cx('bubble-row', line.who)}>
              {line.who === 'them' && (
                <span class="avatar" aria-hidden="true">
                  {partner.icon}
                </span>
              )}
              <div class="bubble">
                {line.who === 'them' && <span class="bubble-name">{partner.name}</span>}
                <span class="bubble-la" lang={L}>
                  {line.la}
                </span>
                {line.who === 'them' && (
                  <span class="bubble-tools">
                    <AudioButton text={line.la} size="sm" />
                    <button type="button" class="en-toggle" onClick={() => toggleEn(k)} aria-expanded={showEn.has(k)}>
                      {showEn.has(k) ? 'Hide English' : 'English?'}
                    </button>
                  </span>
                )}
                {line.en && showEn.has(k) && <span class="bubble-en">{line.en}</span>}
              </div>
            </div>
          ))}
          {typing && (
            <div class="bubble-row them">
              <span class="avatar" aria-hidden="true">
                {partner.icon}
              </span>
              <div class="bubble typing" aria-label={`${partner.name} is typing`}>
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>

        {!ended && !typing && (
          <div class="dlg-reply">
            <p class="dlg-task">
              <Icon name="target" size={16} /> {turn.task}
            </p>
            <div class="dlg-options" role="group" aria-label="Your reply">
              {opts.map((o) => (
                <button
                  type="button"
                  key={o.la}
                  lang={L}
                  class={cx('dlg-opt', wrong.includes(o.la) && 'wrong')}
                  disabled={wrong.includes(o.la)}
                  onClick={() => reply(o.la)}
                >
                  {o.la}
                </button>
              ))}
            </div>
            <div aria-live="polite">{lastWrong?.fb && <p class="try-again">{lastWrong.fb}</p>}</div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      <NextButton show={ended} last onClick={() => onFinish(score, turns.length)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Picture puzzle (family tree, town map)
// ---------------------------------------------------------------------------

function Spot({ challenge, onFinish }: { challenge: Extract<Challenge, { type: 'spot' }>; onFinish: Finish }) {
  const prompts = useMemo(() => shuffle(challenge.prompts), [challenge]);
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const prompt = prompts[i];
  const cols = Math.max(...challenge.places.map((p) => p.col));
  const target = challenge.places.find((p) => p.id === prompt.target)!;

  const pick = (id: string) => {
    if (solved || wrong.includes(id)) return;
    if (id === prompt.target) {
      setSolved(true);
      if (!wrong.length && !hint) setScore((s) => s + 1);
    } else setWrong([...wrong, id]);
  };
  const next = () => {
    if (i + 1 < prompts.length) {
      setI(i + 1);
      setWrong([]);
      setSolved(false);
      setHint(false);
    } else onFinish(score, prompts.length);
  };

  return (
    <>
      <GameTop index={i} solved={solved} total={prompts.length} label="Challenge progress" />
      <div class="game-card">
        <div class="spot-prompt" key={i}>
          <p class="spot-la" lang={L}>
            {prompt.la} <AudioButton text={prompt.la} size="sm" />
          </p>
          {hint || solved ? (
            <p class="muted">{prompt.en}</p>
          ) : (
            <button type="button" class="en-toggle" onClick={() => setHint(true)}>
              Show English (no bonus star)
            </button>
          )}
        </div>
        <div class={cx('spot-grid', challenge.layout)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {challenge.places.map((pl) => (
            <button
              type="button"
              key={pl.id}
              class={cx('spot', wrong.includes(pl.id) && 'wrong', solved && pl.id === prompt.target && 'right')}
              style={{ gridRow: pl.row, gridColumn: pl.col }}
              onClick={() => pick(pl.id)}
              disabled={solved || wrong.includes(pl.id)}
              aria-label={`${pl.name}, ${pl.sub}`}
            >
              <span class="spot-icon" aria-hidden="true">
                {pl.icon}
              </span>
              <span class="spot-name" lang={challenge.layout === 'tree' ? 'la' : undefined}>
                {pl.name}
              </span>
              <span class="spot-sub">{pl.sub}</span>
            </button>
          ))}
        </div>
        <div aria-live="polite">
          {!solved && wrong.length > 0 && <p class="try-again">Not there. Read the {LANG.language} again!</p>}
          {solved && (
            <div class="feedback good">
              <span class="fb-icon">
                <Icon name="check" size={18} />
              </span>
              <p class="fb-title">
                {target.name}: {wrong.length || hint ? 'found it!' : 'first time!'}
              </p>
            </div>
          )}
        </div>
      </div>
      <NextButton show={solved} last={i === prompts.length - 1} onClick={next} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Paint by Latin
// ---------------------------------------------------------------------------

function PaintScene({ fills, active }: { fills: Partial<Record<PaintRegion, string>>; active: PaintRegion | null }) {
  const cls = (r: PaintRegion) => cx('region', fills[r] && 'painted', active === r && 'active');
  const fill = (r: PaintRegion) => fills[r] ?? 'var(--paint-blank)';
  return (
    <svg class="paint-svg" viewBox="0 0 320 220" role="img" aria-label="A picture of a house to paint">
      <rect class={cls('sky')} x="1" y="1" width="318" height="149" fill={fill('sky')} />
      <circle class={cls('sun')} cx="264" cy="44" r="22" fill={fill('sun')} />
      <g class={cls('cloud')} fill={fill('cloud')}>
        <circle cx="68" cy="50" r="15" />
        <circle cx="90" cy="41" r="20" />
        <circle cx="113" cy="51" r="14" />
        <rect x="60" y="50" width="62" height="14" rx="7" />
      </g>
      <rect class={cls('grass')} x="1" y="150" width="318" height="69" fill={fill('grass')} />
      <polygon class={cls('roof')} points="82,102 150,52 218,102" fill={fill('roof')} />
      <rect class={cls('house')} x="94" y="102" width="112" height="82" fill={fill('house')} />
      <rect class="window" x="106" y="116" width="22" height="20" rx="2" />
      <rect class="window" x="172" y="116" width="22" height="20" rx="2" />
      <rect class={cls('door')} x="137" y="134" width="26" height="50" rx="3" fill={fill('door')} />
      <line class="stem" x1="254" y1="186" x2="254" y2="162" />
      <circle class={cls('flower')} cx="254" cy="155" r="11" fill={fill('flower')} />
      <circle class="flower-eye" cx="254" cy="155" r="3.5" />
    </svg>
  );
}

function Paint({ challenge, course, onFinish }: { challenge: Extract<Challenge, { type: 'paint' }>; course: Course; onFinish: Finish }) {
  const palette = useMemo(() => shuffle(course.vocab.filter((v) => v.swatch)), [course]);
  const byId = (id: string) => palette.find((v) => v.id === id)!;
  const [i, setI] = useState(0);
  const [fills, setFills] = useState<Partial<Record<PaintRegion, string>>>({});
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const prompts = useMemo(() => shuffle(challenge.prompts), [challenge]);
  const prompt = prompts[i];
  const lastWrong: VocabItem | undefined = wrong.length ? byId(wrong[wrong.length - 1]) : undefined;

  const pick = (id: string) => {
    if (solved || wrong.includes(id)) return;
    if (id === prompt.color) {
      setFills((f) => ({ ...f, [prompt.region]: byId(id).swatch }));
      setSolved(true);
      if (!wrong.length && !hint) setScore((s) => s + 1);
    } else setWrong([...wrong, id]);
  };
  const next = () => {
    if (i + 1 < prompts.length) {
      setI(i + 1);
      setWrong([]);
      setSolved(false);
      setHint(false);
    } else onFinish(score, prompts.length);
  };

  return (
    <>
      <GameTop index={i} solved={solved} total={prompts.length} label="Painting progress" />
      <div class="game-card paint-layout">
        <PaintScene fills={fills} active={solved ? null : prompt.region} />
        <div class="paint-side">
          <div class="spot-prompt" key={i}>
            <p class="spot-la" lang={L}>
              {prompt.la} <AudioButton text={prompt.la} size="sm" />
            </p>
            {hint || solved ? (
              <p class="muted">{prompt.en}</p>
            ) : (
              <button type="button" class="en-toggle" onClick={() => setHint(true)}>
                Show English (no bonus star)
              </button>
            )}
          </div>
          <p class="muted small">Paint the flashing part. Choose a colour:</p>
          <div class="palette" role="group" aria-label="Colours">
            {palette.map((v) => (
              <button
                type="button"
                key={v.id}
                class={cx('swatch-btn', wrong.includes(v.id) && 'wrong', solved && v.id === prompt.color && 'right')}
                style={{ background: v.swatch }}
                onClick={() => pick(v.id)}
                disabled={solved || wrong.includes(v.id)}
                aria-label={v.en}
              />
            ))}
          </div>
          <div aria-live="polite">
            {!solved && lastWrong && (
              <p class="try-again">
                That’s <b lang={L}>{headOf(lastWrong)}</b> ({lastWrong.en}). Try again!
              </p>
            )}
            {solved && (
              <div class="feedback good">
                <span class="fb-icon">
                  <Icon name="check" size={18} />
                </span>
                <p class="fb-title">
                  <span lang={L}>{headOf(byId(prompt.color))}</span> = {byId(prompt.color).en}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <NextButton show={solved} last={i === prompts.length - 1} onClick={next} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Speed round
// ---------------------------------------------------------------------------

const SPEED_SECONDS = 60;
const label = (v: VocabItem) => v.match ?? v.en;

function dealCard(vocab: VocabItem[], prev?: VocabItem) {
  let v = vocab[Math.floor(Math.random() * vocab.length)];
  if (v === prev && vocab.length > 1) v = vocab[(vocab.indexOf(v) + 1) % vocab.length];
  const isMatch = Math.random() < 0.5;
  const others = vocab.filter((o) => label(o) !== label(v));
  const shown = isMatch || !others.length ? label(v) : label(others[Math.floor(Math.random() * others.length)]);
  return { v, shown, isMatch: shown === label(v) };
}

export function Speed({ course, onFinish, intro }: { course: Course; onFinish: Finish; intro?: string }) {
  const [phase, setPhase] = useState<'ready' | 'play'>('ready');
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [card, setCard] = useState(() => dealCard(course.vocab));
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [tries, setTries] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const finished = useRef(false);

  const left = Math.max(0, endAt - now);

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'play' && left === 0 && !finished.current) {
      finished.current = true;
      onFinish(right, tries, score);
    }
  }, [left, phase]);

  const start = () => {
    const t = Date.now();
    setNow(t);
    setEndAt(t + SPEED_SECONDS * 1000);
    setPhase('play');
  };

  const answer = (yes: boolean) => {
    if (phase !== 'play' || left === 0) return;
    const ok = yes === card.isMatch;
    setTries((n) => n + 1);
    if (ok) {
      setRight((n) => n + 1);
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setScore((s) => Math.max(0, s - 1));
      setStreak(0);
    }
    setFlash(ok ? 'good' : 'bad');
    setTimeout(() => setFlash(null), 250);
    setCard(dealCard(course.vocab, card.v));
  };

  useKeys((e) => {
    if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      start();
    } else if (e.key === 'ArrowRight' || e.key === 'j') answer(true);
    else if (e.key === 'ArrowLeft' || e.key === 'f') answer(false);
  });

  if (phase === 'ready') {
    return (
      <div class="game-card speed-ready">
        <span class="speed-bolt" aria-hidden="true">
          <Icon name="zap" size={40} />
        </span>
        <h2>Ready?</h2>
        <p class="muted">
          You get {SPEED_SECONDS} seconds. Tap <b>✓</b> if the meaning matches the {LANG.language} word and <b>✗</b> if it doesn’t. Right answers score
          +1, wrong ones −1.
        </p>
        <p class="muted small">
          {intro ?? `${SPEED_STARS[0]} points = 2 stars · ${SPEED_STARS[1]} points = 3 stars`} · Keyboard: ← no, → yes
        </p>
        <button type="button" class="btn btn-primary btn-lg" onClick={start}>
          Start <Icon name="arrow-right" size={18} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div class="drill-top">
        <div class="progress timer" role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
          <span style={{ width: `${(left / (SPEED_SECONDS * 1000)) * 100}%` }} />
        </div>
        <span class="hud-chip">
          <Icon name="clock" size={16} /> {Math.ceil(left / 1000)}s
        </span>
        <span class="hud-chip good">
          <Icon name="star" size={16} /> {score}
        </span>
      </div>
      <div class={cx('game-card speed-card', flash)}>
        {streak >= 3 && <span class="streak-badge">🔥 {streak} in a row</span>}
        <p class="speed-la" lang={L}>
          {headOf(card.v)}
        </p>
        <p class="speed-eq" aria-hidden="true">
          =
        </p>
        <p class="speed-en">{card.shown}</p>
        <div class="speed-btns">
          <button type="button" class="btn speed-no" onClick={() => answer(false)} aria-label="No, that doesn't match">
            <Icon name="x" size={26} /> No
          </button>
          <button type="button" class="btn speed-yes" onClick={() => answer(true)} aria-label="Yes, that matches">
            <Icon name="check" size={26} /> Yes
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Player, result and hub
// ---------------------------------------------------------------------------

function Game({ course, challenge, onFinish }: { course: Course; challenge: Challenge; onFinish: Finish }) {
  switch (challenge.type) {
    case 'gapfill':
      return <GapFill items={challenge.items} onFinish={onFinish} />;
    case 'builder':
      return <Builder items={challenge.items} onFinish={onFinish} />;
    case 'dialogue':
      return <Dialogue challenge={challenge} onFinish={onFinish} />;
    case 'spot':
      return <Spot challenge={challenge} onFinish={onFinish} />;
    case 'paint':
      return <Paint challenge={challenge} course={course} onFinish={onFinish} />;
    case 'speed':
      return <Speed course={course} onFinish={onFinish} />;
  }
}

interface Result {
  stars: number;
  correct: number;
  total: number;
  score?: number;
  newBest: boolean;
}

function ChallengePlayer({ course, challenge }: { course: Course; challenge: Challenge }) {
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const list = challengesOf(course);
  const nextChallenge = list[list.findIndex((c) => c.id === challenge.id) + 1];
  useTitle(`${challenge.title} · ${course.title}`);

  const finish: Finish = (correct, total, score) => {
    const stars = challenge.type === 'speed' ? speedStars(score ?? 0) : starsFor(correct, total);
    const prevStars = getProgress().challenges[challenge.id]?.stars ?? 0;
    actions.recordChallenge(challenge.id, stars, score ?? correct);
    if (challengesDone(course, getProgress()) === list.length) actions.completeStep(course.id, 'challenges', 30);
    if (stars === 3) confetti([...course.colors, '#ffffff', '#ffb020']);
    setResult({ stars, correct, total, score, newBest: stars > prevStars });
  };

  const info = TYPE_INFO[challenge.type];
  const titles = ['', 'Challenge complete!', 'Great work!', 'Perfect!'];

  return (
    <div class="drill drill-wide challenge">
      <div class="ch-head">
        <a class="crumb crumb-dark" href={href('course', course.id, 'challenges')}>
          <Icon name="arrow-left" size={16} /> All challenges
        </a>
        <p class="eyebrow">
          <Icon name={info.icon} size={14} /> {info.label}
        </p>
        <h1 class="ch-title">{challenge.title}</h1>
        <p class="muted">{challenge.desc}</p>
      </div>

      {result ? (
        <div class="result-card">
          <Stars n={result.stars} size={44} />
          <h2 class="result-title">{titles[result.stars]}</h2>
          <p class="muted">
            {result.score !== undefined
              ? `You scored ${result.score} (${result.correct} right out of ${result.total}).`
              : `${result.correct} of ${result.total} right first time.`}
            {result.newBest && result.stars > 0 ? ' New best!' : ''}
          </p>
          {result.stars < 3 && (
            <p class="muted small">
              {challenge.type === 'speed'
                ? `Score ${result.stars === 1 ? SPEED_STARS[0] : SPEED_STARS[1]} for the next star.`
                : 'Get everything right first time for three stars.'}
            </p>
          )}
          <div class="result-actions">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => {
                setResult(null);
                setRun((r) => r + 1);
              }}
            >
              <Icon name="refresh" size={18} /> Play again
            </button>
            {nextChallenge ? (
              <a class="btn btn-primary" href={href('course', course.id, 'challenges', nextChallenge.id)}>
                Next: {nextChallenge.title} <Icon name="arrow-right" size={18} />
              </a>
            ) : (
              <a class="btn btn-primary" href={href('course', course.id, 'challenges')}>
                All challenges <Icon name="arrow-right" size={18} />
              </a>
            )}
          </div>
        </div>
      ) : (
        <Game key={`${challenge.id}-${run}`} course={course} challenge={challenge} onFinish={finish} />
      )}
    </div>
  );
}

function ChallengeHub({ course }: { course: Course }) {
  const p = useProgress();
  const list = challengesOf(course);
  const done = challengesDone(course, p);
  const complete = done === list.length;

  return (
    <div class="challenge-hub">
      <header class="page-head">
        <p class="eyebrow">Step 5 · Challenges</p>
        <h1>Challenges</h1>
        <p class="lede-sm">
          Put your {course.title.toLowerCase()} {LANG.language} to work. Earn up to three stars in each game; a star in every one completes this step.
        </p>
      </header>

      <div class="ch-grid">
        {list.map((c, i) => {
          const stars = p.challenges[c.id]?.stars ?? 0;
          const info = TYPE_INFO[c.type];
          return (
            <a key={c.id} class={cx('ch-card', stars > 0 && 'played')} href={href('course', course.id, 'challenges', c.id)} style={{ '--i': i }}>
              <span class="ch-icon" aria-hidden="true">
                <Icon name={info.icon} size={24} />
              </span>
              <span class="ch-type">{info.label}</span>
              <h2 class="ch-name">{c.title}</h2>
              <p class="ch-desc">{c.desc}</p>
              <span class="ch-foot">
                <Stars n={stars} />
                <span class="ch-play">
                  {stars ? 'Play again' : 'Play'} <Icon name="arrow-right" size={16} />
                </span>
              </span>
            </a>
          );
        })}
      </div>

      <section class="panel tasks-panel" aria-labelledby="tasks-h">
        <div class="panel-head">
          <h2 id="tasks-h" class="h-sm">
            <Icon name="tasks" size={18} /> Tasks
          </h2>
          <p class="muted small">Game goals tick themselves. Real-life tasks are on your honour!</p>
        </div>
        <TaskList course={course} />
      </section>

      <div class="done-bar">
        <div>
          <p class="done-title">{complete ? 'Every challenge has a star!' : `${done} of ${list.length} challenges done`}</p>
          <p class="muted">{complete ? 'You’re ready for the quiz.' : 'Earn a star in each challenge to complete this step.'}</p>
        </div>
        {complete && <NextLink course={course} step="challenges" />}
      </div>
    </div>
  );
}

export function Challenges({ course, sub }: { course: Course; sub?: string }) {
  const challenge = sub ? challengesOf(course).find((c) => c.id === sub) : undefined;
  if (sub && !challenge) {
    return (
      <div class="empty-page">
        <p>That challenge doesn’t exist.</p>
        <a class="btn btn-primary" href={href('course', course.id, 'challenges')}>
          All challenges
        </a>
      </div>
    );
  }
  return challenge ? <ChallengePlayer key={challenge.id} course={course} challenge={challenge} /> : <ChallengeHub course={course} />;
}
