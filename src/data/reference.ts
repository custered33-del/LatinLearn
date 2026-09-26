/**
 * Reference database: lazy-loaded with the Reference page.
 * In paradigm tables "stem|ending" marks the ending to highlight.
 */
import type { KeyIdea, Table } from './types';

// ---------------------------------------------------------------------------
// Lexicon: [latin, english, part of speech, category]
// ---------------------------------------------------------------------------

export type Lex = [la: string, en: string, pos: string, cat: string];

export const LEXICON: Lex[] = [
  // People
  ['puella, -ae (f)', 'girl', 'noun', 'People'],
  ['puer, puerī (m)', 'boy', 'noun', 'People'],
  ['fēmina, -ae (f)', 'woman', 'noun', 'People'],
  ['vir, virī (m)', 'man', 'noun', 'People'],
  ['homō, hominis (m)', 'person, human being', 'noun', 'People'],
  ['amīcus, -ī (m)', 'friend (male)', 'noun', 'People'],
  ['amīca, -ae (f)', 'friend (female)', 'noun', 'People'],
  ['magister, magistrī (m)', 'teacher (male)', 'noun', 'People'],
  ['magistra, -ae (f)', 'teacher (female)', 'noun', 'People'],
  ['discipulus, -ī (m)', 'student, pupil', 'noun', 'People'],
  ['dominus, -ī (m)', 'master, owner', 'noun', 'People'],
  ['servus, -ī (m)', 'slave, servant', 'noun', 'People'],
  ['rēx, rēgis (m)', 'king', 'noun', 'People'],
  ['rēgīna, -ae (f)', 'queen', 'noun', 'People'],
  ['imperātor, imperātōris (m)', 'emperor, general', 'noun', 'People'],
  ['mīles, mīlitis (m)', 'soldier', 'noun', 'People'],
  ['cīvis, cīvis (m/f)', 'citizen', 'noun', 'People'],
  ['nauta, -ae (m)', 'sailor', 'noun', 'People'],
  ['agricola, -ae (m)', 'farmer', 'noun', 'People'],
  ['deus, -ī (m)', 'god', 'noun', 'People'],
  ['dea, -ae (f)', 'goddess', 'noun', 'People'],
  ['īnfāns, īnfantis (m/f)', 'baby, infant', 'noun', 'People'],
  ['senex, senis (m)', 'old man', 'noun', 'People'],
  ['iuvenis, iuvenis (m)', 'young man', 'noun', 'People'],
  ['patruus, -ī (m)', 'uncle (dad’s brother)', 'noun', 'People'],
  ['mātertera, -ae (f)', 'aunt (mum’s sister)', 'noun', 'People'],
  ['marītus, -ī (m)', 'husband', 'noun', 'People'],
  ['uxor, uxōris (f)', 'wife', 'noun', 'People'],

  // Animals
  ['canis, canis (m/f)', 'dog', 'noun', 'Animals'],
  ['fēlēs, fēlis (f)', 'cat', 'noun', 'Animals'],
  ['equus, -ī (m)', 'horse', 'noun', 'Animals'],
  ['avis, avis (f)', 'bird', 'noun', 'Animals'],
  ['piscis, piscis (m)', 'fish', 'noun', 'Animals'],
  ['leō, leōnis (m)', 'lion', 'noun', 'Animals'],
  ['lupus, -ī (m)', 'wolf', 'noun', 'Animals'],
  ['corvus, -ī (m)', 'raven', 'noun', 'Animals'],
  ['mūs, mūris (m)', 'mouse', 'noun', 'Animals'],
  ['ursus, -ī (m)', 'bear', 'noun', 'Animals'],
  ['serpēns, serpentis (m/f)', 'snake', 'noun', 'Animals'],

  // Places & nature
  ['Rōma, -ae (f)', 'Rome', 'noun', 'Places & nature'],
  ['urbs, urbis (f)', 'city', 'noun', 'Places & nature'],
  ['via, -ae (f)', 'road, street, way', 'noun', 'Places & nature'],
  ['vīlla, -ae (f)', 'country house, villa', 'noun', 'Places & nature'],
  ['domus, -ūs (f)', 'house, home', 'noun', 'Places & nature'],
  ['forum, -ī (n)', 'forum, marketplace', 'noun', 'Places & nature'],
  ['templum, -ī (n)', 'temple', 'noun', 'Places & nature'],
  ['porta, -ae (f)', 'gate', 'noun', 'Places & nature'],
  ['mūrus, -ī (m)', 'wall', 'noun', 'Places & nature'],
  ['ager, agrī (m)', 'field', 'noun', 'Places & nature'],
  ['silva, -ae (f)', 'wood, forest', 'noun', 'Places & nature'],
  ['terra, -ae (f)', 'land, earth', 'noun', 'Places & nature'],
  ['mare, maris (n)', 'sea', 'noun', 'Places & nature'],
  ['īnsula, -ae (f)', 'island; apartment block', 'noun', 'Places & nature'],
  ['mōns, montis (m)', 'mountain', 'noun', 'Places & nature'],
  ['flūmen, flūminis (n)', 'river', 'noun', 'Places & nature'],
  ['nāvis, nāvis (f)', 'ship', 'noun', 'Places & nature'],
  ['caelum, -ī (n)', 'sky, heaven', 'noun', 'Places & nature'],
  ['sōl, sōlis (m)', 'sun', 'noun', 'Places & nature'],
  ['lūna, -ae (f)', 'moon', 'noun', 'Places & nature'],
  ['stella, -ae (f)', 'star', 'noun', 'Places & nature'],
  ['aqua, -ae (f)', 'water', 'noun', 'Places & nature'],
  ['ignis, ignis (m)', 'fire', 'noun', 'Places & nature'],
  ['arbor, arboris (f)', 'tree', 'noun', 'Places & nature'],
  ['flōs, flōris (m)', 'flower', 'noun', 'Places & nature'],
  ['rosa, -ae (f)', 'rose', 'noun', 'Places & nature'],
  ['herba, -ae (f)', 'grass, plant', 'noun', 'Places & nature'],
  ['nix, nivis (f)', 'snow', 'noun', 'Places & nature'],
  ['ventus, -ī (m)', 'wind', 'noun', 'Places & nature'],

  // Everyday life
  ['cibus, -ī (m)', 'food', 'noun', 'Everyday life'],
  ['pānis, pānis (m)', 'bread', 'noun', 'Everyday life'],
  ['vīnum, -ī (n)', 'wine', 'noun', 'Everyday life'],
  ['cēna, -ae (f)', 'dinner', 'noun', 'Everyday life'],
  ['mēnsa, -ae (f)', 'table', 'noun', 'Everyday life'],
  ['liber, librī (m)', 'book', 'noun', 'Everyday life'],
  ['epistula, -ae (f)', 'letter', 'noun', 'Everyday life'],
  ['tabula, -ae (f)', 'writing tablet', 'noun', 'Everyday life'],
  ['lūdus, -ī (m)', 'school; game', 'noun', 'Everyday life'],
  ['pecūnia, -ae (f)', 'money', 'noun', 'Everyday life'],
  ['dōnum, -ī (n)', 'gift, present', 'noun', 'Everyday life'],
  ['vestis, vestis (f)', 'clothing', 'noun', 'Everyday life'],
  ['toga, -ae (f)', 'toga', 'noun', 'Everyday life'],
  ['corpus, corporis (n)', 'body', 'noun', 'Everyday life'],
  ['caput, capitis (n)', 'head', 'noun', 'Everyday life'],
  ['manus, -ūs (f)', 'hand', 'noun', 'Everyday life'],
  ['digitus, -ī (m)', 'finger', 'noun', 'Everyday life'],
  ['pēs, pedis (m)', 'foot', 'noun', 'Everyday life'],
  ['nōmen, nōminis (n)', 'name', 'noun', 'Everyday life'],
  ['vōx, vōcis (f)', 'voice', 'noun', 'Everyday life'],
  ['fābula, -ae (f)', 'story; play', 'noun', 'Everyday life'],
  ['rēs, reī (f)', 'thing, matter', 'noun', 'Everyday life'],
  ['bellum, -ī (n)', 'war', 'noun', 'Everyday life'],
  ['pāx, pācis (f)', 'peace', 'noun', 'Everyday life'],

  // Time
  ['diēs, diēī (m)', 'day', 'noun', 'Time'],
  ['nox, noctis (f)', 'night', 'noun', 'Time'],
  ['hōra, -ae (f)', 'hour', 'noun', 'Time'],
  ['annus, -ī (m)', 'year', 'noun', 'Time'],
  ['mēnsis, mēnsis (m)', 'month', 'noun', 'Time'],
  ['tempus, temporis (n)', 'time', 'noun', 'Time'],
  ['hodiē', 'today', 'adverb', 'Time'],
  ['crās', 'tomorrow', 'adverb', 'Time'],
  ['heri', 'yesterday', 'adverb', 'Time'],
  ['nunc', 'now', 'adverb', 'Time'],
  ['iam', 'now, already', 'adverb', 'Time'],
  ['mox', 'soon', 'adverb', 'Time'],
  ['semper', 'always', 'adverb', 'Time'],
  ['numquam', 'never', 'adverb', 'Time'],
  ['saepe', 'often', 'adverb', 'Time'],
  ['tum', 'then', 'adverb', 'Time'],
  ['deinde', 'then, next', 'adverb', 'Time'],
  ['tandem', 'at last', 'adverb', 'Time'],

  // Verbs
  ['amō, amāre, amāvī, amātum', 'love, like', 'verb (1)', 'Verbs'],
  ['ambulō, ambulāre, ambulāvī, ambulātum', 'walk', 'verb (1)', 'Verbs'],
  ['labōrō, labōrāre, labōrāvī, labōrātum', 'work', 'verb (1)', 'Verbs'],
  ['portō, portāre, portāvī, portātum', 'carry', 'verb (1)', 'Verbs'],
  ['spectō, spectāre, spectāvī, spectātum', 'watch, look at', 'verb (1)', 'Verbs'],
  ['clāmō, clāmāre, clāmāvī, clāmātum', 'shout', 'verb (1)', 'Verbs'],
  ['habitō, habitāre, habitāvī, habitātum', 'live (in a place)', 'verb (1)', 'Verbs'],
  ['nāvigō, nāvigāre, nāvigāvī, nāvigātum', 'sail', 'verb (1)', 'Verbs'],
  ['parō, parāre, parāvī, parātum', 'prepare', 'verb (1)', 'Verbs'],
  ['laudō, laudāre, laudāvī, laudātum', 'praise', 'verb (1)', 'Verbs'],
  ['vocō, vocāre, vocāvī, vocātum', 'call', 'verb (1)', 'Verbs'],
  ['stō, stāre, stetī, statum', 'stand', 'verb (1)', 'Verbs'],
  ['dō, dare, dedī, datum', 'give', 'verb (1)', 'Verbs'],
  ['habeō, habēre, habuī, habitum', 'have, hold', 'verb (2)', 'Verbs'],
  ['videō, vidēre, vīdī, vīsum', 'see', 'verb (2)', 'Verbs'],
  ['timeō, timēre, timuī', 'fear, be afraid', 'verb (2)', 'Verbs'],
  ['teneō, tenēre, tenuī, tentum', 'hold', 'verb (2)', 'Verbs'],
  ['sedeō, sedēre, sēdī, sessum', 'sit', 'verb (2)', 'Verbs'],
  ['rīdeō, rīdēre, rīsī, rīsum', 'laugh, smile', 'verb (2)', 'Verbs'],
  ['respondeō, respondēre, respondī, respōnsum', 'reply', 'verb (2)', 'Verbs'],
  ['moneō, monēre, monuī, monitum', 'warn, advise', 'verb (2)', 'Verbs'],
  ['maneō, manēre, mānsī, mānsum', 'stay, remain', 'verb (2)', 'Verbs'],
  ['doceō, docēre, docuī, doctum', 'teach', 'verb (2)', 'Verbs'],
  ['dīcō, dīcere, dīxī, dictum', 'say', 'verb (3)', 'Verbs'],
  ['dūcō, dūcere, dūxī, ductum', 'lead', 'verb (3)', 'Verbs'],
  ['mittō, mittere, mīsī, missum', 'send', 'verb (3)', 'Verbs'],
  ['scrībō, scrībere, scrīpsī, scrīptum', 'write', 'verb (3)', 'Verbs'],
  ['legō, legere, lēgī, lēctum', 'read; choose', 'verb (3)', 'Verbs'],
  ['currō, currere, cucurrī, cursum', 'run', 'verb (3)', 'Verbs'],
  ['lūdō, lūdere, lūsī, lūsum', 'play', 'verb (3)', 'Verbs'],
  ['bibō, bibere, bibī', 'drink', 'verb (3)', 'Verbs'],
  ['discō, discere, didicī', 'learn', 'verb (3)', 'Verbs'],
  ['agō, agere, ēgī, āctum', 'do, drive', 'verb (3)', 'Verbs'],
  ['capiō, capere, cēpī, captum', 'take, capture', 'verb (3-iō)', 'Verbs'],
  ['faciō, facere, fēcī, factum', 'make, do', 'verb (3-iō)', 'Verbs'],
  ['fugiō, fugere, fūgī, fugitum', 'flee, run away', 'verb (3-iō)', 'Verbs'],
  ['audiō, audīre, audīvī, audītum', 'hear, listen', 'verb (4)', 'Verbs'],
  ['veniō, venīre, vēnī, ventum', 'come', 'verb (4)', 'Verbs'],
  ['dormiō, dormīre, dormīvī, dormītum', 'sleep', 'verb (4)', 'Verbs'],
  ['sciō, scīre, scīvī, scītum', 'know', 'verb (4)', 'Verbs'],
  ['sum, esse, fuī, futūrus', 'be', 'verb (irreg.)', 'Verbs'],
  ['possum, posse, potuī', 'be able, can', 'verb (irreg.)', 'Verbs'],
  ['eō, īre, iī (īvī), itum', 'go', 'verb (irreg.)', 'Verbs'],
  ['volō, velle, voluī', 'want', 'verb (irreg.)', 'Verbs'],
  ['nōlō, nōlle, nōluī', 'not want, refuse', 'verb (irreg.)', 'Verbs'],
  ['ferō, ferre, tulī, lātum', 'carry, bear', 'verb (irreg.)', 'Verbs'],

  // Adjectives
  ['bonus, -a, -um', 'good', 'adjective', 'Adjectives'],
  ['malus, -a, -um', 'bad', 'adjective', 'Adjectives'],
  ['magnus, -a, -um', 'big, great', 'adjective', 'Adjectives'],
  ['multus, -a, -um', 'much; (pl.) many', 'adjective', 'Adjectives'],
  ['novus, -a, -um', 'new', 'adjective', 'Adjectives'],
  ['longus, -a, -um', 'long', 'adjective', 'Adjectives'],
  ['pulcher, pulchra, pulchrum', 'beautiful, handsome', 'adjective', 'Adjectives'],
  ['trīstis, trīste', 'sad', 'adjective', 'Adjectives'],
  ['fortis, forte', 'brave, strong', 'adjective', 'Adjectives'],
  ['omnis, omne', 'every; (pl.) all', 'adjective', 'Adjectives'],
  ['facilis, facile', 'easy', 'adjective', 'Adjectives'],
  ['difficilis, difficile', 'difficult', 'adjective', 'Adjectives'],
  ['celer, celeris, celere', 'quick, fast', 'adjective', 'Adjectives'],
  ['ingēns, ingentis', 'huge', 'adjective', 'Adjectives'],
  ['fessus, -a, -um', 'tired', 'adjective', 'Adjectives'],
  ['īrātus, -a, -um', 'angry', 'adjective', 'Adjectives'],
  ['cārus, -a, -um', 'dear', 'adjective', 'Adjectives'],
  ['clārus, -a, -um', 'famous; bright', 'adjective', 'Adjectives'],
  ['sevērus, -a, -um', 'strict, stern', 'adjective', 'Adjectives'],
  ['āter, ātra, ātrum', 'dull black, gloomy', 'adjective', 'Adjectives'],
  ['candidus, -a, -um', 'bright white, dazzling', 'adjective', 'Adjectives'],

  // Little words
  ['et', 'and', 'conjunction', 'Little words'],
  ['-que', 'and (joined to the next word)', 'conjunction', 'Little words'],
  ['sed', 'but', 'conjunction', 'Little words'],
  ['aut', 'or', 'conjunction', 'Little words'],
  ['quod', 'because', 'conjunction', 'Little words'],
  ['sī', 'if', 'conjunction', 'Little words'],
  ['nōn', 'not', 'adverb', 'Little words'],
  ['quoque', 'also, too', 'adverb', 'Little words'],
  ['etiam', 'even, also', 'adverb', 'Little words'],
  ['tamen', 'however', 'adverb', 'Little words'],
  ['iterum', 'again', 'adverb', 'Little words'],
  ['valdē', 'very, very much', 'adverb', 'Little words'],
  ['bene', 'well', 'adverb', 'Little words'],
  ['ita', 'so, in this way; yes', 'adverb', 'Little words'],
  ['in (+ abl.)', 'in, on', 'preposition', 'Little words'],
  ['in (+ acc.)', 'into, onto', 'preposition', 'Little words'],
  ['ad (+ acc.)', 'to, towards', 'preposition', 'Little words'],
  ['ē / ex (+ abl.)', 'out of, from', 'preposition', 'Little words'],
  ['ā / ab (+ abl.)', 'from, away from; by', 'preposition', 'Little words'],
  ['cum (+ abl.)', 'with', 'preposition', 'Little words'],
  ['sine (+ abl.)', 'without', 'preposition', 'Little words'],
  ['dē (+ abl.)', 'about; down from', 'preposition', 'Little words'],
  ['sub (+ abl.)', 'under', 'preposition', 'Little words'],
  ['per (+ acc.)', 'through', 'preposition', 'Little words'],
  ['prope (+ acc.)', 'near', 'preposition', 'Little words'],
  ['post (+ acc.)', 'after, behind', 'preposition', 'Little words'],
  ['ante (+ acc.)', 'before, in front of', 'preposition', 'Little words'],
  ['inter (+ acc.)', 'between, among', 'preposition', 'Little words'],

  // Pronouns
  ['ego', 'I', 'pronoun', 'Pronouns'],
  ['tū', 'you (one person)', 'pronoun', 'Pronouns'],
  ['nōs', 'we', 'pronoun', 'Pronouns'],
  ['vōs', 'you (several people)', 'pronoun', 'Pronouns'],
  ['is, ea, id', 'he, she, it; that', 'pronoun', 'Pronouns'],
  ['hic, haec, hoc', 'this', 'pronoun', 'Pronouns'],
  ['ille, illa, illud', 'that; he, she, it', 'pronoun', 'Pronouns'],
  ['tuus, tua, tuum', 'your (one person’s)', 'adjective', 'Pronouns'],
  ['noster, nostra, nostrum', 'our', 'adjective', 'Pronouns'],
  ['vester, vestra, vestrum', 'your (several people’s)', 'adjective', 'Pronouns'],
  ['suus, sua, suum', 'his / her / their own', 'adjective', 'Pronouns'],
];

