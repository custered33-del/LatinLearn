import { COURSES, STEPS } from '../data/courses';
import type { Course, StepId } from '../data/types';
import { MAX_STRENGTH, courseOf, type Progress } from './progress';

export interface Level {
  min: number;
  la: string;
  en: string;
}

export const LEVELS: Level[] = [
  { min: 0, la: 'Tīrō', en: 'Novice' },
  { min: 25, la: 'Discipulus', en: 'Learner' },
  { min: 50, la: 'Perītus', en: 'Skilled' },
  { min: 80, la: 'Magister', en: 'Master' },
];

export const levelFor = (mastery: number): Level => [...LEVELS].reverse().find((l) => mastery >= l.min) ?? LEVELS[0];

export const PASS_MARK = 80;
export const MASTERED = 4;

export interface CourseStats {
  /** 0–100: 60% word strength, 40% best quiz score. */
  mastery: number;
  stepsDone: number;
  /** Steps can be finished in any order. */
  stepDone: Record<StepId, boolean>;
  completion: number;
  wordsMastered: number;
  wordCount: number;
  nextStep: StepId | null;
  complete: boolean;
  level: Level;
}

export function courseStats(course: Course, p: Progress): CourseStats {
  const cp = courseOf(p, course.id);
  const strengths = course.vocab.map((v) => p.words[v.id] ?? 0);
  const wordScore = strengths.reduce((a, b) => a + b, 0) / (course.vocab.length * MAX_STRENGTH);
  const mastery = Math.round(100 * (0.6 * wordScore + 0.4 * (cp.bestQuiz / 100)));
  const stepDone = Object.fromEntries(STEPS.map((s) => [s.id, !!cp.steps[s.id]])) as Record<StepId, boolean>;
  const stepsDone = STEPS.filter((s) => stepDone[s.id]).length;
  const nextStep = STEPS.find((s) => !stepDone[s.id])?.id ?? null;
  return {
    mastery,
    stepsDone,
    stepDone,
    completion: Math.round((stepsDone / STEPS.length) * 100),
    wordsMastered: strengths.filter((s) => s >= MASTERED).length,
    wordCount: course.vocab.length,
    nextStep,
    complete: nextStep === null,
    level: levelFor(mastery),
  };
}

export function overallStats(p: Progress) {
  const stats = COURSES.map((c) => courseStats(c, p));
  return {
    coursesComplete: stats.filter((s) => s.complete).length,
    wordsMastered: stats.reduce((a, s) => a + s.wordsMastered, 0),
    wordCount: stats.reduce((a, s) => a + s.wordCount, 0),
    mastery: Math.round(stats.reduce((a, s) => a + s.mastery, 0) / stats.length),
  };
}

/** Where "Continue" should take the learner. */
export function suggestNext(p: Progress): { course: Course; step: StepId } {
  const last = p.last && COURSES.find((c) => c.id === p.last!.course);
  if (last) {
    const s = courseStats(last, p);
    if (s.nextStep) return { course: last, step: s.nextStep };
  }
  for (const c of COURSES) {
    const s = courseStats(c, p);
    if (s.nextStep) return { course: c, step: s.nextStep };
  }
  return { course: COURSES[0], step: 'quiz' };
}
