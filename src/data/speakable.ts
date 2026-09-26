/**
 * Every piece of Latin the app can read aloud. `npm run audio` records a clip
 * for each one (plus each single word, so unrecorded phrases can be pieced
 * together), and a content test checks nothing is missing.
 */
import { audioKey } from '../lib/audio-key';
import { headword } from '../lib/latin';
import { headOf } from './courses';
import { LAB_SAMPLES, LEXICON, STRESS_RULES } from './reference';
import type { Course, LangRef } from './types';

/** Numbers the converter pieces together: 1–99, the hundreds and the thousands. */
function numberChunks(ref: LangRef): string[] {
  const out: string[] = [];
  for (let n = 1; n <= 99; n++) out.push(ref.numberSpeech(n));
  for (let h = 1; h <= 9; h++) out.push(ref.numberSpeech(h * 100), ref.numberSpeech(h * 100 + 1), ref.numberSpeech(h * 1000));
  return out;
}

export function speakablePhrases(courses: Course[], ref: LangRef, latin = false): string[] {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s && audioKey(s)) out.add(s.trim());
  };

  for (const c of courses) {
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

  if (latin) {
    for (const [la] of LEXICON) add(headword(la));
    for (const r of STRESS_RULES) r.examples.forEach(add);
    LAB_SAMPLES.forEach(add);
  }
  numberChunks(ref).forEach(add);

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
