import { useEffect, useReducer } from 'preact/hooks';
import type { CourseId, StepId } from '../data/types';
import { LANG_ID, langKey, type LangId } from '../lang';

export interface CourseProgress {
  steps: Partial<Record<StepId, true>>;
  bestQuiz: number;
  quizzes: number;
  bestMatch?: number;
  bestSpeak?: number;
  /** Finished a Match game without a single mistake. */
  perfectMatch?: boolean;
}

export interface ChallengeResult {
  stars: number;
  best: number;
  plays: number;
}

/** The daily lesson's memory: its adaptive difficulty and minutes practised each day. */
export interface DailyState {
  /** 1 (gentle) to 10 (hardest); moves up and down with every answer. */
  level: number;
  /** Minutes practised in daily lessons, keyed by day. */
  days: Record<string, number>;
}

export interface Progress {
  /** Word strength 0–5, keyed by vocab id. */
  words: Record<string, number>;
  courses: Partial<Record<CourseId, CourseProgress>>;
  /** Keyed by challenge id. */
  challenges: Record<string, ChallengeResult>;
  /** Real-world tasks the learner has ticked off, keyed by task id. */
  tasks: Record<string, true>;
  xp: number;
  streak: number;
  lastDay: string;
  last?: { course: CourseId; step: StepId };
  daily?: DailyState;
}

const BASE_KEY = 'latinlearn:progress:v2';
/** Each language app keeps its own progress. */
const KEY = langKey(BASE_KEY);
/** Progress from before the September 2026 reset; deleted on first load. */
const OLD_KEYS = LANG_ID === 'la' ? ['latinlearn:progress:v1'] : [];
export const MAX_STRENGTH = 5;

const empty = (): Progress => ({ words: {}, courses: {}, challenges: {}, tasks: {}, xp: 0, streak: 0, lastDay: '' });
export const emptyProgress = empty;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Accept saved progress only if it has the right shape; fill in anything missing. */
export function sanitize(raw: unknown): Progress | null {
  if (!isObj(raw)) return null;
  const p = { ...empty(), ...raw } as Progress;
  if (!isObj(p.words) || !isObj(p.courses) || !isObj(p.challenges) || !isObj(p.tasks)) return null;
  if (typeof p.xp !== 'number' || typeof p.streak !== 'number' || typeof p.lastDay !== 'string') return null;
  return p;
}

function load(): Progress {
  try {
    if (typeof localStorage === 'undefined') return empty();
    for (const k of OLD_KEYS) localStorage.removeItem(k);
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw)) ?? empty();
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return empty();
}

let state: Progress = load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function commit(next: Progress): void {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: progress lasts for this session only */
  }
  notify();
}

/** Progress saved on this device for another language app (used by cloud sync). */
export function readStored(id: LangId): Progress {
  if (id === LANG_ID) return state;
  try {
    const raw = localStorage.getItem(langKey(BASE_KEY, id));
    if (raw) return sanitize(JSON.parse(raw)) ?? empty();
  } catch {
    /* ignore */
  }
  return empty();
}

export function writeStored(id: LangId, p: Progress): void {
  if (id === LANG_ID) return commit(p);
  try {
    localStorage.setItem(langKey(BASE_KEY, id), JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Replace all progress (used by cloud sync). */
export function replaceProgress(next: Progress): void {
  commit(next);
}

/** Run `fn` after every progress change; returns an unsubscribe function. */
export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const later = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));

/** Combine two devices' progress, keeping the best of each. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const words = { ...a.words };
  for (const [k, v] of Object.entries(b.words)) words[k] = Math.max(words[k] ?? 0, v);
  const courses: Progress['courses'] = { ...a.courses };
  for (const [id, cb] of Object.entries(b.courses) as [CourseId, CourseProgress][]) {
    const ca = a.courses[id];
    courses[id] = !ca
      ? cb
      : {
          steps: { ...ca.steps, ...cb.steps },
          bestQuiz: Math.max(ca.bestQuiz, cb.bestQuiz),
          quizzes: Math.max(ca.quizzes, cb.quizzes),
          bestMatch: ca.bestMatch === undefined ? cb.bestMatch : cb.bestMatch === undefined ? ca.bestMatch : Math.min(ca.bestMatch, cb.bestMatch),
          bestSpeak: later(ca.bestSpeak, cb.bestSpeak),
          perfectMatch: ca.perfectMatch || cb.perfectMatch || undefined,
        };
  }
  const challenges = { ...a.challenges };
  for (const [id, r] of Object.entries(b.challenges)) {
    const o = challenges[id];
    challenges[id] = o ? { stars: Math.max(o.stars, r.stars), best: Math.max(o.best, r.best), plays: Math.max(o.plays, r.plays) } : r;
  }
  const newer = b.lastDay > a.lastDay || (b.lastDay === a.lastDay && b.streak > a.streak) ? b : a;
  let daily = newer.daily ?? a.daily ?? b.daily;
  if (a.daily && b.daily && daily) {
    const days = { ...a.daily.days };
    for (const [d, m] of Object.entries(b.daily.days)) days[d] = Math.max(days[d] ?? 0, m);
    daily = { level: daily.level, days };
  }
  return {
    ...(daily ? { daily } : {}),
    words,
    courses,
    challenges,
    tasks: { ...a.tasks, ...b.tasks },
    xp: Math.max(a.xp, b.xp),
    streak: newer.streak,
    lastDay: newer.lastDay,
    last: a.last ?? b.last,
  };
}

// Another tab saved: adopt its progress so neither tab overwrites the other.
if (typeof window !== 'undefined') {
  addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try {
      state = (e.newValue && sanitize(JSON.parse(e.newValue))) || empty();
    } catch {
      return;
    }
    notify();
  });
}

// ---------------------------------------------------------------------------
// Save files
// ---------------------------------------------------------------------------

const SAVE_APP = 'LatinLearn';

/** The whole save as a JSON file body. */
export function exportProgress(): string {
  return JSON.stringify({ app: SAVE_APP, version: 2, saved: new Date().toISOString(), progress: state }, null, 1);
}

/** Load a save file. Returns an error message, or null on success. */
export function importProgress(text: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return 'That file isn’t a LatinLearn save file.';
  }
  if (!isObj(data) || data.app !== SAVE_APP) return 'That file isn’t a LatinLearn save file.';
  const p = sanitize(data.progress);
  if (!p) return 'That save file is damaged, so nothing was loaded.';
  commit(p);
  return null;
}

