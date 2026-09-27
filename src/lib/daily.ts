/**
 * The daily lesson: ten minutes of practice built for this learner.
 *
 * - Weak words come back first, new words arrive in course order, and
 *   mastered words return now and then so they aren't forgotten.
 * - A difficulty level (1–10) rises with right answers and falls with wrong
 *   ones, settling where the learner gets about 80% right. Higher levels mean
 *   harder question types (typing, listening), more options and trickier
 *   distractors from the same course.
 * - Missed words come back a few questions later.
 */
import { COURSES, headOf } from '../data/courses';
import type { CourseId, VocabItem } from '../data/types';
import { LANG } from '../lang';
import { MASTERED } from './mastery';
import type { Progress } from './progress';

export const DAILY_SECONDS = 600;
/** Idle time beyond this between answers doesn't count towards the 10 minutes. */
export const MAX_GAP_MS = 30_000;

export type Kind = 'intro' | 'recognise' | 'produce' | 'listen' | 'type';
export const DIFFICULTY: Record<Kind, number> = { intro: 0, recognise: 1, produce: 3, listen: 4.5, type: 6 };
export const KIND_LABEL: Record<Kind, string> = {
  intro: 'New word',
  recognise: 'What does it mean?',
  produce: 'Pick the translation',
  listen: 'Listen',
  type: 'Type it',
};

export interface Word extends VocabItem {
  courseId: CourseId;
  course: string;
}

export interface Item {
  kind: Kind;
  word: Word;
  /** Multiple choice: the options and the index of the right one. */
  options: string[];
  answer: number;
}

const label = (v: VocabItem) => v.match ?? v.en;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function allWords(): Word[] {
  const seen = new Set<string>();
  const out: Word[] = [];
  for (const c of [...COURSES].sort((a, b) => a.n - b.n)) {
    for (const v of c.vocab) {
      if (v.pos === 'suffix' || seen.has(v.id)) continue;
      seen.add(v.id);
      out.push({ ...v, courseId: c.id, course: c.title });
    }
  }
  return out;
}

/** Where a learner starts: their saved level, or a guess from how many words they know. */
export function startLevel(p: Progress, words = allWords()): number {
  if (p.daily?.level) return clamp(p.daily.level, 1, 10);
  const mastered = words.filter((w) => (p.words[w.id] ?? 0) >= MASTERED).length;
  return Math.round(clamp(1 + 12 * (mastered / Math.max(1, words.length)), 1, 8) * 10) / 10;
}

/** Right answers nudge the level up (more for harder questions); wrong ones pull it down harder. */
export const adjustLevel = (level: number, correct: boolean, kind: Kind): number =>
  clamp(level + (correct ? 0.1 + 0.02 * DIFFICULTY[kind] : -0.4), 1, 10);

/** How many answer options to show at a level. */
export const optionCount = (level: number): number => (level < 4 ? 3 : level < 7 ? 4 : 5);

export class DailySession {
  level: number;
  private step = 0;
  private introduced = 0;
  private recent: string[] = [];
  private again: { word: Word; due: number }[] = [];
  private readonly words: Word[];

  constructor(
    private readonly progress: () => Progress,
    private readonly canListen: (w: Word) => boolean,
    private readonly random: () => number = Math.random,
    words?: Word[],
  ) {
    this.words = words ?? allWords();
    this.level = startLevel(progress(), this.words);
  }

  /** The next question (or new-word card). */
  next(): Item {
    this.step++;
    const due = this.again.findIndex((a) => a.due <= this.step && !this.recent.slice(-1).includes(a.word.id));
    if (due >= 0) {
      const [{ word }] = this.again.splice(due, 1);
      // A missed word comes back as an easier multiple-choice question.
      return this.build(word, DIFFICULTY[this.kindFor(word)] >= DIFFICULTY.produce ? 'produce' : 'recognise');
    }
    const word = this.pickWord();
    const strength = this.progress().words[word.id];
    if (strength === undefined) {
      this.introduced++;
      this.again.push({ word, due: this.step + 1 });
      return this.build(word, 'intro');
    }
    return this.build(word, this.kindFor(word));
  }

  /** Learn from an answer: adapt the level and bring missed words back soon. */
  record(item: Item, correct: boolean): void {
    if (item.kind === 'intro') return;
    this.level = adjustLevel(this.level, correct, item.kind);
    if (!correct) this.again.push({ word: item.word, due: this.step + 2 + Math.floor(this.random() * 3) });
  }

  private pickWord(): Word {
    const strengths = this.progress().words;
    const avoid = new Set([...this.recent.slice(-3), ...this.again.map((a) => a.word.id)]);
    const ok = (w: Word) => !avoid.has(w.id);
    const fresh = this.words.filter((w) => strengths[w.id] === undefined && ok(w));
    const weak = this.words.filter((w) => strengths[w.id] !== undefined && strengths[w.id] < MASTERED && ok(w));
    const strong = this.words.filter((w) => (strengths[w.id] ?? 0) >= MASTERED && ok(w));

    // New words: plenty when there's little to review, fewer (but more at higher levels) otherwise.
    const maxNew = 3 + Math.round(this.level);
    const newChance = weak.length < 4 ? 0.85 : 0.08 + 0.03 * this.level;
    let pick: Word | undefined;
    if (fresh.length && this.introduced < maxNew && this.random() < newChance) pick = fresh[0];
    else if (weak.length && (this.random() < 0.85 || !strong.length)) {
      const weakest = weak.sort((a, b) => strengths[a.id] - strengths[b.id]).slice(0, 5);
      pick = weakest[Math.floor(this.random() * weakest.length)];
    } else if (strong.length) pick = strong[Math.floor(this.random() * strong.length)];
    pick ??= fresh[0] ?? weak[0] ?? this.words[Math.floor(this.random() * this.words.length)];
    this.recent.push(pick.id);
    return pick;
  }

  /** Harder question types for stronger words and higher levels. */
  private kindFor(word: Word): Exclude<Kind, 'intro'> {
    const s = this.progress().words[word.id] ?? 0;
    const target = this.level * 0.6 + s * 0.8;
    const kinds = (['recognise', 'produce', 'listen', 'type'] as const).filter(
      (k) => DIFFICULTY[k] <= target && (k !== 'listen' || this.canListen(word)) && (k !== 'type' || LANG.typing !== false),
    );
    if (!kinds.length) return 'recognise';
    // Usually the hardest allowed type, sometimes an easier one for variety.
    return this.random() < 0.6 ? kinds[kinds.length - 1] : kinds[Math.floor(this.random() * kinds.length)];
  }

  private build(word: Word, kind: Kind): Item {
    if (kind === 'intro' || kind === 'type') return { kind, word, options: [], answer: 0 };
    const target = kind === 'produce'; // options in the language being learned
    const text = (v: VocabItem) => (target ? headOf(v) : label(v));
    // Higher levels take distractors from the same course, which are easier to mix up.
    const sameCourse = this.words.filter((w) => w.courseId === word.courseId);
    const pool = this.level >= 5 && sameCourse.length > optionCount(this.level) ? sameCourse : this.words;
    const options = [text(word)];
    for (const w of [...pool].sort(() => this.random() - 0.5)) {
      if (options.length >= optionCount(this.level)) break;
      const t = text(w);
      if (w.id !== word.id && !options.includes(t) && label(w) !== label(word)) options.push(t);
    }
    const shuffled = [...options].sort(() => this.random() - 0.5);
    return { kind, word, options: shuffled, answer: shuffled.indexOf(options[0]) };
  }
}
