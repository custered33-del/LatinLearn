/**
 * Which language app this is: LatinLearn, GermanLearn, SpanishLearn or
 * FrenchLearn. The choice is stored on the device (or forced with ?lang=de,
 * which installed home-screen apps use) and applied before the first render.
 */
export type LangId = 'la' | 'de' | 'es' | 'fr';

export interface LangInfo {
  id: LangId;
  app: string;
  /** English name of the language. */
  language: string;
  native: string;
  flag: string;
  /** Speech recognition / browser voice language. */
  speech: string;
  /** Brand mark and app icon background (CSS). */
  brandBg: string;
  /** Accent colours [light theme, dark theme] and a second accent for gradients. */
  accent: [string, string];
  accent2: string;
  /** Home page: "Speak the language of <place>". */
  place: string;
  lede: string;
  floaters: [string, string, string, string];
  wordOfDay: string;
  hello: string;
  praise: string[];
  levels: [string, string, string, string];
  /** Shown under the speaker on Settings. */
  voiceNote: string;
  sample: [string, string, string];
}

export const LANGS: Record<LangId, LangInfo> = {
  la: {
    id: 'la',
    place: 'Rome',
    app: 'LatinLearn',
    language: 'Latin',
    native: 'Latīna',
    flag: '🏛️',
    speech: 'it-IT',
    brandBg: 'linear-gradient(135deg, #7c4dff, #ff4f79)',
    accent: ['#6a3cf0', '#9b7bff'],
    accent2: '#9b6bff',
    lede: 'Eleven short courses, from colours to arguing like Cicero. Real Latin, classical pronunciation, and games that make it stick.',
    floaters: ['Salvē!', 'XII', 'Quis?', 'caeruleus'],
    wordOfDay: 'Verbum diēī',
    hello: 'Salvē!',
    praise: ['Optimē!', 'Bene!', 'Euge!', 'Rēctē!'],
    levels: ['Tīrō', 'Discipulus', 'Perītus', 'Magister'],
    voiceNote: 'in restored classical pronunciation',
    sample: ['Salvē! Quid agis?', 'ūnus, duo, trēs', 'vēnī, vīdī, vīcī'],
  },
  de: {
    id: 'de',
    place: 'Germany',
    app: 'GermanLearn',
    language: 'German',
    native: 'Deutsch',
    flag: '🇩🇪',
    speech: 'de-DE',
    brandBg: 'linear-gradient(180deg, #1a1a1a 0 33.4%, #dd0000 33.4% 66.7%, #ffce00 66.7%)',
    accent: ['#c40000', '#ff5c5c'],
    accent2: '#ffce00',
    lede: 'Eleven short courses, from colours to having an argument. Real German, native voices, and games that make it stick.',
    floaters: ['Hallo!', '12', 'Wer?', 'blau'],
    wordOfDay: 'Wort des Tages',
    hello: 'Hallo!',
    praise: ['Super!', 'Sehr gut!', 'Toll!', 'Richtig!'],
    levels: ['Anfänger', 'Lernender', 'Könner', 'Meister'],
    voiceNote: 'in standard German',
    sample: ['Hallo! Wie geht’s?', 'eins, zwei, drei', 'Ich spreche Deutsch.'],
  },
  es: {
    id: 'es',
    place: 'Spain',
    app: 'SpanishLearn',
    language: 'Spanish',
    native: 'Español',
    flag: '🇪🇸',
    speech: 'es-ES',
    brandBg: 'linear-gradient(180deg, #c60b1e 0 25%, #ffc400 25% 75%, #c60b1e 75%)',
    accent: ['#c60b1e', '#ff6b78'],
    accent2: '#ffc400',
    lede: 'Eleven short courses, from colours to having an argument. Real Spanish, native voices, and games that make it stick.',
    floaters: ['¡Hola!', '12', '¿Quién?', 'azul'],
    wordOfDay: 'Palabra del día',
    hello: '¡Hola!',
    praise: ['¡Genial!', '¡Muy bien!', '¡Perfecto!', '¡Correcto!'],
    levels: ['Principiante', 'Aprendiz', 'Experto', 'Maestro'],
    voiceNote: 'in Castilian Spanish',
    sample: ['¡Hola! ¿Qué tal?', 'uno, dos, tres', 'Hablo español.'],
  },
  fr: {
    id: 'fr',
    place: 'France',
    app: 'FrenchLearn',
    language: 'French',
    native: 'Français',
    flag: '🇫🇷',
    speech: 'fr-FR',
    brandBg: 'linear-gradient(90deg, #0055a4 0 33.4%, #ffffff 33.4% 66.7%, #ef4135 66.7%)',
    accent: ['#0055a4', '#6ea8ff'],
    accent2: '#ef4135',
    lede: 'Eleven short courses, from colours to having an argument. Real French, native voices, and games that make it stick.',
    floaters: ['Salut !', '12', 'Qui ?', 'bleu'],
    wordOfDay: 'Mot du jour',
    hello: 'Bonjour !',
    praise: ['Super !', 'Très bien !', 'Bravo !', 'Exact !'],
    levels: ['Débutant', 'Apprenti', 'Expert', 'Maître'],
    voiceNote: 'in standard French',
    sample: ['Bonjour ! Ça va ?', 'un, deux, trois', 'Je parle français.'],
  },
};

