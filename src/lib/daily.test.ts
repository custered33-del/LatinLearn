import { describe, expect, it } from 'vitest';
import { DailySession, adjustLevel, allWords, optionCount, startLevel } from './daily';
import type { Progress } from './progress';
import { seeded } from './random';

const fresh = (): Progress => ({ words: {}, courses: {}, challenges: {}, tasks: {}, xp: 0, streak: 0, lastDay: '' });

describe('daily lesson', () => {
  it('starts beginners gently and remembers the saved level', () => {
    expect(startLevel(fresh())).toBe(1);
    expect(startLevel({ ...fresh(), daily: { level: 6.5, days: {} } })).toBe(6.5);
  });

  it('settles near 80% right: up a little when right, down more when wrong', () => {
    expect(adjustLevel(5, true, 'recognise')).toBeGreaterThan(5);
    expect(adjustLevel(5, false, 'recognise')).toBeLessThan(5 - 0.3);
    expect(adjustLevel(1, false, 'type')).toBe(1);
    expect(adjustLevel(10, true, 'type')).toBe(10);
    expect(optionCount(1)).toBeLessThan(optionCount(9));
  });

  it('introduces new words in course order, then quizzes them', () => {
    const p = fresh();
    const s = new DailySession(() => p, () => false, seeded(1));
    const first = s.next();
    expect(first.kind).toBe('intro');
    expect(first.word.id).toBe(allWords()[0].id);
    p.words[first.word.id] = 1;
    const kinds = Array.from({ length: 6 }, () => {
      const it = s.next();
      if (it.kind === 'intro') p.words[it.word.id] = 1;
      return it;
    });
    expect(kinds.some((k) => k.word.id === first.word.id && k.kind !== 'intro')).toBe(true);
  });

  it('builds valid multiple-choice questions at every level', () => {
    const p = fresh();
    for (const w of allWords().slice(0, 40)) p.words[w.id] = 2;
    for (const level of [1, 5, 9]) {
      const s = new DailySession(() => ({ ...p, daily: { level, days: {} } }), () => true, seeded(level));
      for (let i = 0; i < 30; i++) {
        const it = s.next();
        if (it.kind === 'intro' || it.kind === 'type') continue;
        expect(new Set(it.options).size).toBe(it.options.length);
        expect(it.options.length).toBe(optionCount(s.level));
        expect(it.answer).toBeGreaterThanOrEqual(0);
        s.record(it, true);
      }
    }
  });

  it('gets harder for a learner who keeps getting things right', () => {
    const p = fresh();
    for (const w of allWords()) p.words[w.id] = 3;
    const s = new DailySession(() => p, () => true, seeded(7));
    const early = s.level;
    for (let i = 0; i < 40; i++) s.record(s.next(), true);
    expect(s.level).toBeGreaterThan(early + 2);
  });
});
