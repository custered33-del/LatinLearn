import { describe, expect, it } from 'vitest';
import { actions, exportProgress, getProgress, importProgress } from './progress';

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
