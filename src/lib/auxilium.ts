/**
 * Auxilium: the AI practice buddy. Chats run on a Qwen model downloaded onto the
 * device (see qwen.ts). This file holds what the AI is told: who it is, and the
 * correct course words for each question so small models don't invent vocabulary.
 */
import { COURSES, headOf } from '../data/courses';
import { LEXICON } from '../data/reference';
import { LANG, LANG_ID } from '../lang';
import { fold, headword, levenshtein } from './latin';
import { getProgress } from './progress';

const LATIN = LANG_ID === 'la';
const LANGUAGE = LANG.language;

export interface Word {
  id?: string;
  head: string;
  la: string;
  en: string;
  ex?: [string, string];
  from: string;
}

export const WORDS: Word[] = (() => {
  const out: Word[] = COURSES.flatMap((c) => c.vocab.map((v) => ({ id: v.id, head: headOf(v), la: v.la, en: v.en, ex: v.ex, from: c.title })));
  const seen = new Set(out.map((w) => fold(w.head)));
  if (LATIN) for (const [la, en, , cat] of LEXICON) {
    const head = headword(la);
    if (!seen.has(fold(head))) out.push({ head, la, en, from: `Lexicon · ${cat}` });
  }
  return out;
})();

const clean = (s: string) => fold(s).replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

export function findLatin(q: string): Word | undefined {
  const k = clean(q);
  if (!k) return undefined;
  const exact = WORDS.find((w) => clean(w.head) === k || clean(headword(w.la)) === k);
  if (exact) return exact;
  if (k.length < 4) return undefined;
  return WORDS.find((w) => levenshtein(clean(w.head), k) <= 1);
}

/** English meanings of a word, split into separate answers: "I am hungry" → ["i am hungry", "hungry"]. */
function meanings(en: string): string[] {
  const out = new Set<string>();
  for (const part of en.toLowerCase().split(/[,;/]|\bor\b|\(|\)/)) {
    const p = part.replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!p) continue;
    out.add(p);
    out.add(p.replace(/^(i am|i'm|to|a|an|the|it is|it's)\s+/, ''));
  }
  return [...out].filter((m) => m.length > 1);
}

export function findEnglish(q: string): Word[] {
  const k = q.toLowerCase().replace(/^(a|an|the|to)\s+/, '').replace(/[^a-z' ]/g, '').trim();
  if (!k) return [];
  const scored = WORDS.map((w) => {
    const ms = meanings(w.en);
    const score = ms.includes(k) ? 0 : ms.some((m) => new RegExp(`\\b${k}\\b`).test(m)) ? 1 : 9;
    return { w, score };
  }).filter((x) => x.score < 9);
  const seen = new Set<string>();
  return scored
    .sort((a, b) => a.score - b.score)
    .map((x) => x.w)
    .filter((w) => !seen.has(fold(w.head)) && !!seen.add(fold(w.head)))
    .slice(0, 3);
}

const EXAMPLES: Record<typeof LANG_ID, [string, string]> = {
  la: ['amīcus', 'amō'],
  de: ['Freund', 'sein'],
  es: ['amigo', 'hablar'],
  fr: ['ami', 'parler'],
  zh: ['朋友', '说'],
  ar: ['صَدِيق', 'كَتَبَ'],
  ja: ['ともだち', 'たべる'],
  ru: ['друг', 'говорить'],
  vi: ['bạn', 'ăn'],
};
/** Conversation starters for the AI. */
export const START_CHIPS = ['Quiz me on my words', `What does ${EXAMPLES[LANG_ID][0]} mean?`, 'How do you say happy?', `Conjugate ${EXAMPLES[LANG_ID][1]}`, 'Teach me something new'];

export const AI_SYSTEM = `You are Auxilium, a friendly, encouraging ${LANGUAGE} tutor inside ${LANG.app}, an app for teenagers.
Help the learner practise ${LATIN ? 'classical Latin' : `everyday ${LANGUAGE}`}. Keep every reply short (under 100 words).
${LATIN ? 'Always write Latin with macrons for long vowels (e.g. "Salvē, amīce!").' : `Always write ${LANGUAGE} with correct accents and spelling.`}
If the learner writes ${LANGUAGE}, gently correct mistakes and explain in simple English.
End with one short practice question in ${LANGUAGE} with its English translation in brackets.
Keep everything suitable for a 13-year-old. If asked about something unrelated to ${LANGUAGE} or ${LANG.place}, bring it back to ${LANGUAGE} kindly.`;

/**
 * Small AI models invent words, so give them the right ones: course and Lexicon
 * entries for words in the question (English or the language itself), as a note for the AI.
 */
const HINT_SKIP = new Set(
  'how do does did can could would you me i say said tell help please in the a an is are was what which who to of and or it this that mean means word words write translate with for be'.split(' '),
);
export function aiHints(question: string): string {
  const found = new Map<string, Word>();
  const words = question
    .replace(/["“”'‘’?!.,:;()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !HINT_SKIP.has(w.toLowerCase()) && w.toLowerCase() !== LANGUAGE.toLowerCase());
  for (let i = 0; i < words.length && found.size < 10; i++) {
    const two = words.slice(i, i + 2).join(' ');
    for (const w of [findLatin(words[i]), ...findEnglish(two).slice(0, 1), ...findEnglish(words[i]).slice(0, 2)]) if (w) found.set(w.head, w);
  }
  // "Quiz me": hand over words the learner is still practising.
  if (/\b(quiz|test)\b/i.test(question)) for (const w of practising()) found.set(w.head, w);
  if (!found.size) return '';
  return (
    `\nCorrect ${LANGUAGE} words from the learner's course (use these exact forms, don't invent others):\n` +
    [...found.values()].map((w) => `- ${w.la} = ${w.en}`).join('\n')
  );
}

/** Up to 8 words the learner has met but not mastered yet (weakest first). */
function practising(): Word[] {
  const p = getProgress();
  return WORDS.filter((w) => w.id && p.words[w.id] !== undefined && p.words[w.id]! < 4)
    .sort((a, b) => (p.words[a.id!] ?? 0) - (p.words[b.id!] ?? 0))
    .slice(0, 8);
}
