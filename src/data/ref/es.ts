import type { LangRef } from '../types';

const UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TWENTIES = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 30) return TWENTIES[n - 20];
  const o = n % 10;
  return o ? `${TENS[Math.floor(n / 10)]} y ${UNITS[o]}` : TENS[n / 10];
}

function words(n: number): string {
  if (n < 1 || n > 9999) return '';
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const out: string[] = [];
  if (th) out.push(th === 1 ? 'mil' : `${UNITS[th]} mil`);
  if (h) out.push(h === 1 && !r ? 'cien' : HUNDREDS[h]);
  if (r) out.push(below100(r));
  return out.join(' ');
}

const FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
const future = (stem: string) => FUT.map((e) => stem + e);

export const ref: LangRef = {
  numberWords: words,
  numberSpeech: words,
  persons: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes'],
  tenses: [
    { id: 'present', label: 'Presente (now)' },
    { id: 'past', label: 'Pretérito (past)' },
    { id: 'future', label: 'Futuro (will)' },
  ],
  verbs: [
    {
      id: 'ser',
      inf: 'ser',
      meaning: 'to be (who / what)',
      forms: {
        present: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
        past: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
        future: future('ser'),
      },
    },
    {
      id: 'estar',
      inf: 'estar',
      meaning: 'to be (where / how)',
      forms: {
        present: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
        past: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron'],
        future: future('estar'),
      },
    },
    {
      id: 'tener',
      inf: 'tener',
      meaning: 'to have',
      forms: {
        present: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
        past: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
        future: future('tendr'),
      },
    },
    {
      id: 'ir',
      inf: 'ir',
      meaning: 'to go',
      forms: {
        present: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
        past: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
        future: future('ir'),
      },
    },
    {
      id: 'hablar',
      inf: 'hablar',
      meaning: 'to speak',
      forms: {
        present: ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'],
        past: ['hablé', 'hablaste', 'habló', 'hablamos', 'hablasteis', 'hablaron'],
        future: future('hablar'),
      },
    },
    {
      id: 'comer',
      inf: 'comer',
      meaning: 'to eat',
      forms: {
        present: ['como', 'comes', 'come', 'comemos', 'coméis', 'comen'],
        past: ['comí', 'comiste', 'comió', 'comimos', 'comisteis', 'comieron'],
        future: future('comer'),
      },
    },
    {
      id: 'vivir',
      inf: 'vivir',
      meaning: 'to live',
      forms: {
        present: ['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven'],
        past: ['viví', 'viviste', 'vivió', 'vivimos', 'vivisteis', 'vivieron'],
        future: future('vivir'),
      },
    },
  ],
};
