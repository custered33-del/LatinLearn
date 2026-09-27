/**
 * Auxilium: a practice buddy that runs entirely in the browser. It answers
 * "what does X mean", "how do you say X", conjugates verbs, reads numbers and
 * quizzes the learner on their weakest words. Optionally, open questions go to
 * a local AI model through Ollama (https://ollama.com) on the learner's own PC.
 */
import { COURSES, headOf } from '../data/courses';
import { LEXICON, VERBS } from '../data/reference';
import { loadRef } from '../data/ref';
import type { LangRef, VocabItem } from '../data/types';
import { LANG, LANG_ID } from '../lang';
import { checkTyped, fold, headword, levenshtein } from './latin';
import { toLatinWords, toRoman } from './numerals';
import { actions, getProgress } from './progress';
import { sayGuide } from './speech';

const LATIN = LANG_ID === 'la';
const LANGUAGE = LANG.language;
/** Verb tables and number words for German, Spanish and French (Latin has its own). */
let REF: LangRef | null = null;
export const ready: Promise<unknown> = LATIN ? Promise.resolve() : loadRef(LANG_ID).then((r) => (REF = r));

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

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export interface Reply {
  /** Supports **bold** and _latin_. */
  text: string;
  /** Latin to offer with a speaker button. */
  say?: string;
  chips?: string[];
}

export interface QuizQ {
  word: VocabItem & { course: string };
  dir: 'to-latin' | 'to-english';
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
};
export const START_CHIPS = ['Quiz me', `What does ${EXAMPLES[LANG_ID][0]} mean?`, 'How do you say happy?', `Conjugate ${EXAMPLES[LANG_ID][1]}`, `Say 2026 in ${LANGUAGE}`];

const sayIt = (w: string) => {
  const g = sayGuide(w);
  return g ? ` Say it: **${g}**.` : '';
};

const describe = (w: Word): Reply => ({
  text:
    `_${w.head}_ means **${w.en}**.` +
    (w.la !== w.head ? ` Dictionary form: _${w.la}_.` : '') +
    sayIt(w.head) +
    (w.ex ? ` Example: _${w.ex[0]}_ (${w.ex[1]})` : '') +
    ` · from ${w.from}`,
  say: w.head,
});

/** Pick a word to practise: weak words from courses the learner has started come first. */
export function nextQuestion(): QuizQ {
  const p = getProgress();
  const started = COURSES.filter((c) => Object.keys(p.courses[c.id]?.steps ?? {}).length > 0);
  const pool = (started.length ? started : COURSES).flatMap((c) => c.vocab.filter((v) => v.pos !== 'suffix').map((v) => ({ ...v, course: c.title })));
  const pick = pool
    .map((v) => ({ v, k: (p.words[v.id] ?? 0) + Math.random() * 3 }))
    .sort((a, b) => a.k - b.k)[0].v;
  return { word: pick, dir: Math.random() < 0.5 ? 'to-latin' : 'to-english' };
}

export const askQuestion = (q: QuizQ): Reply =>
  q.dir === 'to-latin'
    ? { text: `How do you say **“${q.word.en}”** in ${LANGUAGE}? _(${q.word.course})_`, chips: ['Skip', 'Stop quiz'] }
    : { text: `What does _${headOf(q.word)}_ mean?`, say: headOf(q.word), chips: ['Skip', 'Stop quiz'] };

