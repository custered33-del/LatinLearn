import { describe, expect, it } from 'vitest';
import { checkTyped, fold, headword, phoneticKey, respell, speechSimilarity, toItalianSpelling, toPhonemes } from './latin';

describe('respell', () => {
  it.each([
    ['caeruleus', 'kai-RU-leh-us'],
    ['viridis', 'WI-ri-dis'],
    ['flāvus', 'FLAH-wus'],
    ['purpureus', 'pur-PU-reh-us'],
    ['argenteus', 'ar-GEN-teh-us'],
    ['cinereus', 'ki-NEH-reh-us'],
    ['croceus', 'KRO-keh-us'],
    ['aureus', 'OW-reh-us'],
    ['quattuor', 'KWAT-tu-or'],
    ['quīnque', 'KWEEN-kweh'],
    ['sex', 'SEKS'],
    ['duodecim', 'du-O-deh-kim'],
    ['vīgintī', 'wee-GIN-tee'],
    ['quīnquāgintā', 'kween-kwah-GIN-tah'],
    ['mīlle', 'MEEL-leh'],
    ['Salvē', 'SAL-way'],
    ['Salvēte', 'sal-WAY-teh'],
    ['Quaesō', 'KWAI-soh'],
    ['Ignōsce', 'ig-NOHS-keh'],
    ['familia', 'fa-MI-li-a'],
    ['cōnsobrīnus', 'kohn-so-BREE-nus'],
    ['avunculus', 'a-WUN-ku-lus'],
    ['capillī', 'ka-PIL-lee'],
    ['frāter', 'FRAH-ter'],
    ['Iūlia', 'YOO-li-a'],
    ['lingua', 'LIN-gwa'],
    ['pulcher', 'PUL-ker'],
    ['ūnus', 'OO-nus'],
    ['sententiā', 'sen-TEN-ti-ah'],
    ['dissentiō', 'dis-SEN-ti-oh'],
    ['exemplī', 'ek-SEM-plee'],
    ['deinde', 'DAYN-deh'],
    ['meus', 'MEH-us'],
    ['Iovis', 'YO-wis'],
    ['Mercuriī', 'mer-KU-ri-ee'],
    ['Saturnī', 'sa-TUR-nee'],
    ['amphitheātrum', 'am-pi-teh-AH-trum'],
    ['labōrō', 'la-BOH-roh'],
    ['dormiō', 'DOR-mi-oh'],
  ])('%s → %s', (word, expected) => {
    expect(respell(word)).toBe(expected);
  });

  it('handles phrases, punctuation, enclitics and alternatives', () => {
    expect(respell('Quid agis?')).toBe('KWID A-gis');
    expect(respell('Grātiās tibi agō.')).toBe('GRAH-ti-ahs TI-bi A-goh');
    expect(respell('Mihi nōmen est …')).toBe('MI-hi NOH-men EST');
    expect(respell('-ne')).toBe('neh');
    expect(respell('nātus / nāta')).toBe('NAH-tus / NAH-ta');
  });
});

describe('helpers', () => {
  it('folds macrons and case', () => {
    expect(fold('Cūrā ut valeās')).toBe('cura ut valeas');
  });

  it('extracts dictionary headwords', () => {
    expect(headword('ruber, rubra, rubrum')).toBe('ruber');
    expect(headword('in (+ abl.)')).toBe('in');
    expect(headword('ē / ex (+ abl.)')).toBe('ē');
  });

  it('respells for an Italian TTS voice', () => {
    expect(toItalianSpelling('Salvē, Cicerō')).toBe('salue, chichero');
    expect(toItalianSpelling('argenteus')).toBe('arghenteus');
    expect(toItalianSpelling('Quot annōs nātus / nāta es?')).toBe('quot annos natus es?');
  });
});

describe('speech matching', () => {
  it('treats spelling variants as identical', () => {
    expect(phoneticKey('salvē')).toBe(phoneticKey('salue'));
    expect(phoneticKey('caelum')).toBe(phoneticKey('chelum'));
    expect(speechSimilarity('Quid agis', 'quid agis?')).toBe(1);
  });

  it('scores near misses high and different words low', () => {
    expect(speechSimilarity('cerulevs', 'caeruleus')).toBeGreaterThan(0.7);
    expect(speechSimilarity('buongiorno', 'valē')).toBeLessThan(0.4);
  });
});

describe('checkTyped', () => {
  it('ignores macrons, case and punctuation', () => {
    expect(checkTyped('Salve', ['Salvē!'])).toBe('exact');
    expect(checkTyped('  quid AGIS ', ['Quid agis?'])).toBe('exact');
  });

  it('allows one slip in longer words only', () => {
    expect(checkTyped('caerulus', ['caeruleus'])).toBe('typo');
    expect(checkTyped('sez', ['sex'])).toBe('wrong');
    expect(checkTyped('', ['sex'])).toBe('wrong');
  });
});

describe('toPhonemes (neural voice input)', () => {
  it.each([
    ['ūnus', 'ˈuːnus'],
    ['Salvē! Quid agis?', 'sˈalweː! kwˈid ˈaɡis?'],
    ['caeruleus', 'kajrˈulɛus'],
    ['Iūlia', 'jˈuːlia'],
    ['magnus', 'mˈaŋnus'],
    ['lingua', 'lˈiŋɡwa'],
    ['ecce', 'ˈɛkːɛ'],
    ['terra', 'tˈɛrɾa'],
    ['puella', 'puˈɛlla'],
    ['urbs', 'ˈurps'],
    ['hodiē', 'ˈɔdieː'],
    ['amphitheātrum', 'ampitɛˈaːtrum'],
    ['vēnī, vīdī, vīcī', 'wˈeːniː, wˈiːdiː, wˈiːkiː'],
    ['prīmum … deinde … dēnique', 'prˈiːmum, dˈɛjndɛ, dˈeːnikwɛ'],
    ['nātus / nāta', 'nˈaːtus, nˈaːta'],
    ['in forō', 'in fˈɔroː'],
    ['-que', 'kwˈɛ'],
  ])('%s → %s', (la, ipa) => {
    expect(toPhonemes(la)).toBe(ipa);
  });

  it('stresses a lone preposition but not one inside a phrase', () => {
    expect(toPhonemes('in')).toBe('ˈin');
    expect(toPhonemes('in hortō')).toBe('in ˈɔrtoː');
  });
});