const KEY = 'latinlearn:lang';
const isLang = (x: unknown): x is LangId => x === 'la' || x === 'de' || x === 'es' || x === 'fr';

function initial(): LangId {
  if (typeof location === 'undefined') return 'la';
  const forced = new URLSearchParams(location.search).get('lang');
  try {
    if (isLang(forced)) {
      localStorage.setItem(KEY, forced);
      return forced;
    }
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    if (isLang(forced)) return forced;
  }
  return 'la';
}

export const LANG_ID: LangId = initial();
export const LANG = LANGS[LANG_ID];
/** Value for lang="" attributes on text in the language being learnt. */
export const L = LANG_ID;

/** Storage key for data that belongs to one language app. */
export const langKey = (base: string, id: LangId = LANG_ID): string => (id === 'la' ? base : `${base}:${id}`);

export function switchLanguage(id: LangId): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* session only */
  }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  url.hash = '#/';
  location.replace(url.toString());
  if (url.toString() === location.href) location.reload();
}

/** The icon's letter: G, S or F next to a bar, like LatinLearn's "L|" (shapes on a 64-unit grid). */
export const ICON_LETTER: Record<LangId, string> = {
  la: 'M18 46V18h7v22h14v6z',
  de: 'M39 18H18v28h21V30H29v6h3v4h-7V24h14z',
  es: 'M39 18H18v17h14v5H18v6h21V29H25v-5h14z',
  fr: 'M18 46V18h20v6H25v5h11v6H25v11z',
};
export const ICON_BAR = 'M42 18h6v28h-6z';

/** Flag-coloured SVG icon for the browser tab: flag background, white letter and bar with a soft dark outline. */
export function iconSvg(id: LangId): string {
  const stripes: Record<LangId, string> = {
    la: '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c4dff"/><stop offset="1" stop-color="#ff4f79"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/>',
    de: '<rect width="64" height="22" fill="#1a1a1a"/><rect y="21" width="64" height="22" fill="#dd0000"/><rect y="42" width="64" height="22" fill="#ffce00"/>',
    es: '<rect width="64" height="64" fill="#c60b1e"/><rect y="16" width="64" height="32" fill="#ffc400"/>',
    fr: '<rect width="22" height="64" fill="#0055a4"/><rect x="21" width="22" height="64" fill="#fff"/><rect x="42" width="22" height="64" fill="#ef4135"/>',
  };
  const outline = 'stroke="rgba(0,0,0,.55)" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><clipPath id="c"><rect width="64" height="64" rx="16"/></clipPath><g clip-path="url(#c)">${stripes[id]}</g><path d="${ICON_LETTER[id]}" fill="#fff" ${outline}/><path d="${ICON_BAR}" fill="#fff" fill-opacity=".8" ${outline}/></svg>`;
}

/** Apply colours, title, icons and manifest for this language (before first render). */
export function applyLanguage(): void {
  const root = document.documentElement;
  root.dataset.lang = LANG_ID;
  if (LANG_ID !== 'la') {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = root.dataset.theme === 'dark' || (root.dataset.theme !== 'light' && dark) ? 1 : 0;
    root.style.setProperty('--accent', LANG.accent[theme]);
    root.style.setProperty('--accent-2', LANG.accent2);
    root.style.setProperty('--focus', LANG.accent[theme]);
    root.style.setProperty('--accent-soft', `color-mix(in srgb, ${LANG.accent[theme]} 16%, var(--card))`);
    root.style.setProperty('--accent-ink', theme ? '#0d0c11' : '#ffffff');
    root.style.setProperty('--grad', `linear-gradient(100deg, ${LANG.accent[theme]}, ${LANG.accent2})`);
    // Page background glows in the flag's colours: [top right, left, bottom].
    const glows: Record<Exclude<LangId, 'la'>, [string, string, string]> = {
      de: ['221, 0, 0', '255, 206, 0', '221, 0, 0'],
      es: ['198, 11, 30', '255, 196, 0', '198, 11, 30'],
      fr: ['239, 65, 53', '0, 85, 164', theme ? '255, 255, 255' : '0, 85, 164'],
    };
    const [g1, g2, g3] = glows[LANG_ID];
    root.style.setProperty('--glow-1', `rgba(${g1}, ${theme ? 0.22 : 0.16})`);
    root.style.setProperty('--glow-2', `rgba(${g2}, ${theme ? 0.16 : 0.18})`);
    root.style.setProperty('--glow-3', `rgba(${g3}, ${theme ? 0.08 : 0.1})`);
  }
  root.style.setProperty('--brand-bg', LANG.brandBg);
  document.title = LANG.app;
  const set = (sel: string, attr: string, value: string) => document.querySelector(sel)?.setAttribute(attr, value);
  if (LANG_ID !== 'la') {
    set('link[rel="icon"]', 'href', `data:image/svg+xml,${encodeURIComponent(iconSvg(LANG_ID))}`);
    set('link[rel="apple-touch-icon"]', 'href', `icon-${LANG_ID}-192.png`);
    set('link[rel="manifest"]', 'href', `manifest-${LANG_ID}.webmanifest`);
  }
  set('meta[name="apple-mobile-web-app-title"]', 'content', LANG.app);
}
