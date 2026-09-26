import { useEffect, useReducer } from 'preact/hooks';
import type { CourseId, StepId } from '../data/types';

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
}

const KEY = 'latinlearn:progress:v2';
/** Progress from before the September 2026 reset; deleted on first load. */
const OLD_KEYS = ['latinlearn:progress:v1'];
export const MAX_STRENGTH = 5;

const empty = (): Progress => ({ words: {}, courses: {}, challenges: {}, tasks: {}, xp: 0, streak: 0, lastDay: '' });

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Accept saved progress only if it has the right shape; fill in anything missing. */
function sanitize(raw: unknown): Progress | null {
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

  reset(): void {
    commit(empty());
  },
};