export function checkAnswer(q: QuizQ, input: string): { correct: boolean; reply: Reply } {
  const head = headOf(q.word);
  let correct: boolean;
  let typo = false;
  if (q.dir === 'to-latin') {
    const r = checkTyped(input, [head, headword(q.word.la)]);
    correct = r !== 'wrong';
    typo = r === 'typo';
  } else {
    const got = input.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
    const got2 = got.replace(/^(i am|i'm|to|a|an|the|it is|it's)\s+/, '');
    correct = meanings(q.word.en).some((m) => m === got || m === got2 || (m.length >= 5 && levenshtein(m, got2) <= 2));
  }
  actions.answer(q.word.id, correct, correct ? 5 : 0);
  const praise = LANG.praise[Math.floor(Math.random() * LANG.praise.length)];
  const text = correct
    ? `${praise} _${head}_ = **${q.word.en}**.${typo ? ` (Watch the spelling: _${head}_.)` : ''} +5 XP`
    : `Not quite: _${head}_ means **${q.word.en}**. ${sayIt(head)} I’ll ask it again later.`;
  return { correct, reply: { text, say: head } };
}

function conjugate(verb: string): Reply | null {
  if (!LATIN) {
    if (!REF) return null;
    const r = REF;
    const t = r.tenses[0];
    const v = r.verbs.find((x) => clean(x.inf) === clean(verb));
    if (!v) return null;
    const forms = v.forms[t.id];
    return {
      text: `**${v.inf}** (${v.meaning}), ${t.label.toLowerCase()}: ${forms.map((f, i) => `_${f}_ (${LANG_ID === 'fr' && i === 0 && /^[aeéèêiîouh]/i.test(f) ? 'j’' : r.persons[i]})`).join(', ')}. The Lexicon’s Verbs tab has more tenses.`,
      say: forms.join(', '),
    };
  }
  const v = VERBS.find((x) => fold(headword(x.parts)) === clean(verb) || fold(x.inf) === clean(verb));
  if (!v) return null;
  const forms = v.forms.present.map((f) => f.replace('|', ''));
  const who = ['I', 'you', 'he/she', 'we', 'you all', 'they'];
  return {
    text: `**${v.parts}** (${v.meaning}), present tense: ${forms.map((f, i) => `_${f}_ (${who[i]})`).join(', ')}. The Lexicon’s Verbs tab has every tense.`,
    say: forms.join(', '),
  };
}

const HELP: Reply = {
  text: `I’m **Auxilium** (“help”). I can **quiz you** on your weakest words, tell you **what a ${LANGUAGE} word means**, **how to say** an English word, **conjugate** a verb, or say any **number** in ${LANGUAGE}. Try one:`,
  chips: START_CHIPS,
};

