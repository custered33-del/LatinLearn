import type { LangRef } from '../types';

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function below100(n: number): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 70) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o === 0 ? t : o === 1 ? `${t} et un` : `${t}-${UNITS[o]}`;
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${below100(n - 60)}`;
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${below100(n - 80)}`;
}

function words(n: number): string {
  if (n < 1 || n > 9999) return '';
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const out: string[] = [];
  if (th) out.push(th === 1 ? 'mille' : `${UNITS[th]} mille`);
  if (h) out.push(h === 1 ? 'cent' : `${UNITS[h]} cent${r ? '' : 's'}`);
  if (r) out.push(below100(r));
  return out.join(' ');
}

const FUT = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];
const future = (stem: string) => FUT.map((e) => stem + e);
const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
const withAvoir = (p: string) => AVOIR.map((a) => `${a} ${p}`);

export const ref: LangRef = {
  numberWords: words,
  numberSpeech: words,
  persons: ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'],
  tenses: [
    { id: 'present', label: 'Présent (now)' },
    { id: 'past', label: 'Passé composé (past)' },
    { id: 'future', label: 'Futur (will)' },
  ],
  verbs: [
    {
      id: 'etre',
      inf: 'être',
      meaning: 'to be',
      forms: { present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], past: withAvoir('été'), future: future('ser') },
    },
    {
      id: 'avoir',
      inf: 'avoir',
      meaning: 'to have',
      forms: { present: AVOIR, past: withAvoir('eu'), future: future('aur') },
    },
    {
      id: 'aller',
      inf: 'aller',
      meaning: 'to go',
      forms: {
        present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
        past: ['suis allé(e)', 'es allé(e)', 'est allé(e)', 'sommes allé(e)s', 'êtes allé(e)(s)', 'sont allé(e)s'],
        future: future('ir'),
      },
    },
    {
      id: 'faire',
      inf: 'faire',
      meaning: 'to do, to make',
      forms: { present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], past: withAvoir('fait'), future: future('fer') },
    },
    {
      id: 'parler',
      inf: 'parler',
      meaning: 'to speak',
      forms: { present: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'], past: withAvoir('parlé'), future: future('parler') },
    },
    {
      id: 'manger',
      inf: 'manger',
      meaning: 'to eat',
      forms: { present: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'], past: withAvoir('mangé'), future: future('manger') },
    },
  ],
};
