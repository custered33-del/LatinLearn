/**
 * Latin text utilities: macron folding, syllabification + classical stress,
 * learner-friendly respelling, TTS-friendly spelling and fuzzy phonetic matching.
 */

import { LANG_ID } from '../lang';

export const stripMacrons = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

/** Lower-case, macron-free form used for search and answer checking. */
export const fold = (s: string): string => stripMacrons(s).toLowerCase();

/** Normalise a typed answer: fold, drop punctuation, collapse whitespace. */
export const normalizeAnswer = (s: string): string =>
  fold(s)
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Dictionary headword: "ruber, rubra, rubrum" → "ruber"; "amīcus (m)" → "amīcus". */
export const headword = (la: string): string => la.split(/,|\s\(|\s\//)[0].trim();

// ---------------------------------------------------------------------------
// Syllabification and stress
// ---------------------------------------------------------------------------

type Seg = { v: true; s: string; long: boolean } | { v: false; s: string };

const VOWELS = 'aeiouyāēīōūȳ';
const LONG = 'āēīōūȳ';
const STOPS = new Set(['p', 'b', 't', 'd', 'c', 'k', 'g', 'f']);
const isVowel = (ch: string | undefined): boolean => !!ch && VOWELS.includes(ch);

/** The few words where ei / eu form one syllable (everywhere else they're two: meus, deus). */
const EI_EU_DIPHTHONG = new Set(['deinde', 'dein', 'proinde', 'proin', 'heu', 'eheu', 'neu', 'seu', 'ceu', 'hei', 'ei']);

function tokenize(word: string): Seg[] {
  const w = word.toLowerCase();
  const eiEu = EI_EU_DIPHTHONG.has(stripMacrons(w));
  const out: Seg[] = [];
  for (let i = 0; i < w.length; ) {
    const c = w[i];
    const n = w[i + 1];
    if (c === 'q' && n === 'u') {
      out.push({ v: false, s: 'kw' });
      i += 2;
    } else if (c === 'g' && n === 'u' && w[i - 1] === 'n' && isVowel(w[i + 2])) {
      out.push({ v: false, s: 'gw' });
      i += 2;
    } else if ((c === 'c' || c === 'p' || c === 't' || c === 'r') && n === 'h') {
      out.push({ v: false, s: c === 'c' ? 'k' : c });
      i += 2;
    } else if ((c === 'a' && (n === 'e' || n === 'u')) || (c === 'o' && n === 'e') || (eiEu && c === 'e' && (n === 'i' || n === 'u'))) {
      out.push({ v: true, s: c + n, long: true });
      i += 2;
    } else if (c === 'i' && isVowel(n) && (i === 0 || isVowel(w[i - 1]))) {
      // consonantal i: iam, Iūlia, eius
      out.push({ v: false, s: 'y' });
      i += 1;
    } else if (isVowel(c)) {
      out.push({ v: true, s: c, long: LONG.includes(c) });
      i += 1;
    } else if (c === 'x') {
      out.push({ v: false, s: 'k' }, { v: false, s: 's' });
      i += 1;
    } else if (/[a-z]/.test(c)) {
      out.push({ v: false, s: c });
      i += 1;
    } else {
      i += 1;
    }
  }
  return out;
}

export interface Syllable {
  onset: string[];
  nucleus: string;
  long: boolean;
  coda: string[];
  heavy: boolean;
}

export function syllabify(word: string): Syllable[] {
  const segs = tokenize(word);
  const nuclei: number[] = [];
  segs.forEach((s, i) => s.v && nuclei.push(i));
  if (!nuclei.length) return [];

  const sylls: Syllable[] = nuclei.map((ni) => {
    const seg = segs[ni] as Extract<Seg, { v: true }>;
    return { onset: [], nucleus: seg.s, long: seg.long, coda: [], heavy: false };
  });
  sylls[0].onset = segs.slice(0, nuclei[0]).map((s) => s.s);

  for (let k = 0; k < nuclei.length - 1; k++) {
    const cluster = segs.slice(nuclei[k] + 1, nuclei[k + 1]).map((s) => s.s);
    let split = 0;
    if (cluster.length > 1) {
      const a = cluster[cluster.length - 2];
      const b = cluster[cluster.length - 1];
      // stop + liquid (pr, tr, cl, fl…) stays together as the next onset
      split = STOPS.has(a) && (b === 'l' || b === 'r') ? cluster.length - 2 : cluster.length - 1;
    }
    sylls[k].coda = cluster.slice(0, split);
    sylls[k + 1].onset = cluster.slice(split);
  }
  const last = nuclei[nuclei.length - 1];
  sylls[sylls.length - 1].coda = segs.slice(last + 1).map((s) => s.s);

  for (const s of sylls) s.heavy = s.long || s.coda.length > 0;
  return sylls;
}

/** Index of the stressed syllable using the classical penultimate rule. */
export function stressIndex(sylls: Syllable[]): number {
  const n = sylls.length;
  if (n <= 2) return 0;
  return sylls[n - 2].heavy ? n - 2 : n - 3;
}

// ---------------------------------------------------------------------------
// Respelling
// ---------------------------------------------------------------------------

const CONS: Record<string, string> = { c: 'k', v: 'w', z: 'dz', h: 'h' };
const LONG_V: Record<string, string> = { ā: 'ah', ē: 'ay', ī: 'ee', ō: 'oh', ū: 'oo', ȳ: 'ee', ae: 'ai', au: 'ow', oe: 'oy', ei: 'ay', eu: 'eu' };
const SHORT_V: Record<string, string> = { a: 'a', i: 'i', o: 'o', u: 'u', y: 'i' };

const cons = (list: string[]): string => list.map((c) => CONS[c] ?? c).join('');

function respellWord(word: string): string {
  const enclitic = word.startsWith('-');
  const sylls = syllabify(enclitic ? word.slice(1) : word);
  if (!sylls.length) return word;
  const stress = enclitic ? -1 : stressIndex(sylls);
  return sylls
    .map((s, i) => {
      const closed = s.coda.length > 0;
      const vowel = s.long ? LONG_V[s.nucleus] : s.nucleus === 'e' ? (closed ? 'e' : 'eh') : SHORT_V[s.nucleus];
      const text = cons(s.onset) + vowel + cons(s.coda);
      return i === stress ? text.toUpperCase() : text;
    })
    .join('-');
}

/**
 * Learner-friendly respelling with the stressed syllable in capitals:
 * "caeruleus" → "kai-RU-leh-us", "Quid agis?" → "KWID A-gis".
 */
export function respell(text: string): string {
  return text
    .split(/\s+/)
    .map((tok) => {
      if (tok === '/') return '/';
      const clean = tok.replace(/[^A-Za-zĀĒĪŌŪȲāēīōūȳ-]/g, '');
      return clean ? respellWord(clean) : '';
    })
    .filter(Boolean)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Phonemes for the neural voice
// ---------------------------------------------------------------------------

/**
 * The voice is a Piper model trained on Italian, driven directly with phonemes
 * so it says restored classical Latin instead of guessing from the spelling.
 * Only symbols that occur in Italian training data are used, written the way
 * eSpeak writes Italian (stress mark right before the vowel, geminate stops as
 * "tː", other doubled consonants written twice).
 */
const IPA_CONS: Record<string, string> = {
  c: 'k', k: 'k', q: 'k', g: 'ɡ', v: 'w', w: 'w', y: 'j', j: 'j', h: '', z: 'dz', kw: 'kw', gw: 'ɡw',
};
const IPA_SHORT: Record<string, string> = { a: 'a', e: 'ɛ', i: 'i', o: 'ɔ', u: 'u', y: 'i' };
const IPA_LONG: Record<string, string> = {
  ā: 'aː', ē: 'eː', ī: 'iː', ō: 'oː', ū: 'uː', ȳ: 'iː', ae: 'aj', au: 'aʊ', oe: 'ɔj', ei: 'ɛj', eu: 'ɛʊ',
};
/** Little words that lean on their neighbour and carry no stress of their own. */
const CLITIC = new Set(['et', 'in', 'ad', 'ab', 'ā', 'ē', 'ex', 'dē', 'cum', 'sed', 'nec', 'per', 'sub', 'prō', 'ut']);

function wordPhonemes(word: string, alone: boolean): string {
  const bare = word.replace(/^-/, '');
  const sylls = syllabify(bare);
  if (!sylls.length) return '';
  const stress = !alone && CLITIC.has(bare.toLowerCase()) ? -1 : stressIndex(sylls);
  const ipaCons = (list: string[]) => list.map((c) => IPA_CONS[c] ?? c).join('');
  const raw = sylls
    .map((s, i) => ipaCons(s.onset) + (i === stress ? 'ˈ' : '') + (s.long ? IPA_LONG[s.nucleus] : IPA_SHORT[s.nucleus]) + ipaCons(s.coda))
    .join('');
  return raw
    .replace(/b(?=[st])/g, 'p') // urbs → urps
    .replace(/ɡ(ˈ?)n/g, 'ŋ$1n') // magnus → maŋnus
    .replace(/n(ˈ?)ɡ/g, 'ŋ$1ɡ') // lingua → liŋɡwa
    .replace(/([pbtdkɡ])(ˈ?)\1/g, '$1ː$2') // geminate stops: ecce → ɛkːɛ
    .replace(/r(ˈ?)r/g, 'r$1ɾ'); // terra → tɛrɾa
}

/**
 * Latin text → phoneme string for the voice, e.g.
 * "Salvē! Quid agis?" → "salˈweː! kwˈid ˈaɡis?"
 */
export function toPhonemes(text: string): string {
  const clean = text
    .normalize('NFC')
    .replace(/…|\.\.\./g, ',')
    .replace(/\s\/\s/g, ', ');
  const tokens = clean.match(/[A-Za-zĀĒĪŌŪȲāēīōūȳ]+(?:-[A-Za-zĀĒĪŌŪȲāēīōūȳ]+)*|-[A-Za-zāēīōūȳ]+|[.,!?;:]/g) ?? [];
  const words = tokens.filter((t) => !/^[.,!?;:]$/.test(t));
  let out = '';
  for (const t of tokens) {
    if (/^[.,!?;:]$/.test(t)) {
      if (out && !/[.,!?;:]$/.test(out)) out += t;
      continue;
    }
    const ph = wordPhonemes(t, words.length === 1);
    if (ph) out += (out ? ' ' : '') + ph;
  }
  return out.replace(/^[.,!?;:\s]+/, '');
}

// ---------------------------------------------------------------------------
// Speech helpers
// ---------------------------------------------------------------------------

/**
 * Re-spell Latin with Italian orthography so an Italian TTS voice produces an
 * approximation of restored classical pronunciation (hard c/g, v as w, ae as ai).
 */
export function toItalianSpelling(text: string): string {
  let s = fold(text)
    .replace(/…|\.\.\./g, ' ')
    .replace(/\s\/\s[^\s]+/g, '') // "nātus / nāta" → "nātus"
    .replace(/(^|\s)-/g, '$1');
  s = s.replace(/ch/g, 'c').replace(/ph/g, 'f').replace(/th/g, 't').replace(/rh/g, 'r').replace(/h/g, '');
  s = s.replace(/ae/g, 'ai').replace(/oe/g, 'oi').replace(/y/g, 'i').replace(/j/g, 'i');
  s = s.replace(/v/g, 'u');
  s = s.replace(/c(?=[ei])/g, 'ch').replace(/g(?=[ei])/g, 'gh');
  return s.replace(/\s+/g, ' ').trim();
}

/** Collapse spelling differences that don't matter when comparing speech transcripts. */
export function phoneticKey(text: string, lang: string = LANG_ID): string {
  if (lang !== 'la') {
    // Any script (Cyrillic, Arabic, kana, hanzi…): drop accents, marks and punctuation, collapse doubled letters.
    return fold(text)
      .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) // katakana → hiragana
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ß/g, 'ss')
      .replace(/đ/g, 'd')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .replace(/(.)\1+/gu, '$1');
  }
  let s = fold(text).replace(/[^a-z]/g, '');
  s = s.replace(/ae/g, 'e').replace(/oe/g, 'e');
  s = s.replace(/ph/g, 'f').replace(/th/g, 't').replace(/ch/g, 'k').replace(/h/g, '');
  s = s.replace(/qu/g, 'k').replace(/[cq]/g, 'k');
  s = s.replace(/[vw]/g, 'u').replace(/[yj]/g, 'i').replace(/x/g, 'ks').replace(/z/g, 's');
  return s.replace(/(.)\1+/g, '$1');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0–1 similarity between what was heard and the target, ignoring spelling quirks. */
export function speechSimilarity(heard: string, target: string, lang: string = LANG_ID): number {
  const a = phoneticKey(heard, lang);
  const b = phoneticKey(target, lang);
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/**
 * Check a typed answer. Returns "exact", "typo" (one slip in a longer word) or "wrong".
 */
const ARTICLE = /^(der|die|das|ein|eine|el|la|los|las|un|una|unos|unas|le|les|l|une|des|du) /;
const dropArticle = (s: string) => s.replace(ARTICLE, '');

export function checkTyped(input: string, accepted: string[]): 'exact' | 'typo' | 'wrong' {
  const got = normalizeAnswer(input);
  if (!got) return 'wrong';
  let best: 'exact' | 'typo' | 'wrong' = 'wrong';
  for (const a of accepted) {
    const want = normalizeAnswer(a);
    if (got === want) return 'exact';
    // German, Spanish and French: "Hund" is fine for "der Hund", "eau" for "l’eau".
    if (LANG_ID !== 'la' && dropArticle(got) === dropArticle(want)) return 'exact';
    if (want.length >= 5 && levenshtein(got, want) === 1) best = 'typo';
  }
  return best;
}