/** Replies for everything Auxilium understands on its own; null means "ask the AI (or apologise)". */
export function localReply(input: string): Reply | 'quiz' | 'progress' | null {
  const low = input.trim().toLowerCase().replace(/[?!.]+$/, '').trim();
  const f = fold(low);
  if (!low) return HELP;
  if (/^(help|what can you do|commands?)\b/.test(low)) return HELP;
  if (/^(quiz|test|practi[cs]e|review|drill|ask me)/.test(low)) return 'quiz';
  if (/(my progress|weak words|how am i doing|stats)/.test(low)) return 'progress';
  if (!LATIN && (/^(hi|hello|hey|hallo|hola|bonjour|salut)\b/.test(f)))
    return { text: `_${LANG.hello}_ I’m Auxilium, your ${LANGUAGE} buddy. Tap something to practise:`, say: LANG.hello, chips: START_CHIPS };
  if (/^(hi|hello|hey|salve|ave|salvete)\b/.test(f)) return { text: '_Salvē!_ I’m Auxilium, your Latin buddy. _Quid agis?_ (How are you?) Or tap something to practise:', say: 'Salvē! Quid agis?', chips: START_CHIPS };
  if (/^(bene|optime|bene sum)\b/.test(f)) return { text: '_Optimē!_ (Great!) Shall we practise?', say: 'Optimē!', chips: ['Quiz me', 'Help'] };
  if (/^(thanks|thank you|gratias)/.test(f)) return { text: '_Libenter!_ (You’re welcome!)', say: 'Libenter!' };

  let m = low.match(/^(?:conjugate|conj)\s+(.+)$/);
  if (m) {
    const tryThese = LATIN ? '_amō_, _videō_, _dūcō_, _audiō_ or _sum_' : (REF?.verbs ?? []).slice(0, 6).map((v) => `_${v.inf}_`).join(', ');
    return conjugate(m[1]) ?? { text: `I don’t have a full table for “${m[1]}”. Try ${tryThese}.` };
  }

  m = low.match(/(\d{1,4})/);
  if (m && /(^\d+$|number|latin|roman|say|how|german|spanish|french)/.test(low)) {
    const n = Number(m[1]);
    if (!LATIN) {
      if (!REF || n < 1 || n > 9999) return { text: 'I can do numbers from 1 to 9999.' };
      return { text: `**${n}** is _${REF.numberWords(n)}_.`, say: REF.numberSpeech(n) };
    }
    const words = toLatinWords(n);
    return words ? { text: `**${n}** is _${words}_ (Roman numeral **${toRoman(n)}**).`, say: words } : { text: 'I can do numbers from 1 to 3999.' };
  }

  m = low.match(/^(?:what does|what's|whats|what is|meaning of|define|what do)\s+(.+?)(?:\s+mean)?$/);
  if (m) {
    const w = findLatin(m[1]);
    if (w) return describe(w);
    const en = findEnglish(m[1]);
    if (en.length) return describe(en[0]);
    return null;
  }

  m = low.match(/^(?:how do (?:you|i) say|how to say|how would you say|latin for|what's the latin for|what is the latin for|(?:german|spanish|french) for|what's the (?:german|spanish|french) for|translate|say)\s+(.+)$/);
  if (m) {
    const target = m[1].replace(/\s+in (latin|german|spanish|french)$/, '');
    const found = findEnglish(target);
    if (found.length) {
      const [first, ...more] = found;
      const r = describe(first);
      if (more.length) r.text += ` Also: ${more.map((w) => `_${w.head}_ (${w.en})`).join(', ')}.`;
      return r;
    }
    return null;
  }

  // A single word: try it as Latin, then as English.
  if (!/\s/.test(low)) {
    const w = findLatin(low);
    if (w) return describe(w);
    const en = findEnglish(low);
    if (en.length) return describe(en[0]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Optional local AI (Ollama)
// ---------------------------------------------------------------------------

export const AI_URL = 'http://localhost:11434';

const SYSTEM = `You are Auxilium, a friendly, encouraging ${LANGUAGE} tutor inside ${LANG.app}, an app for teenagers.
Help the learner practise ${LATIN ? 'classical Latin' : `everyday ${LANGUAGE}`}. Keep every reply short (under 100 words).
${LATIN ? 'Always write Latin with macrons for long vowels (e.g. "Salvē, amīce!").' : `Always write ${LANGUAGE} with correct accents and spelling.`}
If the learner writes ${LANGUAGE}, gently correct mistakes and explain in simple English.
End with one short practice question in ${LANGUAGE} with its English translation in brackets.
Keep everything suitable for a 13-year-old. If asked about something unrelated to ${LANGUAGE} or ${LANG.place}, bring it back to ${LANGUAGE} kindly.`;

/** Installed chat models, or null if Ollama isn't reachable from this page. */
export async function aiModels(): Promise<string[] | null> {
  try {
    const r = await fetch(`${AI_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return null;
    const data = (await r.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name).filter((n) => !/embed/i.test(n));
  } catch {
    return null;
  }
}

/** Prefer a well-known general model; avoid "uncensored" variants for a teen app. */
export const pickModel = (models: string[]): string | undefined =>
  models.find((m) => /^qwen2\.5:7b/.test(m)) ?? models.find((m) => !/abliterat|uncensor/i.test(m)) ?? models[0];

export async function aiChat(model: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const r = await fetch(`${AI_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-10)] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`AI error ${r.status}`);
  const data = (await r.json()) as { message?: { content?: string } };
  return data.message?.content?.trim() || '…';
}
