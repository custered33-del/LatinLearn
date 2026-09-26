import { describe, expect, it } from 'vitest';
import { COURSES } from '../data/courses';
import { QUIZ_LENGTH, buildQuiz } from './quiz';
import { seeded } from './random';

describe('buildQuiz', () => {
  it.each(COURSES.map((c) => [c.id, c] as const))('builds a valid quiz for %s', (_id, course) => {
    for (let seed = 1; seed <= 25; seed++) {
      const qs = buildQuiz(course, {}, seeded(seed), seed % 2 === 0);
      expect(qs).toHaveLength(QUIZ_LENGTH);
      expect(qs.filter((q) => q.kind === 'type')).toHaveLength(2);
      for (const q of qs) {
        if (q.kind === 'choice') {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.answer).toBeGreaterThanOrEqual(0);
        } else {
          expect(q.accept.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('prioritises weaker words', () => {
    const course = COURSES[0];
    const strengths = Object.fromEntries(course.vocab.map((v) => [v.id, 5]));
    strengths[course.vocab[3].id] = 0;
    const ids = buildQuiz(course, strengths, seeded(7)).map((q) => ('wordId' in q ? q.wordId : undefined));
    expect(ids).toContain(course.vocab[3].id);
  });

  it('never uses audio questions when audio is unavailable', () => {
    const qs = buildQuiz(COURSES[1], {}, seeded(3), false);
    expect(qs.some((q) => q.kind === 'choice' && q.mode === 'listen')).toBe(false);
  });
});
