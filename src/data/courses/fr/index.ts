import type { Course } from '../../types';
import { colours, greetings, numbers, questions } from './a';
import { actions, family, places, time } from './b';
import { argumentsCourse, body, food } from './c';

export const courses: Course[] = [colours, numbers, greetings, questions, family, actions, time, places, argumentsCourse, food, body];