// ---------------------------------------------------------------------------
// Nouns
// ---------------------------------------------------------------------------

export interface CaseInfo {
  name: string;
  abbr: string;
  job: string;
  ex: [string, string];
}

export const CASES: CaseInfo[] = [
  { name: 'Nominative', abbr: 'Nom.', job: 'The subject: who or what does the action.', ex: ['Puella currit.', 'The girl runs.'] },
  { name: 'Vocative', abbr: 'Voc.', job: 'Calling or speaking to someone.', ex: ['Salvē, amīce!', 'Hello, friend!'] },
  { name: 'Accusative', abbr: 'Acc.', job: 'The object: who or what the action is done to. Also after ad, per, prope.', ex: ['Canem videō.', 'I see the dog.'] },
  { name: 'Genitive', abbr: 'Gen.', job: '“of”: shows who something belongs to.', ex: ['liber puellae', 'the girl’s book'] },
  { name: 'Dative', abbr: 'Dat.', job: '“to” or “for”: the indirect object.', ex: ['Puellae dōnum dō.', 'I give a present to the girl.'] },
  { name: 'Ablative', abbr: 'Abl.', job: '“by, with, from, in, on”. Used after in, cum, ā/ab, ē/ex, sine.', ex: ['cum amīcō', 'with a friend'] },
];

