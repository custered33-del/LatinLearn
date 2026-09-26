export type CourseId =
  | 'colours'
  | 'numbers'
  | 'greetings'
  | 'questions'
  | 'family'
  | 'actions'
  | 'time'
  | 'places'
  | 'arguments'
  | 'food'
  | 'body';
export type StepId = 'learn' | 'flashcards' | 'match' | 'speak' | 'challenges' | 'quiz';

export interface VocabItem {
  id: string;
  /** Full dictionary form, with macrons. */
  la: string;
  /** Form used as the answer in drills; defaults to `la`. */
  head?: string;
  en: string;
  pos: string;
  note?: string;
  /** Example sentence: [Latin, English]. */
  ex?: [string, string];
  /** CSS colour for the Colours course. */
  swatch?: string;
  /** Roman numeral for the Numbers course. */
  numeral?: string;
  /** Shorter label used in the matching game instead of `en`. */
  match?: string;
}

export interface SoundTip {
  sound: string;
  like: string;
  words: string[];
}

export interface Table {
  head: string[];
  rows: string[][];
  /** Indexes of columns whose cells are Latin. */
  la?: number[];
}

/** Body text supports **bold** and _latin_ inline markup. */
export interface KeyIdea {
  title: string;
  body: string;
  table?: Table;
}

export interface AuthoredQuestion {
  q: string;
  /** The first option is always the correct one; options are shuffled at runtime. */
  options: string[];
  /** Options are Latin (rendered in the Latin display face). */
  la?: boolean;
  why?: string;
}

// ---------------------------------------------------------------------------
// Challenges: in every list of options, the first one is correct.
// ---------------------------------------------------------------------------

/** A sentence with a "___" gap to fill from the options. */
export interface GapItem {
  la: string;
  en?: string;
  /** Big visual shown above the sentence (emoji to count, a sum in numerals…). */
  show?: string;
  showLabel?: string;
  options: string[];
  why?: string;
}

/** Arrange word tiles into a Latin sentence. */
export interface BuildItem {
  en: string;
  /** Accepted sentences; the first supplies the tiles and is shown as the model answer. */
  answers: string[];
  /** Distractor tiles. */
  extra: string[];
}

export interface DialogueTurn {
  say: string;
  en: string;
  task: string;
  options: { la: string; fb?: string }[];
}

export interface SpotPlace {
  id: string;
  name: string;
  sub: string;
  icon: string;
  row: number;
  col: number;
}

export interface SpotPrompt {
  la: string;
  en: string;
  target: string;
}

export type PaintRegion = 'sky' | 'cloud' | 'sun' | 'grass' | 'house' | 'roof' | 'door' | 'flower';

export interface PaintPrompt {
  region: PaintRegion;
  la: string;
  en: string;
  /** Vocab id of the colour word (must have a swatch). */
  color: string;
}

interface ChallengeBase {
  id: string;
  title: string;
  desc: string;
}

export type Challenge = ChallengeBase &
  (
    | { type: 'gapfill'; items: GapItem[] }
    | { type: 'builder'; items: BuildItem[] }
    | { type: 'dialogue'; partner: { name: string; icon: string }; turns: DialogueTurn[]; outro: [string, string] }
    | { type: 'spot'; layout: 'tree' | 'map'; places: SpotPlace[]; prompts: SpotPrompt[] }
    | { type: 'paint'; prompts: PaintPrompt[] }
    | { type: 'speed' }
  );

export type ChallengeType = Challenge['type'];

/** A real-world task the learner ticks off themselves. */
export interface SelfTask {
  id: string;
  text: string;
}

export interface Course {
  id: CourseId;
  n: number;
  title: string;
  la: string;
  tagline: string;
  blurb: string;
  colors: [string, string];
  sounds: SoundTip[];
  ideas: KeyIdea[];
  vocab: VocabItem[];
  quiz: AuthoredQuestion[];
  /** Authored challenges; a speed round is added automatically. */
  challenges: Challenge[];
  tasks: SelfTask[];
}
