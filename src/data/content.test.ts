import { describe, expect, it } from 'vitest';
import { challengesOf, headOf } from './courses';
import { courses as la } from './courses/la';
import { courses as de } from './courses/de';
import { courses as es } from './courses/es';
import { courses as fr } from './courses/fr';
import { courses as zh } from './courses/zh';
import { courses as ar } from './courses/ar';
import { courses as ja } from './courses/ja';
import { courses as ru } from './courses/ru';
import { courses as vi } from './courses/vi';
import { ref as laRef } from './ref/la';
import { ref as deRef } from './ref/de';
import { ref as esRef } from './ref/es';
import { ref as frRef } from './ref/fr';
import { ref as zhRef } from './ref/zh';
import { ref as arRef } from './ref/ar';
import { ref as jaRef } from './ref/ja';
import { ref as ruRef } from './ref/ru';
import { ref as viRef } from './ref/vi';
import { ADJECTIVES, LEXICON, NOUNS, VERBS } from './reference';
import { audioId, audioKey } from '../lib/audio-key';
import { toPhonemes } from '../lib/latin';
import audioLa from './audio-index.json';
import audioDe from './audio-de.json';
import audioEs from './audio-es.json';
import audioFr from './audio-fr.json';
import audioZh from './audio-zh.json';
import audioAr from './audio-ar.json';
import audioJa from './audio-ja.json';
import audioRu from './audio-ru.json';
import audioVi from './audio-vi.json';
import { speakablePhrases, speakableWords } from './speakable';
import type { Course, LangRef } from './types';

const LANGS: [string, Course[], LangRef, { ids: string[] }][] = [
  ['la', la, laRef, audioLa],
  ['de', de, deRef, audioDe],
  ['es', es, esRef, audioEs],
  ['fr', fr, frRef, audioFr],
  ['zh', zh, zhRef, audioZh],
  ['ar', ar, arRef, audioAr],
  ['ja', ja, jaRef, audioJa],
  ['ru', ru, ruRef, audioRu],
  ['vi', vi, viRef, audioVi],
];
const ALL = LANGS.flatMap(([lang, courses]) => courses.map((c) => [`${lang}/${c.id}`, c] as const));

describe.each(LANGS)('%s courses', (_lang, COURSES) => {
  it('has eleven courses numbered in order, with the same ids as Latin', () => {
    expect(COURSES.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(COURSES.map((c) => c.id)).toEqual(la.map((c) => c.id));
  });

  it('uses unique vocab, challenge and task ids', () => {
    const ids = COURSES.flatMap((c) => c.vocab.map((v) => v.id));
    expect(new Set(ids).size).toBe(ids.length);
    const chs = COURSES.flatMap((c) => challengesOf(c).map((ch) => ch.id));
    expect(new Set(chs).size).toBe(chs.length);
    const tasks = COURSES.flatMap((c) => c.tasks.map((t) => t.id));
    expect(new Set(tasks).size).toBe(tasks.length);
  });
});

describe('course content', () => {
  it.each(ALL)('%s is complete and consistent', (_id, c) => {
    expect(c.vocab.length).toBeGreaterThanOrEqual(12);
    expect(c.quiz.length).toBeGreaterThanOrEqual(5);
    expect(c.sounds.length).toBeGreaterThan(0);
    expect(c.ideas.length).toBeGreaterThan(0);

    // Drill answers and match labels must be unambiguous within a course.
    const heads = c.vocab.map(headOf);
    expect(new Set(heads).size).toBe(heads.length);
    const labels = c.vocab.map((v) => v.match ?? v.en);
    expect(new Set(labels).size).toBe(labels.length);

    for (const q of c.quiz) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
    }
    for (const idea of c.ideas) {
      for (const row of idea.table?.rows ?? []) expect(row).toHaveLength(idea.table!.head.length);
    }
  });
});

