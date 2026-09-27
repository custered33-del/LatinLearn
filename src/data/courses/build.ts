/**
 * Compact course builder for the newer language apps (Chinese, Japanese,
 * Arabic, Russian). Each course is written as short tables; the quiz and two
 * challenges are built from the vocab and its example sentences:
 *
 * - "In context": fill the gap in each example sentence with the right word.
 * - "Word hunt": see the English, pick the word.
 */
import type { AuthoredQuestion, Challenge, Course, CourseId, KeyIdea, SoundTip, Table, VocabItem } from '../types';

/** [id, word, English, part of speech, example [sentence, English]?, extra fields?] */
export type V = [string, string, string, string, ([string, string] | null)?, Partial<VocabItem>?];

export interface Spec {
  id: CourseId;
  n: number;
  title: string;
  /** Course title in the language. */
  native: string;
  tagline: string;
  blurb: string;
  colors: [string, string];
  sounds: [string, string, string[]][];
  ideas: [string, string, Table?][];
  vocab: V[];
}

const pick = <T,>(list: T[], from: number, n: number, skip: T): T[] => {
  const out: T[] = [];
  for (let k = 1; out.length < n && k <= list.length; k++) {
    const x = list[(from + k * 3) % list.length];
    if (x !== skip && !out.includes(x)) out.push(x);
  }
  for (const x of list) if (out.length < n && x !== skip && !out.includes(x)) out.push(x);
  return out;
};

/** Build one course; `lang` prefixes ids so they're unique per language app. */
export function makeCourse(lang: string, s: Spec, language: string): Course {
  const vocab: VocabItem[] = s.vocab.map(([id, la, en, pos, ex, extra]) => ({
    id: `${lang}-${s.id}-${id}`,
    la,
    en,
    pos,
    ...(ex ? { ex } : {}),
    ...extra,
  }));
  const heads = vocab.map((v) => v.head ?? v.la);
  const labels = vocab.map((v) => v.match ?? v.en);

  // Quiz: alternate "what does it mean?" and "how do you say?".
  const quiz: AuthoredQuestion[] = [];
  for (let i = 0; quiz.length < 6 && i < vocab.length; i += 2) {
    if (quiz.length % 2 === 0) {
      quiz.push({ q: `What does “${heads[i]}” mean?`, options: [labels[i], ...pick(labels, i, 3, labels[i])] });
    } else {
      quiz.push({ q: `How do you say “${labels[i]}” in ${language}?`, options: [heads[i], ...pick(heads, i, 3, heads[i])], la: true });
    }
  }

  const inContext = vocab
    .map((v, i) => ({ v, i }))
    .filter(({ v, i }) => v.ex && v.ex[0].split(heads[i]).length === 2)
    .map(({ v, i }) => ({ la: v.ex![0].replace(heads[i], '___'), en: v.ex![1], options: [heads[i], ...pick(heads, i, 2, heads[i])] }));
  const hunt = vocab.map((_v, i) => ({ la: '___', show: labels[i], showLabel: `Pick the ${language} for “${labels[i]}”`, options: [heads[i], ...pick(heads, i + 1, 2, heads[i])] }));

  const challenges: Challenge[] = [
    {
      id: `${lang}-${s.id}-context`,
      title: 'In context',
      desc: 'Fill each gap in a real sentence with the right word.',
      type: 'gapfill',
      items: inContext.length >= 3 ? inContext : hunt.slice(0, 8),
    },
    { id: `${lang}-${s.id}-hunt`, title: 'Word hunt', desc: 'See the English, find the word.', type: 'gapfill', items: hunt },
  ];

  return {
    id: s.id,
    n: s.n,
    title: s.title,
    la: s.native,
    tagline: s.tagline,
    blurb: s.blurb,
    colors: s.colors,
    sounds: s.sounds.map(([sound, like, words]): SoundTip => ({ sound, like, words })),
    ideas: s.ideas.map(([title, body, table]): KeyIdea => ({ title, body, ...(table ? { table } : {}) })),
    vocab,
    quiz,
    challenges,
    tasks: [
      { id: `${lang}-${s.id}-teach`, text: `Teach someone three ${s.title.toLowerCase()} words in ${language}.` },
      { id: `${lang}-${s.id}-aloud`, text: `Say every word in this course out loud without looking at the English.` },
    ],
  };
}

/** Course colours shared by every language (same order as the Latin courses). */
export const COLORS: Record<CourseId, [string, string]> = {
  colours: ['#ff4f79', '#ffb020'],
  numbers: ['#2f80ed', '#56ccf2'],
  greetings: ['#27ae60', '#6fcf97'],
  questions: ['#9b51e0', '#bb6bd9'],
  family: ['#eb5757', '#f2994a'],
  actions: ['#f2c94c', '#f2994a'],
  time: ['#2d9cdb', '#9b51e0'],
  places: ['#219653', '#2f80ed'],
  arguments: ['#eb5757', '#9b51e0'],
  food: ['#f2994a', '#eb5757'],
  body: ['#56ccf2', '#27ae60'],
};
