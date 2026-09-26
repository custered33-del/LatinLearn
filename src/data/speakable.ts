/**
 * Every piece of Latin the app can read aloud. `npm run audio` records a clip
 * for each one (plus each single word, so unrecorded phrases can be pieced
 * together), and a content test checks nothing is missing.
 */
import { audioKey } from '../lib/audio-key';
import { headword } from '../lib/latin';
import { toLatinWords } from '../lib/numerals';
import { COURSES, headOf } from './courses';
import { LAB_SAMPLES, LEXICON, STRESS_RULES } from './reference';

export function speakablePhrases(): string[] {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s && audioKey(s)) out.add(s.trim());
  };

  for (const c of COURSES) {
    for (const v of c.vocab) {
      add(headOf(v));
      add(v.ex?.[0]);
    }
    for (const s of c.sounds) s.words.forEach(add);
    for (const ch of c.challenges) {
      switch (ch.type) {
        case 'gapfill':
          for (const it of ch.items) add(it.la.replace('___', it.options[0]));
          break;
        case 'builder':
          for (const it of ch.items) add(it.answers[0]);
          break;
        case 'dialogue':
          for (const t of ch.turns) {
            add(t.say);
            add(t.options[0].la);
          }
          add(ch.outro[0]);
          break;
        case 'spot':
        case 'paint':
          for (const p of ch.prompts) add(p.la);
          break;
      }
    }
  }

  for (const [la] of LEXICON) add(headword(la));
  for (const r of STRESS_RULES) r.examples.forEach(add);
  LAB_SAMPLES.forEach(add);

  // The number converter pieces any number together from these.
  for (let n = 1; n <= 99; n++) add(toLatinWords(n));
  for (let n = 100; n <= 3000; n += 100) if (n <= 900 || n % 1000 === 0) add(toLatinWords(n));

  return [...out];
}

/** Every distinct word in the phrases, each recorded on its own. */
export function speakableWords(phrases: string[]): string[] {
  const out = new Set<string>();
  for (const p of phrases) {
    for (const w of audioKey(p).replace(/\?$/, '').split(' ')) if (w) out.add(w);
  }
  return [...out];
}