export interface NounParadigm {
  title: string;
  word: string;
  meaning: string;
  sg: string[];
  pl: string[];
  note?: string;
}

export const NOUNS: NounParadigm[] = [
  {
    title: '1st declension',
    word: 'puella, puellae (f)',
    meaning: 'girl',
    sg: ['puell|a', 'puell|a', 'puell|am', 'puell|ae', 'puell|ae', 'puell|ā'],
    pl: ['puell|ae', 'puell|ae', 'puell|ās', 'puell|ārum', 'puell|īs', 'puell|īs'],
    note: 'Almost all feminine. The exceptions are mostly jobs done by men: nauta (sailor), agricola (farmer).',
  },
  {
    title: '2nd declension (-us)',
    word: 'amīcus, amīcī (m)',
    meaning: 'friend',
    sg: ['amīc|us', 'amīc|e', 'amīc|um', 'amīc|ī', 'amīc|ō', 'amīc|ō'],
    pl: ['amīc|ī', 'amīc|ī', 'amīc|ōs', 'amīc|ōrum', 'amīc|īs', 'amīc|īs'],
    note: 'Nouns in -ius have a vocative in -ī: fīlius → fīlī!',
  },
  {
    title: '2nd declension (-er)',
    word: 'puer, puerī (m)',
    meaning: 'boy',
    sg: ['puer', 'puer', 'puer|um', 'puer|ī', 'puer|ō', 'puer|ō'],
    pl: ['puer|ī', 'puer|ī', 'puer|ōs', 'puer|ōrum', 'puer|īs', 'puer|īs'],
    note: 'Some -er nouns drop the e after the nominative: ager, agrī (field); liber, librī (book).',
  },
  {
    title: '2nd declension neuter',
    word: 'dōnum, dōnī (n)',
    meaning: 'gift',
    sg: ['dōn|um', 'dōn|um', 'dōn|um', 'dōn|ī', 'dōn|ō', 'dōn|ō'],
    pl: ['dōn|a', 'dōn|a', 'dōn|a', 'dōn|ōrum', 'dōn|īs', 'dōn|īs'],
    note: 'The neuter rule: nominative, vocative and accusative are always identical, and the plural ends in -a.',
  },
  {
    title: '3rd declension',
    word: 'rēx, rēgis (m)',
    meaning: 'king',
    sg: ['rēx', 'rēx', 'rēg|em', 'rēg|is', 'rēg|ī', 'rēg|e'],
    pl: ['rēg|ēs', 'rēg|ēs', 'rēg|ēs', 'rēg|um', 'rēg|ibus', 'rēg|ibus'],
    note: 'Find the stem from the genitive: rēgis → rēg-. The nominative can look quite different.',
  },
  {
    title: '3rd declension neuter',
    word: 'nōmen, nōminis (n)',
    meaning: 'name',
    sg: ['nōmen', 'nōmen', 'nōmen', 'nōmin|is', 'nōmin|ī', 'nōmin|e'],
    pl: ['nōmin|a', 'nōmin|a', 'nōmin|a', 'nōmin|um', 'nōmin|ibus', 'nōmin|ibus'],
  },
  {
    title: '3rd declension i-stem',
    word: 'cīvis, cīvis (m/f)',
    meaning: 'citizen',
    sg: ['cīv|is', 'cīv|is', 'cīv|em', 'cīv|is', 'cīv|ī', 'cīv|e'],
    pl: ['cīv|ēs', 'cīv|ēs', 'cīv|ēs', 'cīv|ium', 'cīv|ibus', 'cīv|ibus'],
    note: 'i-stems have -ium in the genitive plural.',
  },
  {
    title: '4th declension',
    word: 'manus, manūs (f)',
    meaning: 'hand',
    sg: ['man|us', 'man|us', 'man|um', 'man|ūs', 'man|uī', 'man|ū'],
    pl: ['man|ūs', 'man|ūs', 'man|ūs', 'man|uum', 'man|ibus', 'man|ibus'],
    note: 'Watch the long ū: manus is “hand”, manūs is “hands” or “of the hand”.',
  },
  {
    title: '5th declension',
    word: 'diēs, diēī (m)',
    meaning: 'day',
    sg: ['di|ēs', 'di|ēs', 'di|em', 'di|ēī', 'di|ēī', 'di|ē'],
    pl: ['di|ēs', 'di|ēs', 'di|ēs', 'di|ērum', 'di|ēbus', 'di|ēbus'],
  },
];

