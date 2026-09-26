import { challengesOf } from '../data/courses';
import type { Course } from '../data/types';
import { MASTERED } from './mastery';
import { courseOf, type Progress } from './progress';

export interface TaskStatus {
  id: string;
  text: string;
  /** "auto" tasks tick themselves as you play; "self" tasks are real-world ones you tick. */
  kind: 'auto' | 'self';
  done: boolean;
  progress?: string;
}

/** Stars for item-based challenges: all first-try correct = 3, 70%+ = 2, otherwise 1. */
export const starsFor = (correct: number, total: number): number =>
  total <= 0 ? 0 : correct >= total ? 3 : correct / total >= 0.7 ? 2 : 1;

export const SPEED_STARS = [10, 18] as const;
export const speedStars = (score: number): number => (score >= SPEED_STARS[1] ? 3 : score >= SPEED_STARS[0] ? 2 : 1);

export const challengesDone = (course: Course, p: Progress): number =>
  challengesOf(course).filter((c) => (p.challenges[c.id]?.stars ?? 0) > 0).length;

export function courseTasks(course: Course, p: Progress): TaskStatus[] {
  const cp = courseOf(p, course.id);
  const all = challengesOf(course);
  const starred = challengesDone(course, p);
  const mastered = course.vocab.filter((v) => (p.words[v.id] ?? 0) >= MASTERED).length;
  const target = Math.min(5, course.vocab.length);

  return [
    {
      id: `${course.id}:all-challenges`,
      kind: 'auto',
      text: 'Earn a star in every challenge',
      done: starred === all.length,
      progress: `${starred}/${all.length}`,
    },
    {
      id: `${course.id}:three-stars`,
      kind: 'auto',
      text: 'Get three stars in any challenge',
      done: all.some((c) => (p.challenges[c.id]?.stars ?? 0) >= 3),
    },
    { id: `${course.id}:perfect-match`, kind: 'auto', text: 'Finish a Match game with no mistakes', done: !!cp.perfectMatch },
    {
      id: `${course.id}:master-words`,
      kind: 'auto',
      text: `Master ${target} words (fill ${MASTERED}+ strength bars)`,
      done: mastered >= target,
      progress: `${Math.min(mastered, target)}/${target}`,
    },
    { id: `${course.id}:perfect-quiz`, kind: 'auto', text: 'Score 100% on the quiz', done: cp.bestQuiz === 100 },
    ...course.tasks.map((t): TaskStatus => ({ id: t.id, kind: 'self', text: t.text, done: !!p.tasks[t.id] })),
  ];
}
