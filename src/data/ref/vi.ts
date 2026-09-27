import type { LangRef } from '../types';

const ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** 1–99: 15 is mười lăm, 21 is hai mươi mốt, 24 is hai mươi tư, 25 is hai mươi lăm. */
function below100(n: number): string {
  if (n < 10) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  const head = t === 1 ? 'mười' : `${ONES[t]} mươi`;
  if (!o) return head;
  const tail = o === 5 ? 'lăm' : t > 1 && o === 1 ? 'mốt' : t > 1 && o === 4 ? 'tư' : ONES[o];
  return `${head} ${tail}`;
}

function words(n: number): string {
  if (n < 1 || n > 9999) return '';
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const out: string[] = [];
  if (th) out.push(`${ONES[th]} nghìn`);
  if (h || (th && r)) out.push(`${ONES[h]} trăm`);
  if (r) out.push(r < 10 && (h || th) ? `lẻ ${ONES[r]}` : below100(r));
  return out.join(' ');
}

const PERSONS = ['tôi', 'bạn', 'anh ấy / cô ấy', 'chúng tôi', 'các bạn', 'họ'];
const same = (form: string) => PERSONS.map(() => form);

/** Vietnamese verbs never change: đã marks the past, sẽ the future. */
function verb(id: string, inf: string, meaning: string) {
  return { id, inf, meaning, forms: { present: same(inf), past: same(`đã ${inf}`), future: same(`sẽ ${inf}`) } };
}

export const ref: LangRef = {
  numberWords: words,
  numberSpeech: words,
  persons: PERSONS,
  tenses: [
    { id: 'present', label: 'Now (no change!)' },
    { id: 'past', label: 'Past: add đã' },
    { id: 'future', label: 'Future: add sẽ' },
  ],
  verbs: [verb('an', 'ăn', 'to eat'), verb('uong', 'uống', 'to drink'), verb('di', 'đi', 'to go'), verb('noi', 'nói', 'to speak'), verb('hoc', 'học', 'to study'), verb('lam', 'làm', 'to do, to work')],
};