// ---------------------------------------------------------------------------
// Adjectives
// ---------------------------------------------------------------------------

export interface AdjParadigm {
  title: string;
  word: string;
  meaning: string;
  /** rows per case: [masc, fem, neut] */
  sg: string[][];
  pl: string[][];
}

export const ADJECTIVES: AdjParadigm[] = [
  {
    title: '1st / 2nd declension',
    word: 'bonus, bona, bonum',
    meaning: 'good',
    sg: [
      ['bon|us', 'bon|a', 'bon|um'],
      ['bon|e', 'bon|a', 'bon|um'],
      ['bon|um', 'bon|am', 'bon|um'],
      ['bon|ī', 'bon|ae', 'bon|ī'],
      ['bon|ō', 'bon|ae', 'bon|ō'],
      ['bon|ō', 'bon|ā', 'bon|ō'],
    ],
    pl: [
      ['bon|ī', 'bon|ae', 'bon|a'],
      ['bon|ī', 'bon|ae', 'bon|a'],
      ['bon|ōs', 'bon|ās', 'bon|a'],
      ['bon|ōrum', 'bon|ārum', 'bon|ōrum'],
      ['bon|īs', 'bon|īs', 'bon|īs'],
      ['bon|īs', 'bon|īs', 'bon|īs'],
    ],
  },
  {
    title: '3rd declension',
    word: 'fortis, forte',
    meaning: 'brave, strong',
    sg: [
      ['fort|is', 'fort|is', 'fort|e'],
      ['fort|is', 'fort|is', 'fort|e'],
      ['fort|em', 'fort|em', 'fort|e'],
      ['fort|is', 'fort|is', 'fort|is'],
      ['fort|ī', 'fort|ī', 'fort|ī'],
      ['fort|ī', 'fort|ī', 'fort|ī'],
    ],
    pl: [
      ['fort|ēs', 'fort|ēs', 'fort|ia'],
      ['fort|ēs', 'fort|ēs', 'fort|ia'],
      ['fort|ēs', 'fort|ēs', 'fort|ia'],
      ['fort|ium', 'fort|ium', 'fort|ium'],
      ['fort|ibus', 'fort|ibus', 'fort|ibus'],
      ['fort|ibus', 'fort|ibus', 'fort|ibus'],
    ],
  },
];

