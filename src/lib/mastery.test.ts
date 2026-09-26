import { describe, expect, it } from 'vitest';
import { COURSES } from '../data/courses';
import { courseStats, levelFor, suggestNext } from './mastery';
import type { Progress } from './progress';

const base = (): Progress => ({ words: {}, courses: {}, challenges: {}, tasks: {}, xp: 0, streak: 0, lastDay: '' });

describe('mastery', () => {
  const course = COURSES[0];

  it('starts at zero with Learn as the next step', () => {
    const s = courseStats(course, base());
    expect(s.mastery).toBe(0);
    expect(s.nextStep).toBe('learn');
    expect(s.level.la).toBe('Tīrō');
    expect(s.complete).toBe(false);
  });

  it('weights word strength 60% and best quiz 40%', () => {
    const p = base();
    for (const v of course.vocab) p.words[v.id] = 5;
    p.courses[course.id] = { steps: {}, bestQuiz: 50, quizzes: 1 };
    expect(courseStats(course, p).mastery).toBe(80);
  });

  it('tracks steps completed in any order', () => {
    const p = base();
    p.courses[course.id] = { steps: { quiz: true, learn: true }, bestQuiz: 90, quizzes: 1 };
    const s = courseStats(course, p);
    expect(s.stepsDone).toBe(2);
    expect(s.stepDone.quiz).toBe(true);
    expect(s.nextStep).toBe('flashcards');
  });

  it('maps mastery to Latin levels', () => {
    expect(levelFor(0).la).toBe('Tīrō');
    expect(levelFor(25).la).toBe('Discipulus');
    expect(levelFor(79).la).toBe('Perītus');
    expect(levelFor(100).la).toBe('Magister');
  });

  it('suggests continuing the last course, then the first unfinished one', () => {
    const p = base();
    p.last = { course: 'family', step: 'match' };
    expect(suggestNext(p)).toMatchObject({ course: { id: 'family' }, step: 'learn' });

    const done = { learn: true, flashcards: true, match: true, speak: true, challenges: true, quiz: true } as const;
    p.courses.family = { steps: { ...done }, bestQuiz: 100, quizzes: 1 };
    expect(suggestNext(p)).toMatchObject({ course: { id: 'colours' }, step: 'learn' });
  });
});
