import { LANG } from '../lang';
import { headOf } from '../data/courses';
import type { Course, VocabItem } from '../data/types';
import { headword } from './latin';
import { shuffle, type Rng } from './random';

export type Question =
  | {
      kind: 'choice';
      /** latin-to-english, english-to-latin, listen, or authored */
      mode: 'la-en' | 'en-la' | 'listen' | 'authored';
      prompt: string;
      /** Latin shown large above the options (la-en), or spoken (listen). */
      latin?: string;
      options: string[];
      answer: number;
      optionsLatin: boolean;
      why?: string;
      wordId?: string;
    }
  | {
      kind: 'type';
      prompt: string;
      english: string;
      accept: string[];
      solution: string;
      wordId: string;
    };

export const QUIZ_LENGTH = 10;
const AUTHORED = 3;
const TYPED = 2;

/** Words that make sense as a typed answer: short, no ellipsis, not a suffix. */
const typeable = (v: VocabItem) => {
  const h = headOf(v);
  return !h.includes('…') && !h.startsWith('-') && h.split(' ').length <= 3;
};

function distractors(pool: VocabItem[], target: VocabItem, pick: (v: VocabItem) => string, rng: Rng): string[] {
  const want = pick(target);
  const seen = new Set([want]);
  const out: string[] = [];
  for (const v of shuffle(pool, rng)) {
    const label = pick(v);
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
    if (out.length === 3) break;
  }
  return out;
}

function choice(
  mode: 'la-en' | 'en-la' | 'listen',
  target: VocabItem,
  pool: VocabItem[],
  rng: Rng,
): Question {
  const toLatin = mode !== 'la-en';
  const pick = toLatin ? headOf : (v: VocabItem) => v.en;
  const options = shuffle([pick(target), ...distractors(pool, target, pick, rng)], rng);
  const prompt =
    mode === 'la-en' ? 'What does this mean?' : mode === 'listen' ? 'Listen. Which one did you hear?' : `How do you say “${target.en}”?`;
  return {
    kind: 'choice',
    mode,
    prompt,
    latin: mode === 'en-la' ? undefined : headOf(target),
    options,
    answer: options.indexOf(pick(target)),
    optionsLatin: toLatin,
    wordId: target.id,
  };
}

/**
 * Build a 10-question quiz: 3 hand-written questions, 2 typed answers and 5
 * multiple-choice vocab questions, biased towards the learner's weakest words.
 */
export function buildQuiz(course: Course, strengths: Record<string, number>, rng: Rng = Math.random, withAudio = false): Question[] {
  const byWeakness = [...course.vocab]
    .map((v) => ({ v, score: (strengths[v.id] ?? 0) + rng() * 2 }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.v);

  const words = byWeakness.slice(0, QUIZ_LENGTH - AUTHORED);
  // Languages that need another keyboard (Chinese, Japanese, Arabic, Russian) get multiple choice instead.
  const typedPicks = new Set(LANG.typing === false ? [] : words.filter(typeable).slice(0, TYPED).map((v) => v.id));

  const modes: ('la-en' | 'en-la' | 'listen')[] = shuffle(['la-en', 'en-la', withAudio ? 'listen' : 'la-en', 'en-la', 'la-en'], rng);
  let m = 0;
  const vocabQs: Question[] = words.map((v) => {
    if (typedPicks.has(v.id)) {
      const solution = headOf(v);
      return {
        kind: 'type',
        prompt: `Type the ${LANG.language} for`,
        english: v.en,
        accept: [solution, headword(v.la)],
        solution,
        wordId: v.id,
      };
    }
    return choice(modes[m++ % modes.length], v, course.vocab, rng);
  });

  const authored: Question[] = shuffle(course.quiz, rng)
    .slice(0, AUTHORED)
    .map((q) => {
      const options = shuffle(q.options, rng);
      return {
        kind: 'choice',
        mode: 'authored',
        prompt: q.q,
        options,
        answer: options.indexOf(q.options[0]),
        optionsLatin: !!q.la,
        why: q.why,
      };
    });

  return shuffle([...vocabQs, ...authored], rng);
}
