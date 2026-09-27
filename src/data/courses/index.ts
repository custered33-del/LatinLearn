import type { Challenge, Course, StepId, VocabItem } from '../types';
import type { LangId } from '../../lang';

/** Courses for the current language; filled by loadCourses() before the app renders. */
export const COURSES: Course[] = [];

const LOADERS: Record<LangId, () => Promise<Course[]>> = {
  la: () => import('./la').then((m) => m.courses),
  de: () => import('./de').then((m) => m.courses),
  es: () => import('./es').then((m) => m.courses),
  fr: () => import('./fr').then((m) => m.courses),
  zh: () => import('./zh').then((m) => m.courses),
  ar: () => import('./ar').then((m) => m.courses),
  ja: () => import('./ja').then((m) => m.courses),
  ru: () => import('./ru').then((m) => m.courses),
  vi: () => import('./vi').then((m) => m.courses),
};

export async function loadCourses(id: LangId): Promise<Course[]> {
  const list = await LOADERS[id]();
  COURSES.splice(0, COURSES.length, ...list);
  return list;
}

export const courseById = (id: string): Course | undefined => COURSES.find((c) => c.id === id);

export interface StepInfo {
  id: StepId;
  title: string;
  desc: string;
}

export const STEPS: StepInfo[] = [
  { id: 'learn', title: 'Learn', desc: 'Words, sounds and key ideas' },
  { id: 'flashcards', title: 'Flashcards', desc: 'Flip, recall, repeat' },
  { id: 'match', title: 'Match', desc: 'Race the clock to pair them up' },
  { id: 'speak', title: 'Speak', desc: 'Say it out loud and get checked' },
  { id: 'challenges', title: 'Challenges', desc: 'Games that put your Latin to work' },
  { id: 'quiz', title: 'Quiz', desc: 'Score 80% to pass the course' },
];

export const stepById = (id: string): StepInfo | undefined => STEPS.find((s) => s.id === id);

/** The form used as the answer in drills. */
export const headOf = (v: VocabItem): string => v.head ?? v.la;

/** A course's authored challenges plus the automatic speed round. */
export const challengesOf = (course: Course): Challenge[] => [
  ...course.challenges,
  {
    id: `${course.id}-speed`,
    type: 'speed',
    title: 'Speed round',
    desc: 'Sixty seconds on the clock. Is each word matched with the right meaning?',
  },
];
