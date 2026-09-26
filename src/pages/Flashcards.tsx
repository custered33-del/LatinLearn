import { useRef, useState } from 'preact/hooks';
import { headOf } from '../data/courses';
import type { Course, VocabItem } from '../data/types';
import { Icon } from '../components/Icon';
import { AudioButton, ProgressBar, Ring, Say } from '../components/ui';
import { cx, useKeys } from '../lib/hooks';
import { actions, getProgress } from '../lib/progress';
import { NextLink } from './Course';

type Side = 'la' | 'en';

/** Weaker words tend to come first, but the order is different every time. */
const buildDeck = (course: Course): string[] => {
  const words = getProgress().words;
  return course.vocab
    .map((v) => ({ id: v.id, k: (words[v.id] ?? 0) + Math.random() * 2.5 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id);
};

function LatinFace({ v, full }: { v: VocabItem; full?: boolean }) {
  const head = headOf(v);
  return (
    <>
      <p class="face-kicker">Latin</p>
      <p class="flash-word la" lang="la">
        {head}
      </p>
      <Say text={head} />
      {full && v.la !== head && (
        <p class="face-sub" lang="la">
          {v.la}
        </p>
      )}
    </>
  );
}

function EnglishFace({ v }: { v: VocabItem }) {
  return (
    <>
      <p class="face-kicker">English</p>
      <p class="flash-word">
        {v.swatch && <span class="swatch-dot lg" style={{ background: v.swatch }} aria-hidden="true" />}
        {v.en}
      </p>
      {v.numeral && <span class="numeral lg">{v.numeral}</span>}
    </>
  );
}

export function Flashcards({ course }: { course: Course }) {
  const total = course.vocab.length;
  const byId = (id: string) => course.vocab.find((v) => v.id === id)!;

  const [front, setFront] = useState<Side>('la');
  const [queue, setQueue] = useState(() => buildDeck(course));
  const [flipped, setFlipped] = useState(false);
  const [tricky, setTricky] = useState<Set<string>>(new Set());
  const [exit, setExit] = useState<'left' | 'right' | null>(null);
  const [dx, setDx] = useState(0);
  const [round, setRound] = useState(0);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const known = total - queue.length;
  const finished = queue.length === 0;
  const card = finished ? null : byId(queue[0]);

  const decide = (gotIt: boolean) => {
    if (!card || !flipped || exit) return;
    setExit(gotIt ? 'right' : 'left');
    // Input is locked while the card animates out, so `queue` can't change underneath us.
    const [first, ...rest] = queue;
    setTimeout(() => {
      actions.answer(card.id, gotIt, gotIt ? 5 : 0);
      if (gotIt) {
        setQueue(rest);
        if (!rest.length) actions.completeStep(course.id, 'flashcards', 20);
      } else {
        const at = Math.min(3, rest.length);
        setQueue([...rest.slice(0, at), first, ...rest.slice(at)]);
        setTricky((t) => new Set(t).add(card.id));
      }
      setFlipped(false);
      setExit(null);
      setDx(0);
      setRound((r) => r + 1);
    }, 220);
  };

  const flip = () => !exit && card && setFlipped((f) => !f);

  const restart = () => {
    setQueue(buildDeck(course));
    setTricky(new Set());
    setFlipped(false);
    setRound((r) => r + 1);
  };

  useKeys((e) => {
    if (finished) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flip();
    } else if (e.key === 'ArrowRight' || e.key === '2') decide(true);
    else if (e.key === 'ArrowLeft' || e.key === '1') decide(false);
  });

  if (finished) {
    return (
      <div class="drill">
        <div class="result-card">
          <Ring value={100} size={120} stroke={10} colors={course.colors} label="Deck complete">
            <Icon name="check" size={40} />
          </Ring>
          <h1 class="result-title">Deck complete!</h1>
          <p class="muted">
            {total} cards · {tricky.size === 0 ? 'no slips at all' : `${tricky.size} needed another look`}
          </p>
          {tricky.size > 0 && (
            <ul class="chip-list" aria-label="Tricky words">
              {[...tricky].map((id) => (
                <li key={id} class="word-pill" lang="la">
                  {headOf(byId(id))}
                </li>
              ))}
            </ul>
          )}
          <div class="result-actions">
            <button type="button" class="btn btn-ghost" onClick={restart}>
              <Icon name="refresh" size={18} /> Go again
            </button>
            <NextLink course={course} step="flashcards" />
          </div>
        </div>
      </div>
    );
  }

  const v = card!;
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current || !flipped) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 6) {
      drag.current.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setDx(d);
  };
  const onPointerUp = () => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (!moved) return setDx(0);
    suppressClick.current = true;
    if (Math.abs(dx) > 90) decide(dx > 0);
    else setDx(0);
  };
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    flip();
  };

  const offset = exit ? (exit === 'right' ? 600 : -600) : dx;

  return (
    <div class="drill">
      <div class="drill-top">
        <ProgressBar value={(known / total) * 100} label="Cards learned" />
        <span class="drill-count">
          {known}/{total}
        </span>
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => setFront(front === 'la' ? 'en' : 'la')}>
          <Icon name="swap" size={16} />
          {front === 'la' ? 'Latin first' : 'English first'}
        </button>
      </div>

      <div class="flash-stage">
        <AudioButton text={headOf(v)} class="flash-audio" />
        <span class="swipe-label left" style={{ opacity: Math.min(1, Math.max(0, -dx / 90)) }} aria-hidden="true">
          Again
        </span>
        <span class="swipe-label right" style={{ opacity: Math.min(1, Math.max(0, dx / 90)) }} aria-hidden="true">
          Got it
        </span>
        <div
          key={round}
          class={cx('flash-drag', dx !== 0 && !exit && drag.current && 'dragging')}
          style={{ transform: `translateX(${offset}px) rotate(${offset / 30}deg)`, opacity: exit ? 0 : 1 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            class={cx('flash-card', flipped && 'flipped')}
            role="button"
            tabIndex={0}
            aria-label={flipped ? 'Answer side. Press Space to flip back.' : 'Question side. Press Space to reveal the answer.'}
            onClick={onClick}
          >
            <div class="face front" aria-hidden={flipped}>
              {front === 'la' ? <LatinFace v={v} /> : <EnglishFace v={v} />}
              <span class="flash-hint">Tap or press Space to flip</span>
            </div>
            <div class="face back" aria-hidden={!flipped}>
              {front === 'la' ? <EnglishFace v={v} /> : <LatinFace v={v} full />}
              {v.ex && (
                <p class="face-ex">
                  <span lang="la">{v.ex[0]}</span>
                  <span>{v.ex[1]}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div class="flash-actions">
          <button type="button" class="btn btn-again" onClick={() => decide(false)}>
            <Icon name="refresh" size={18} /> Again <kbd>1</kbd>
          </button>
          <button type="button" class="btn btn-know" onClick={() => decide(true)}>
            <Icon name="check" size={18} /> Got it <kbd>2</kbd>
          </button>
        </div>
      ) : (
        <div class="flash-actions one">
          <button type="button" class="btn btn-primary" onClick={flip}>
            Show answer <kbd>Space</kbd>
          </button>
        </div>
      )}
      <p class="kbd-hint">Say the answer in your head first, then flip. Be honest: “Again” brings the card back sooner.</p>
    </div>
  );
}
