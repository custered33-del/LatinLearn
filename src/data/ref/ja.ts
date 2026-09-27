import type { LangRef } from '../types';

// Written with kanji numerals, spoken in kana chunks.
const K = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const ONES = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const HUNDREDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
const THOUSANDS = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];

function kanji(n: number): string {
  const unit = (d: number, u: string) => (d ? `${d === 1 && u ? '' : K[d]}${u}` : '');
  return unit(Math.floor(n / 1000), '千') + unit(Math.floor((n % 1000) / 100), '百') + unit(Math.floor((n % 100) / 10), '十') + K[n % 10];
}

function below100(n: number): string {
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${t ? `${t === 1 ? '' : ONES[t]}じゅう` : ''}${ONES[o]}`;
}

function speech(n: number): string {
  return [THOUSANDS[Math.floor(n / 1000)], HUNDREDS[Math.floor((n % 1000) / 100)], n % 100 ? below100(n % 100) : ''].filter(Boolean).join(' ');
}

const valid = (n: number) => n >= 1 && n <= 9999;
const PERSONS = ['わたし', 'あなた', 'かれ / かのじょ', 'わたしたち', 'あなたたち', 'かれら'];
const same = (form: string) => PERSONS.map(() => form);

/** Japanese verbs don't change for the person: only for polite now, past and "not". */
function verb(id: string, inf: string, meaning: string, stem: string) {
  return { id, inf, meaning, forms: { present: same(`${stem}ます`), past: same(`${stem}ました`), negative: same(`${stem}ません`) } };
}

export const ref: LangRef = {
  numberWords: (n) => (valid(n) ? kanji(n) : ''),
  numberSpeech: (n) => (valid(n) ? speech(n) : ''),
  persons: PERSONS,
  tenses: [
    { id: 'present', label: 'Polite now: -ます' },
    { id: 'past', label: 'Polite past: -ました' },
    { id: 'negative', label: 'Not: -ません' },
  ],
  verbs: [
    verb('taberu', 'たべる', 'to eat', 'たべ'),
    verb('nomu', 'のむ', 'to drink', 'のみ'),
    verb('iku', 'いく', 'to go', 'いき'),
    verb('miru', 'みる', 'to see, to watch', 'み'),
    verb('hanasu', 'はなす', 'to speak', 'はなし'),
    verb('suru', 'する', 'to do', 'し'),
  ],
};
