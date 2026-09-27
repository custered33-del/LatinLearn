import type { LangRef } from '../types';

const ONES = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const THOUSANDS = ['', 'тысяча', 'две тысячи', 'три тысячи', 'четыре тысячи', 'пять тысяч', 'шесть тысяч', 'семь тысяч', 'восемь тысяч', 'девять тысяч'];

function below100(n: number): string {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const o = n % 10;
  return o ? `${TENS[Math.floor(n / 10)]} ${ONES[o]}` : TENS[n / 10];
}

function words(n: number): string {
  if (n < 1 || n > 9999) return '';
  const out = [THOUSANDS[Math.floor(n / 1000)], HUNDREDS[Math.floor((n % 1000) / 100)], n % 100 ? below100(n % 100) : ''];
  return out.filter(Boolean).join(' ');
}

const PERSONS = ['я', 'ты', 'он / она', 'мы', 'вы', 'они'];
const WILL = ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'];

function verb(id: string, inf: string, meaning: string, present: string[]) {
  const stem = inf.slice(0, -2);
  const past = [`${stem}л(а)`, `${stem}л(а)`, `${stem}л / ${stem}ла`, `${stem}ли`, `${stem}ли`, `${stem}ли`];
  return { id, inf, meaning, forms: { present, past, future: WILL.map((w) => `${w} ${inf}`) } };
}

export const ref: LangRef = {
  numberWords: words,
  numberSpeech: words,
  persons: PERSONS,
  tenses: [
    { id: 'present', label: 'Настоящее (now)' },
    { id: 'past', label: 'Прошедшее (past)' },
    { id: 'future', label: 'Будущее (will)' },
  ],
  verbs: [
    verb('chitat', 'читать', 'to read', ['читаю', 'читаешь', 'читает', 'читаем', 'читаете', 'читают']),
    verb('govorit', 'говорить', 'to speak', ['говорю', 'говоришь', 'говорит', 'говорим', 'говорите', 'говорят']),
    verb('lyubit', 'любить', 'to love, to like', ['люблю', 'любишь', 'любит', 'любим', 'любите', 'любят']),
    verb('zhit', 'жить', 'to live', ['живу', 'живёшь', 'живёт', 'живём', 'живёте', 'живут']),
    verb('khotet', 'хотеть', 'to want', ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят']),
    verb('delat', 'делать', 'to do, to make', ['делаю', 'делаешь', 'делает', 'делаем', 'делаете', 'делают']),
  ],
};
