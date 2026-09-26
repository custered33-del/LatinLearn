import type { Challenge, Course, StepId, VocabItem } from '../types';
import { colours } from './colours';
import { numbers } from './numbers';
import { greetings } from './greetings';
import { questions } from './questions';
import { family } from './family';
import { actions } from './actions';
import { time } from './time';
import { places } from './places';
import { argumentsCourse } from './arguments';
import { food } from './food';
import { body } from './body';

export const COURSES: Course[] = [colours, numbers, greetings, questions, family, actions, time, places, argumentsCourse, food, body];

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
