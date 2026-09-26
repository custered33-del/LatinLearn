import type { LangRef } from '../types';

const ONES = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

function below100(n: number): string {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const o = n % 10;
  return o ? `${o === 1 ? 'ein' : ONES[o]}und${TENS[Math.floor(n / 10)]}` : TENS[n / 10];
}

/** German writes numbers as one word; the voice reads them in chunks. */
function parts(n: number): string[] {
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const out: string[] = [];
  if (th) out.push(`${th === 1 ? 'ein' : ONES[th]}tausend`);
  if (h) out.push(`${h === 1 ? 'ein' : ONES[h]}hundert`);
  if (r) out.push(below100(r));
  return out;
}

const WILL = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'];
const HABEN = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
const SEIN = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];

function verb(id: string, inf: string, meaning: string, present: string[], aux: string[], participle: string) {
  return {
    id,
    inf,
    meaning,
    forms: { present, perfect: aux.map((a) => `${a} ${participle}`), future: WILL.map((w) => `${w} ${inf}`) },
  };
}

export const ref: LangRef = {
  numberWords: (n) => (n >= 1 && n <= 9999 ? parts(n).join('') : ''),
  numberSpeech: (n) => (n >= 1 && n <= 9999 ? parts(n).join(' ') : ''),
  persons: ['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie / Sie'],
  tenses: [
    { id: 'present', label: 'Präsens (now)' },
    { id: 'perfect', label: 'Perfekt (past)' },
    { id: 'future', label: 'Futur (will)' },
  ],
  verbs: [
    verb('sein', 'sein', 'to be', SEIN, SEIN, 'gewesen'),
    verb('haben', 'haben', 'to have', HABEN, HABEN, 'gehabt'),
    verb('spielen', 'spielen', 'to play', ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'], HABEN, 'gespielt'),
    verb('gehen', 'gehen', 'to go', ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'], SEIN, 'gegangen'),
    verb('essen', 'essen', 'to eat', ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'], HABEN, 'gegessen'),
    verb('sprechen', 'sprechen', 'to speak', ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'], HABEN, 'gesprochen'),
  ],
};
