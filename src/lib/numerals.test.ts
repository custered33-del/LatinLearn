import { describe, expect, it } from 'vitest';
import { fromRoman, toLatinWords, toRoman } from './numerals';

describe('Roman numerals', () => {
  it.each([
    [4, 'IV'],
    [9, 'IX'],
    [14, 'XIV'],
    [40, 'XL'],
    [90, 'XC'],
    [400, 'CD'],
    [1994, 'MCMXCIV'],
    [2026, 'MMXXVI'],
    [3999, 'MMMCMXCIX'],
  ])('%i ↔ %s', (n, r) => {
    expect(toRoman(n)).toBe(r);
    expect(fromRoman(r)).toBe(n);
  });

  it('rejects non-standard or out-of-range input', () => {
    expect(fromRoman('IIII')).toBeNull();
    expect(fromRoman('VX')).toBeNull();
    expect(fromRoman('abc')).toBeNull();
    expect(toRoman(0)).toBe('');
    expect(toRoman(4000)).toBe('');
  });
});

describe('Latin number words', () => {
  it.each([
    [1, 'ūnus'],
    [13, 'trēdecim'],
    [18, 'duodēvīgintī'],
    [19, 'ūndēvīgintī'],
    [21, 'vīgintī ūnus'],
    [28, 'duodētrīgintā'],
    [89, 'ūndēnōnāgintā'],
    [98, 'nōnāgintā octō'],
    [100, 'centum'],
    [150, 'centum quīnquāgintā'],
    [1000, 'mīlle'],
    [2026, 'duo mīlia vīgintī sex'],
    [3999, 'tria mīlia nōngentī nōnāgintā novem'],
  ])('%i → %s', (n, words) => {
    expect(toLatinWords(n)).toBe(words);
  });
});
