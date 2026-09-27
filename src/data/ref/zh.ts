import type { LangRef } from '../types';

const D = '零一二三四五六七八九';

/** 1–99; `lead` means a bigger unit comes first, so 15 is 一十五 rather than 十五. */
function below100(n: number, lead: boolean): string {
  if (n < 10) return D[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${t === 1 && !lead ? '' : D[t]}十${o ? D[o] : ''}`;
}

/** Chunks: [thousands, hundreds, 零?, rest], written or spoken. */
function chunks(n: number, spoken: boolean): string[] {
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const out: string[] = [];
  if (th) out.push(`${th === 2 ? '两' : D[th]}千`);
  if (h) out.push(`${D[h]}百`);
  if (r) {
    if ((th && !h) || (h && r < 10)) out.push('零');
    out.push(below100(r, !spoken && (th > 0 || h > 0)));
  }
  return out;
}

const valid = (n: number) => n >= 1 && n <= 9999;
const PERSONS = ['我', '你', '他 / 她', '我们', '你们', '他们'];
const same = (form: string) => PERSONS.map(() => form);

function verb(id: string, inf: string, meaning: string) {
  return { id, inf, meaning, forms: { present: same(inf), past: same(`${inf}了`), future: same(`会${inf}`) } };
}

export const ref: LangRef = {
  numberWords: (n) => (valid(n) ? chunks(n, false).join('') : ''),
  // Spoken in recorded chunks, so the voice can read any number.
  numberSpeech: (n) => (valid(n) ? chunks(n, true).join(' ') : ''),
  persons: PERSONS,
  tenses: [
    { id: 'present', label: 'Now (no change!)' },
    { id: 'past', label: 'Done: add 了' },
    { id: 'future', label: 'Will: add 会' },
  ],
  verbs: [
    verb('shuo', '说', 'to speak'),
    verb('chi', '吃', 'to eat'),
    verb('he', '喝', 'to drink'),
    verb('kan', '看', 'to look, to read'),
    verb('qu', '去', 'to go'),
    verb('xue', '学', 'to learn'),
  ],
};