export const COMPARISON: Table = {
  head: ['Positive', 'Comparative', 'Superlative', 'Meaning'],
      la: [0, 1, 2],
  rows: [
    ['altus', 'altior', 'altissimus', 'tall, taller, tallest'],
    ['laetus', 'laetior', 'laetissimus', 'happy, happier, happiest'],
    ['fortis', 'fortior', 'fortissimus', 'brave, braver, bravest'],
    ['pulcher', 'pulchrior', 'pulcherrimus', 'beautiful, more beautiful, most beautiful'],
    ['facilis', 'facilior', 'facillimus', 'easy, easier, easiest'],
    ['bonus', 'melior', 'optimus', 'good, better, best'],
    ['malus', 'peior', 'pessimus', 'bad, worse, worst'],
    ['magnus', 'maior', 'maximus', 'big, bigger, biggest'],
    ['parvus', 'minor', 'minimus', 'small, smaller, smallest'],
    ['multus', 'plūs', 'plūrimus', 'much, more, most'],
  ],
};

// ---------------------------------------------------------------------------
// Verbs
// ---------------------------------------------------------------------------

export type Tense = 'present' | 'imperfect' | 'future' | 'perfect';
export const TENSES: { id: Tense; label: string }[] = [
  { id: 'present', label: 'Present' },
  { id: 'imperfect', label: 'Imperfect' },
  { id: 'future', label: 'Future' },
  { id: 'perfect', label: 'Perfect' },
];

export const PERSONS = ['I', 'you (sg.)', 'he / she / it', 'we', 'you (pl.)', 'they'];

export interface Verb {
  id: string;
  group: string;
  parts: string;
  meaning: string;
  inf: string;
  imp: [string, string];
  english: Record<Tense, string>;
  forms: Record<Tense, string[]>;
}