export const getProgress = (): Progress => state;

/** Re-render the calling component whenever progress changes. */
export function useProgress(): Progress {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return state;
}

export const dayKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function withXP(p: Progress, amount: number): Progress {
  if (amount <= 0) return p;
  const today = dayKey();
  let streak = p.streak;
  if (p.lastDay !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    streak = p.lastDay === dayKey(y) ? p.streak + 1 : 1;
  }
  return { ...p, xp: p.xp + amount, streak, lastDay: today };
}

/** Streak only counts if you practised today or yesterday. */
export function currentStreak(p: Progress): number {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return p.lastDay === dayKey() || p.lastDay === dayKey(y) ? p.streak : 0;
}

export const courseOf = (p: Progress, id: CourseId): CourseProgress => p.courses[id] ?? { steps: {}, bestQuiz: 0, quizzes: 0 };

function patchCourse(p: Progress, id: CourseId, patch: Partial<CourseProgress>): Progress {
  return { ...p, courses: { ...p.courses, [id]: { ...courseOf(p, id), ...patch } } };
}

export const actions = {
  /** Record an answer. `cap` stops easy drills (like matching) from fully mastering a word. */
  answer(wordId: string, correct: boolean, xp = 0, cap = MAX_STRENGTH): void {
    const cur = state.words[wordId] ?? 0;
    const next = correct ? Math.max(cur, Math.min(cap, cur + 1)) : Math.max(0, cur - 1);
    commit(withXP({ ...state, words: { ...state.words, [wordId]: next } }, correct ? xp : 0));
  },

  addXP(amount: number): void {
    commit(withXP(state, amount));
  },

  completeStep(course: CourseId, step: StepId, xp = 0): void {
    const c = courseOf(state, course);
    const first = !c.steps[step];
    commit(withXP(patchCourse(state, course, { steps: { ...c.steps, [step]: true } }), first ? xp : 0));
  },

  recordQuiz(course: CourseId, pct: number): void {
    const c = courseOf(state, course);
    commit(patchCourse(state, course, { bestQuiz: Math.max(c.bestQuiz, pct), quizzes: c.quizzes + 1 }));
  },

  recordMatch(course: CourseId, seconds: number, mistakes: number): void {
    const c = courseOf(state, course);
    const best = c.bestMatch === undefined ? seconds : Math.min(c.bestMatch, seconds);
    commit(patchCourse(state, course, { bestMatch: best, perfectMatch: c.perfectMatch || mistakes === 0 }));
  },

  /** Save a challenge result; XP is paid for each new star, plus a little for playing. */
  recordChallenge(id: string, stars: number, score: number): void {
    const prev = state.challenges[id];
    const next: ChallengeResult = {
      stars: Math.max(prev?.stars ?? 0, stars),
      best: Math.max(prev?.best ?? 0, score),
      plays: (prev?.plays ?? 0) + 1,
    };
    const xp = 5 + 10 * Math.max(0, stars - (prev?.stars ?? 0));
    commit(withXP({ ...state, challenges: { ...state.challenges, [id]: next } }, xp));
  },

  completeTask(id: string): void {
    if (state.tasks[id]) return;
    commit(withXP({ ...state, tasks: { ...state.tasks, [id]: true } }, 15));
  },

  recordSpeak(course: CourseId, pct: number): void {
    const c = courseOf(state, course);
    commit(patchCourse(state, course, { bestSpeak: Math.max(c.bestSpeak ?? 0, pct) }));
  },

  visit(course: CourseId, step: StepId): void {
    if (state.last?.course === course && state.last.step === step) return;
    commit({ ...state, last: { course, step } });
  },

  /** Save the daily lesson's level and today's minutes; `bonus` XP is paid when the 10 minutes are first reached. */
  recordDaily(level: number, minutes: number, bonus = 0): void {
    const d = state.daily ?? { level, days: {} };
    const today = dayKey();
    const days = { ...d.days, [today]: Math.max(d.days[today] ?? 0, minutes) };
    commit(withXP({ ...state, daily: { level: Math.round(level * 100) / 100, days } }, bonus));
  },

  reset(): void {
    commit(empty());
  },
};
