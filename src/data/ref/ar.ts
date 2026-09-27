import type { LangRef } from '../types';

const ONES = ['', 'وَاحِد', 'اِثْنَان', 'ثَلَاثَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة', 'ثَمَانِيَة', 'تِسْعَة'];
const TEENS = ['عَشَرَة', 'أَحَدَ عَشَرَ', 'اِثْنَا عَشَرَ', 'ثَلَاثَةَ عَشَرَ', 'أَرْبَعَةَ عَشَرَ', 'خَمْسَةَ عَشَرَ', 'سِتَّةَ عَشَرَ', 'سَبْعَةَ عَشَرَ', 'ثَمَانِيَةَ عَشَرَ', 'تِسْعَةَ عَشَرَ'];
const TENS = ['', '', 'عِشْرُون', 'ثَلَاثُون', 'أَرْبَعُون', 'خَمْسُون', 'سِتُّون', 'سَبْعُون', 'ثَمَانُون', 'تِسْعُون'];
const HUNDREDS = ['', 'مِئَة', 'مِئَتَان', 'ثَلَاثُمِئَة', 'أَرْبَعُمِئَة', 'خَمْسُمِئَة', 'سِتُّمِئَة', 'سَبْعُمِئَة', 'ثَمَانِمِئَة', 'تِسْعُمِئَة'];
const THOUSANDS = ['', 'أَلْف', 'أَلْفَان', 'ثَلَاثَةُ آلَاف', 'أَرْبَعَةُ آلَاف', 'خَمْسَةُ آلَاف', 'سِتَّةُ آلَاف', 'سَبْعَةُ آلَاف', 'ثَمَانِيَةُ آلَاف', 'تِسْعَةُ آلَاف'];

/** Arabic says the units before the tens: 21 = “one and twenty”. */
function below100(n: number): string {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const o = n % 10;
  return o ? `${ONES[o]} وَ${TENS[Math.floor(n / 10)]}` : TENS[n / 10];
}

function parts(n: number): string[] {
  return [THOUSANDS[Math.floor(n / 1000)], HUNDREDS[Math.floor((n % 1000) / 100)], n % 100 ? below100(n % 100) : ''].filter(Boolean);
}

const valid = (n: number) => n >= 1 && n <= 9999;

/** Past: كَتَبْتُ …; present: أَكْتُبُ …; future: سَ + present. */
function verb(id: string, inf: string, meaning: string, past: string, present: string) {
  const now = [`أَ${present}ُ`, `تَ${present}ُ`, `يَ${present}ُ`, `نَ${present}ُ`, `تَ${present}ُونَ`, `يَ${present}ُونَ`];
  return {
    id,
    inf,
    meaning,
    forms: {
      past: [`${past}ْتُ`, `${past}ْتَ`, `${past}َ`, `${past}ْنَا`, `${past}ْتُمْ`, `${past}ُوا`],
      present: now,
      future: now.map((f) => `سَ${f}`),
    },
  };
}

export const ref: LangRef = {
  numberWords: (n) => (valid(n) ? parts(n).join(' وَ') : ''),
  // Spoken in recorded chunks with a separate “and”.
  numberSpeech: (n) => (valid(n) ? parts(n).join(' وَ ') : ''),
  persons: ['أَنَا (I)', 'أَنْتَ (you)', 'هُوَ (he)', 'نَحْنُ (we)', 'أَنْتُمْ (you all)', 'هُمْ (they)'],
  tenses: [
    { id: 'past', label: 'Past' },
    { id: 'present', label: 'Present' },
    { id: 'future', label: 'Future: add سَ' },
  ],
  verbs: [
    verb('kataba', 'كَتَبَ', 'to write', 'كَتَب', 'كْتُب'),
    verb('darasa', 'دَرَسَ', 'to study', 'دَرَس', 'دْرُس'),
    verb('dhahaba', 'ذَهَبَ', 'to go', 'ذَهَب', 'ذْهَب'),
    verb('shariba', 'شَرِبَ', 'to drink', 'شَرِب', 'شْرَب'),
    verb('fataha', 'فَتَحَ', 'to open', 'فَتَح', 'فْتَح'),
    verb('laiba', 'لَعِبَ', 'to play', 'لَعِب', 'لْعَب'),
  ],
};