export const VERBS: Verb[] = [
  {
    id: 'amo',
    group: '1st conjugation',
    parts: 'amō, amāre, amāvī, amātum',
    meaning: 'love, like',
    inf: 'amāre',
    imp: ['amā!', 'amāte!'],
    english: { present: 'I love', imperfect: 'I was loving', future: 'I will love', perfect: 'I loved' },
    forms: {
      present: ['am|ō', 'amā|s', 'ama|t', 'amā|mus', 'amā|tis', 'ama|nt'],
      imperfect: ['amā|bam', 'amā|bās', 'amā|bat', 'amā|bāmus', 'amā|bātis', 'amā|bant'],
      future: ['amā|bō', 'amā|bis', 'amā|bit', 'amā|bimus', 'amā|bitis', 'amā|bunt'],
      perfect: ['amāv|ī', 'amāv|istī', 'amāv|it', 'amāv|imus', 'amāv|istis', 'amāv|ērunt'],
    },
  },
  {
    id: 'habeo',
    group: '2nd conjugation',
    parts: 'habeō, habēre, habuī, habitum',
    meaning: 'have, hold',
    inf: 'habēre',
    imp: ['habē!', 'habēte!'],
    english: { present: 'I have', imperfect: 'I was having', future: 'I will have', perfect: 'I had' },
    forms: {
      present: ['habe|ō', 'habē|s', 'habe|t', 'habē|mus', 'habē|tis', 'habe|nt'],
      imperfect: ['habē|bam', 'habē|bās', 'habē|bat', 'habē|bāmus', 'habē|bātis', 'habē|bant'],
      future: ['habē|bō', 'habē|bis', 'habē|bit', 'habē|bimus', 'habē|bitis', 'habē|bunt'],
      perfect: ['habu|ī', 'habu|istī', 'habu|it', 'habu|imus', 'habu|istis', 'habu|ērunt'],
    },
  },
  {
    id: 'ludo',
    group: '3rd conjugation',
    parts: 'lūdō, lūdere, lūsī, lūsum',
    meaning: 'play',
    inf: 'lūdere',
    imp: ['lūde!', 'lūdite!'],
    english: { present: 'I play', imperfect: 'I was playing', future: 'I will play', perfect: 'I played' },
    forms: {
      present: ['lūd|ō', 'lūd|is', 'lūd|it', 'lūd|imus', 'lūd|itis', 'lūd|unt'],
      imperfect: ['lūd|ēbam', 'lūd|ēbās', 'lūd|ēbat', 'lūd|ēbāmus', 'lūd|ēbātis', 'lūd|ēbant'],
      future: ['lūd|am', 'lūd|ēs', 'lūd|et', 'lūd|ēmus', 'lūd|ētis', 'lūd|ent'],
      perfect: ['lūs|ī', 'lūs|istī', 'lūs|it', 'lūs|imus', 'lūs|istis', 'lūs|ērunt'],
    },
  },
  {
    id: 'capio',
    group: '3rd conjugation (-iō)',
    parts: 'capiō, capere, cēpī, captum',
    meaning: 'take, capture',
    inf: 'capere',
    imp: ['cape!', 'capite!'],
    english: { present: 'I take', imperfect: 'I was taking', future: 'I will take', perfect: 'I took' },
    forms: {
      present: ['capi|ō', 'cap|is', 'cap|it', 'cap|imus', 'cap|itis', 'capi|unt'],
      imperfect: ['capi|ēbam', 'capi|ēbās', 'capi|ēbat', 'capi|ēbāmus', 'capi|ēbātis', 'capi|ēbant'],
      future: ['capi|am', 'capi|ēs', 'capi|et', 'capi|ēmus', 'capi|ētis', 'capi|ent'],
      perfect: ['cēp|ī', 'cēp|istī', 'cēp|it', 'cēp|imus', 'cēp|istis', 'cēp|ērunt'],
    },
  },
  {
    id: 'audio',
    group: '4th conjugation',
    parts: 'audiō, audīre, audīvī, audītum',
    meaning: 'hear, listen',
    inf: 'audīre',
    imp: ['audī!', 'audīte!'],
    english: { present: 'I hear', imperfect: 'I was hearing', future: 'I will hear', perfect: 'I heard' },
    forms: {
      present: ['audi|ō', 'audī|s', 'audi|t', 'audī|mus', 'audī|tis', 'audi|unt'],
      imperfect: ['audi|ēbam', 'audi|ēbās', 'audi|ēbat', 'audi|ēbāmus', 'audi|ēbātis', 'audi|ēbant'],
      future: ['audi|am', 'audi|ēs', 'audi|et', 'audi|ēmus', 'audi|ētis', 'audi|ent'],
      perfect: ['audīv|ī', 'audīv|istī', 'audīv|it', 'audīv|imus', 'audīv|istis', 'audīv|ērunt'],
    },
  },
  {
    id: 'sum',
    group: 'Irregular',
    parts: 'sum, esse, fuī, futūrus',
    meaning: 'be',
    inf: 'esse',
    imp: ['es!', 'este!'],
    english: { present: 'I am', imperfect: 'I was', future: 'I will be', perfect: 'I was / have been' },
    forms: {
      present: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'],
      imperfect: ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'],
      future: ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'],
      perfect: ['fu|ī', 'fu|istī', 'fu|it', 'fu|imus', 'fu|istis', 'fu|ērunt'],
    },
  },
  {
    id: 'possum',
    group: 'Irregular',
    parts: 'possum, posse, potuī',
    meaning: 'be able, can',
    inf: 'posse',
    imp: ['—', '—'],
    english: { present: 'I can', imperfect: 'I was able', future: 'I will be able', perfect: 'I could' },
    forms: {
      present: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'],
      imperfect: ['poteram', 'poterās', 'poterat', 'poterāmus', 'poterātis', 'poterant'],
      future: ['poterō', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'],
      perfect: ['potu|ī', 'potu|istī', 'potu|it', 'potu|imus', 'potu|istis', 'potu|ērunt'],
    },
  },
  {
    id: 'eo',
    group: 'Irregular',
    parts: 'eō, īre, iī (īvī), itum',
    meaning: 'go',
    inf: 'īre',
    imp: ['ī!', 'īte!'],
    english: { present: 'I go', imperfect: 'I was going', future: 'I will go', perfect: 'I went' },
    forms: {
      present: ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'],
      imperfect: ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant'],
      future: ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt'],
      perfect: ['iī', 'īstī', 'iit', 'iimus', 'īstis', 'iērunt'],
    },
  },
  {
    id: 'volo',
    group: 'Irregular',
    parts: 'volō, velle, voluī',
    meaning: 'want, wish',
    inf: 'velle',
    imp: ['—', '—'],
    english: { present: 'I want', imperfect: 'I was wanting', future: 'I will want', perfect: 'I wanted' },
    forms: {
      present: ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'],
      imperfect: ['vol|ēbam', 'vol|ēbās', 'vol|ēbat', 'vol|ēbāmus', 'vol|ēbātis', 'vol|ēbant'],
      future: ['vol|am', 'vol|ēs', 'vol|et', 'vol|ēmus', 'vol|ētis', 'vol|ent'],
      perfect: ['volu|ī', 'volu|istī', 'volu|it', 'volu|imus', 'volu|istis', 'volu|ērunt'],
    },
  },
];

export const PERSONAL_ENDINGS: Table = {
  head: ['Person', 'Most tenses', 'Perfect'],
      la: [1, 2],
  rows: [
    ['I', '-ō / -m', '-ī'],
    ['you (sg.)', '-s', '-istī'],
    ['he / she / it', '-t', '-it'],
    ['we', '-mus', '-imus'],
    ['you (pl.)', '-tis', '-istis'],
    ['they', '-nt', '-ērunt'],
  ],
};

// ---------------------------------------------------------------------------
// Pronouns
// ---------------------------------------------------------------------------

export const PRONOUN_TABLES: { title: string; note?: string; table: Table }[] = [
  {
    title: 'I, you, we, you all',
    note: 'The verb ending already shows the person, so ego and tū are only used for emphasis.',
    table: {
      head: ['', 'I', 'you (sg.)', 'we', 'you (pl.)'],
      la: [1, 2, 3, 4],
      rows: [
        ['Nom.', 'ego', 'tū', 'nōs', 'vōs'],
        ['Acc.', 'mē', 'tē', 'nōs', 'vōs'],
        ['Gen.', 'meī', 'tuī', 'nostrum / nostrī', 'vestrum / vestrī'],
        ['Dat.', 'mihi', 'tibi', 'nōbīs', 'vōbīs'],
        ['Abl.', 'mē', 'tē', 'nōbīs', 'vōbīs'],
      ],
    },
  },
  {
    title: 'he, she, it, they: is, ea, id',
    table: {
      head: ['', 'm. sg.', 'f. sg.', 'n. sg.', 'm. pl.', 'f. pl.', 'n. pl.'],
      la: [1, 2, 3, 4, 5, 6],
      rows: [
        ['Nom.', 'is', 'ea', 'id', 'eī', 'eae', 'ea'],
        ['Acc.', 'eum', 'eam', 'id', 'eōs', 'eās', 'ea'],
        ['Gen.', 'eius', 'eius', 'eius', 'eōrum', 'eārum', 'eōrum'],
        ['Dat.', 'eī', 'eī', 'eī', 'eīs', 'eīs', 'eīs'],
        ['Abl.', 'eō', 'eā', 'eō', 'eīs', 'eīs', 'eīs'],
      ],
    },
  },
  {
    title: 'who? what?: quis, quid',
    table: {
      head: ['', 'who?', 'what?'],
      la: [1, 2],
      rows: [
        ['Nom.', 'quis', 'quid'],
        ['Acc.', 'quem', 'quid'],
        ['Gen.', 'cuius', 'cuius'],
        ['Dat.', 'cui', 'cui'],
        ['Abl.', 'quō', 'quō'],
      ],
    },
  },
  {
    title: 'Possessive adjectives',
    note: 'These agree with the thing owned, not the owner: soror mea (my sister), frātrēs meī (my brothers).',
    table: {
      head: ['English', 'Latin'],
      la: [1],
      rows: [
        ['my', 'meus, mea, meum'],
        ['your (one person’s)', 'tuus, tua, tuum'],
        ['our', 'noster, nostra, nostrum'],
        ['your (several people’s)', 'vester, vestra, vestrum'],
        ['his / her / their own', 'suus, sua, suum'],
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export const ORDINALS: [number, string][] = [
  [1, 'prīmus'],
  [2, 'secundus'],
  [3, 'tertius'],
  [4, 'quārtus'],
  [5, 'quīntus'],
  [6, 'sextus'],
  [7, 'septimus'],
  [8, 'octāvus'],
  [9, 'nōnus'],
  [10, 'decimus'],
  [11, 'ūndecimus'],
  [12, 'duodecimus'],
  [20, 'vīcēsimus'],
  [100, 'centēsimus'],
  [1000, 'mīllēsimus'],
];

export const SMALL_NUMBER_TABLES: { title: string; table: Table }[] = [
  {
    title: 'ūnus: one',
    table: {
      head: ['', 'Masc.', 'Fem.', 'Neut.'],
        la: [1, 2, 3],
      rows: [
        ['Nom.', 'ūnus', 'ūna', 'ūnum'],
        ['Acc.', 'ūnum', 'ūnam', 'ūnum'],
        ['Gen.', 'ūnīus', 'ūnīus', 'ūnīus'],
        ['Dat.', 'ūnī', 'ūnī', 'ūnī'],
        ['Abl.', 'ūnō', 'ūnā', 'ūnō'],
      ],
    },
  },
  {
    title: 'duo: two',
    table: {
      head: ['', 'Masc.', 'Fem.', 'Neut.'],
        la: [1, 2, 3],
      rows: [
        ['Nom.', 'duo', 'duae', 'duo'],
        ['Acc.', 'duōs', 'duās', 'duo'],
        ['Gen.', 'duōrum', 'duārum', 'duōrum'],
        ['Dat.', 'duōbus', 'duābus', 'duōbus'],
        ['Abl.', 'duōbus', 'duābus', 'duōbus'],
      ],
    },
  },
  {
    title: 'trēs: three',
    table: {
      head: ['', 'Masc. / Fem.', 'Neut.'],
      la: [1, 2],
      rows: [
        ['Nom.', 'trēs', 'tria'],
        ['Acc.', 'trēs', 'tria'],
        ['Gen.', 'trium', 'trium'],
        ['Dat.', 'tribus', 'tribus'],
        ['Abl.', 'tribus', 'tribus'],
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Grammar rules
// ---------------------------------------------------------------------------

export const GRAMMAR: KeyIdea[] = [
  { title: 'No “the” or “a”', body: 'Latin has no articles. _puella_ can mean “girl”, “a girl” or “the girl”; choose whichever sounds right in English.' },
  {
    title: 'Endings do the work',
    body: 'In English, word order tells you who does what. In Latin, the **ending** does. These mean exactly the same: _Puella canem videt._ / _Canem puella videt._ (The girl sees the dog.) Each set of endings is called a **case**; the Nouns tab has them all.',
  },
  {
    title: 'Three genders',
    body: 'Every noun is masculine, feminine or neuter. It is grammar, not biology: _mēnsa_ (table) is feminine, _mūrus_ (wall) is masculine, _bellum_ (war) is neuter. Rules of thumb: **-a** nouns are usually feminine, **-us** nouns usually masculine, **-um** nouns always neuter.',
  },
  {
    title: 'The verb usually goes last',
    body: '_Marcus librum legit._ (Marcus reads a book.) Because endings show who does what, writers move words around for emphasis, especially in poetry.',
  },
  {
    title: 'Verbs include their subject',
    body: 'The ending tells you who: _amō_ = I love, _amās_ = you love, _amat_ = he/she loves. Add _ego_ or _tū_ only for emphasis: _Ego labōrō, tū dormīs!_ (I’m working, and YOU’RE sleeping!)',
  },
  {
    title: 'Adjectives agree',
    body: 'An adjective matches its noun in **gender**, **number** and **case**, but not always in spelling: _agricola bonus_ (a good farmer) pairs a masculine adjective with a 1st-declension noun.',
  },
  {
    title: 'Describing with “is” and “are”',
    body: 'With _est_ (is) and _sunt_ (are), the describing word stays in the nominative: _Marcus laetus est._ (Marcus is happy.) _Puellae laetae sunt._ (The girls are happy.)',
  },
  {
    title: 'Prepositions take cases',
    body: 'Each preposition is followed by a particular case. _In_ changes meaning depending on the case.',
    table: {
      head: ['+ accusative', '+ ablative'],
      rows: [
        ['ad: to, towards', 'in: in, on'],
        ['in: into, onto', 'cum: with'],
        ['per: through', 'ā / ab: from, by'],
        ['prope: near', 'ē / ex: out of'],
        ['post: after, behind', 'sine: without'],
        ['ante: before', 'dē: about, down from'],
      ],
    },
  },
  {
    title: 'Commands',
    body: 'To give a command to one person, use the verb stem: _Audī!_ (Listen!) _Spectā!_ (Look!) For several people add **-te**: _Audīte!_ _Spectāte!_ For “don’t”, use _nōlī_ / _nōlīte_ + infinitive: _Nōlī clāmāre!_ (Don’t shout!)',
  },
  {
    title: 'Having with the dative',
    body: 'Latin can say “to me there is…” instead of “I have”: _Mihi nōmen est Marcus._ (My name is Marcus.) _Est mihi canis._ (I have a dog.)',
  },
  {
    title: 'Principal parts',
    body: 'Dictionaries list four forms of each verb, e.g. _amō, amāre, amāvī, amātum_: “I love”, “to love”, “I loved” and the supine. Together they give you every stem you need for every tense.',
  },
  {
    title: 'Questions',
    body: 'Question words (_quis, quid, ubi, cūr_…) go first. Add **-ne** to the first word for a yes/no question; _nōnne_ expects “yes” and _num_ expects “no”.',
  },
];

// ---------------------------------------------------------------------------
// Pronunciation (restored classical)
// ---------------------------------------------------------------------------

export const VOWELS: Table = {
  head: ['Letter', 'Short', 'Long (with macron)', 'Examples'],
      la: [3],
  rows: [
    ['a', 'as in “cup”', 'ā as in “father”', 'amō, māter'],
    ['e', 'as in “pet”', 'ē as in “they”', 'bene, salvē'],
    ['i', 'as in “pit”', 'ī as in “machine”', 'mihi, vīgintī'],
    ['o', 'as in “pot”', 'ō as in “note”', 'soror, octō'],
    ['u', 'as in “put”', 'ū as in “rule”', 'ubi, cūr'],
    ['y', 'French “u” / German “ü”', 'ȳ: the same, held longer', 'lyra (Greek words)'],
  ],
};

export const DIPHTHONGS: Table = {
  head: ['Letters', 'Sound', 'Examples'],
      la: [2],
  rows: [
    ['ae', 'as in “aisle”', 'caelum, laetus'],
    ['au', 'as in “cow”', 'aurum, audiō'],
    ['oe', 'as in “boy”', 'poena'],
    ['ei', 'as in “rein”', 'deinde'],
    ['eu', '“eh-oo” in one syllable', 'heu!'],
    ['ui', 'glides like “wee”', 'cui, huic'],
  ],
};

export const CONSONANTS: Table = {
  head: ['Letter', 'Sound', 'Example'],
      la: [2],
  rows: [
    ['c', 'always hard, like “k”', 'Cicerō'],
    ['g', 'always hard, as in “get”', 'argenteus'],
    ['v', 'like English “w”', 'vīnum'],
    ['i (before a vowel)', 'like “y” in “yes”', 'iam, Iūlia'],
    ['s', 'always as in “sit”, never “z”', 'rosa'],
    ['r', 'rolled or trilled', 'rēx'],
    ['qu', 'like “kw”', 'quattuor'],
    ['t', 'always “t”, even in -tiō', 'nātiō'],
    ['ch, ph, th', 'k, p, t with a puff of air (not “ch”, “f”, “th”)', 'pulcher, theātrum'],
    ['x', 'like “ks”', 'sex'],
    ['bs, bt', 'like “ps”, “pt”', 'urbs'],
    ['double letters', 'held longer: say both', 'puella, mīlle'],
    ['gn', 'the g is nasal: “ng-n”', 'magnus'],
  ],
};

export const STRESS_RULES: { rule: string; examples: string[] }[] = [
  { rule: 'One syllable: stress it.', examples: ['sex', 'rēx'] },
  { rule: 'Two syllables: stress the first.', examples: ['salvē', 'pater'] },
  {
    rule: 'Three or more: if the second-to-last syllable is long (long vowel, diphthong, or followed by two consonants), stress it.',
    examples: ['amīcus', 'puella', 'vīgintī'],
  },
  { rule: 'Otherwise, stress the syllable before it.', examples: ['fēmina', 'dominus', 'caeruleus'] },
];

/** Starter phrases for the pronunciation lab. */
export const LAB_SAMPLES = ['Cicerō', 'Iūlius Caesar', 'vēnī, vīdī, vīcī', 'carpe diem', 'caelum', 'amīcitia'];