describe('challenges and tasks', () => {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = (s: string) => fold(s).replace(/[.,!?;:—…¿¡«»]/g, ' ').split(/\s+/).filter(Boolean);

  it.each(ALL)('%s has valid challenges', (_id, course) => {
    expect(course.challenges.length).toBeGreaterThanOrEqual(2);
    expect(course.tasks.length).toBeGreaterThanOrEqual(2);

    for (const ch of course.challenges) {
      switch (ch.type) {
        case 'gapfill':
          for (const it of ch.items) {
            expect(it.la.split('___')).toHaveLength(2);
            expect(it.options.length).toBeGreaterThanOrEqual(3);
            expect(new Set(it.options).size).toBe(it.options.length);
          }
          break;
        case 'builder':
          for (const it of ch.items) {
            const tiles = [...words(it.answers[0]), ...it.extra.map(fold)];
            // Decoys must differ from the real words, or the puzzle becomes ambiguous.
            for (const e of it.extra) expect(words(it.answers[0])).not.toContain(fold(e));
            // Every accepted answer must be buildable from the tiles on offer.
            for (const a of it.answers) {
              const pool = [...tiles];
              for (const w of words(a)) {
                const k = pool.indexOf(w);
                expect(k, `"${w}" in "${a}"`).toBeGreaterThanOrEqual(0);
                pool.splice(k, 1);
              }
            }
          }
          break;
        case 'dialogue':
          for (const turn of ch.turns) {
            expect(turn.options.length).toBeGreaterThanOrEqual(2);
            expect(new Set(turn.options.map((o) => o.la)).size).toBe(turn.options.length);
            for (const wrong of turn.options.slice(1)) expect(wrong.fb).toBeTruthy();
          }
          break;
        case 'spot': {
          const ids = new Set(ch.places.map((p) => p.id));
          const cells = ch.places.map((p) => `${p.row}:${p.col}`);
          expect(new Set(cells).size).toBe(cells.length);
          for (const pr of ch.prompts) expect(ids.has(pr.target)).toBe(true);
          break;
        }
        case 'paint': {
          const swatches = new Set(course.vocab.filter((v) => v.swatch).map((v) => v.id));
          for (const pr of ch.prompts) expect(swatches.has(pr.color)).toBe(true);
          const regions = ch.prompts.map((pr) => pr.region);
          expect(new Set(regions).size).toBe(regions.length);
          break;
        }
      }
    }
  });
});

describe('reference content', () => {
  it('has a substantial lexicon with no duplicate entries', () => {
    expect(LEXICON.length).toBeGreaterThan(150);
    const keys = LEXICON.map(([la, en]) => `${la}|${en}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has six cases for every noun and adjective paradigm', () => {
    for (const n of NOUNS) {
      expect(n.sg).toHaveLength(6);
      expect(n.pl).toHaveLength(6);
    }
    for (const a of ADJECTIVES) {
      expect(a.sg).toHaveLength(6);
      expect(a.pl).toHaveLength(6);
      for (const row of [...a.sg, ...a.pl]) expect(row).toHaveLength(3);
    }
  });

  it('has six persons for every tense of every verb', () => {
    for (const v of VERBS) for (const forms of Object.values(v.forms)) expect(forms).toHaveLength(6);
  });
});

const FILES = new Set(Object.keys(import.meta.glob('/public/audio/**/*.mp3')));

describe.each(LANGS)('%s voice recordings', (lang, courses, ref, index) => {
  const phrases = speakablePhrases(courses, ref, lang === 'la');
  const recorded = new Set(index.ids);
  const dir = lang === 'la' ? '/public/audio/' : `/public/audio/${lang}/`;

  it('has a clip for every phrase and word the app can say (run `npm run audio` if this fails)', () => {
    const missing = [...phrases, ...speakableWords(phrases)].filter((t) => !recorded.has(audioId(audioKey(t))));
    expect(missing).toEqual([]);
  });

  it('has the female and male clip files on disk', () => {
    const lost = index.ids.filter((id) => !FILES.has(`${dir}${id}.mp3`) || !FILES.has(`${dir}m/${id}.mp3`));
    expect(lost).toEqual([]);
  });

  it.runIf(lang === 'la')('only uses sounds the Italian-trained voice knows', () => {
    const known = new Set(Array.from('abdefijklmnoprstuwŋɔɛɡɾʊˈː ,.!?;:'));
    const odd = phrases.filter((p) => Array.from(toPhonemes(p)).some((ch) => !known.has(ch)));
    expect(odd).toEqual([]);
  });
});

describe('number words', () => {
  it.each([
    [deRef, 21, 'einundzwanzig'],
    [deRef, 2026, 'zweitausendsechsundzwanzig'],
    [deRef, 101, 'einhunderteins'],
    [esRef, 21, 'veintiuno'],
    [esRef, 100, 'cien'],
    [esRef, 115, 'ciento quince'],
    [esRef, 2026, 'dos mil veintiséis'],
    [frRef, 71, 'soixante et onze'],
    [frRef, 80, 'quatre-vingts'],
    [frRef, 99, 'quatre-vingt-dix-neuf'],
    [frRef, 200, 'deux cents'],
    [frRef, 2026, 'deux mille vingt-six'],
    [zhRef, 2026, '两千零二十六'],
    [zhRef, 115, '一百一十五'],
    [zhRef, 15, '十五'],
    [jaRef, 2026, '二千二十六'],
    [ruRef, 2026, 'две тысячи двадцать шесть'],
    [arRef, 21, 'وَاحِد وَعِشْرُون'],
    [viRef, 15, 'mười lăm'],
    [viRef, 21, 'hai mươi mốt'],
    [viRef, 105, 'một trăm lẻ năm'],
    [viRef, 2026, 'hai nghìn không trăm hai mươi sáu'],
  ])('%#: %i → %s', (ref, n, words) => {
    expect(ref.numberWords(n)).toBe(words);
  });
});
