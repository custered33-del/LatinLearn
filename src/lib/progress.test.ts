import { describe, expect, it } from 'vitest';
import { actions, exportProgress, getProgress, importProgress, mergeProgress, type Progress } from './progress';

describe('save files', () => {
  it('round-trips progress through a save file', () => {
    actions.reset();
    actions.answer('co-ruber', true, 10);
    actions.completeTask('co-t-labels');
    const file = exportProgress();
    actions.reset();
    expect(getProgress().xp).toBe(0);

    expect(importProgress(file)).toBeNull();
    expect(getProgress().words['co-ruber']).toBe(1);
    expect(getProgress().tasks['co-t-labels']).toBe(true);
    expect(getProgress().xp).toBe(25);
  });

  it('rejects files that are not LatinLearn saves, without touching progress', () => {
    actions.reset();
    actions.addXP(40);
    expect(importProgress('not json')).toMatch(/isn’t a LatinLearn save/);
    expect(importProgress(JSON.stringify({ app: 'Other', progress: {} }))).toMatch(/isn’t a LatinLearn save/);
    expect(importProgress(JSON.stringify({ app: 'LatinLearn', progress: { words: [], xp: 'lots' } }))).toMatch(/damaged/);
    expect(getProgress().xp).toBe(40);
  });

  it('fills in fields missing from older save files', () => {
    const old = JSON.stringify({ app: 'LatinLearn', progress: { words: {}, courses: {}, xp: 5, streak: 1, lastDay: '2026-09-01' } });
    expect(importProgress(old)).toBeNull();
    expect(getProgress().challenges).toEqual({});
    expect(getProgress().tasks).toEqual({});
  });
});

describe('mergeProgress (cloud sync)', () => {
  const base = (): Progress => ({ words: {}, courses: {}, challenges: {}, tasks: {}, xp: 0, streak: 0, lastDay: '' });

  it('keeps the best of both devices', () => {
    const pc: Progress = {
      ...base(),
      words: { a: 3, b: 1 },
      courses: { colours: { steps: { learn: true }, bestQuiz: 60, quizzes: 1, bestMatch: 30 } },
      challenges: { x: { stars: 2, best: 7, plays: 3 } },
      tasks: { t1: true },
      xp: 200,
      streak: 4,
      lastDay: '2026-09-25',
    };
    const phone: Progress = {
      ...base(),
      words: { b: 4, c: 2 },
      courses: { colours: { steps: { quiz: true }, bestQuiz: 90, quizzes: 2, bestMatch: 41 } },
      challenges: { x: { stars: 3, best: 5, plays: 1 } },
      tasks: { t2: true },
      xp: 150,
      streak: 5,
      lastDay: '2026-09-26',
    };
    const m = mergeProgress(pc, phone);
    expect(m.words).toEqual({ a: 3, b: 4, c: 2 });
    expect(m.courses.colours).toMatchObject({ steps: { learn: true, quiz: true }, bestQuiz: 90, quizzes: 2, bestMatch: 30 });
    expect(m.challenges.x).toEqual({ stars: 3, best: 7, plays: 3 });
    expect(m.tasks).toEqual({ t1: true, t2: true });
    expect(m).toMatchObject({ xp: 200, streak: 5, lastDay: '2026-09-26' });
  });

  it('is unchanged when merged with itself', () => {
    const p: Progress = { ...base(), words: { a: 2 }, xp: 10, streak: 1, lastDay: '2026-09-26' };
    expect(JSON.stringify(mergeProgress(p, p))).toBe(JSON.stringify(p));
  });
});
