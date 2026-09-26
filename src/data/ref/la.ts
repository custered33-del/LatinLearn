import { headword } from '../../lib/latin';
import { toLatinWords } from '../../lib/numerals';
import { PERSONS, TENSES, VERBS } from '../reference';
import type { LangRef } from '../types';

export const ref: LangRef = {
  numberWords: toLatinWords,
  numberSpeech: toLatinWords,
  persons: PERSONS,
  tenses: TENSES,
  verbs: VERBS.map((v) => ({
    id: v.id,
    inf: headword(v.parts),
    meaning: v.meaning,
    forms: Object.fromEntries(Object.entries(v.forms).map(([t, fs]) => [t, fs.map((f) => f.replace('|', ''))])),
  })),
};
