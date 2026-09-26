import { describe, expect, it } from 'vitest';
import { audioId, audioKey, planClips } from './audio-key';

describe('audioKey', () => {
  it('ignores case and punctuation but keeps macrons', () => {
    expect(audioKey('Salvē, Marce!')).toBe('salvē marce');
    expect(audioKey('ūnus')).not.toBe(audioKey('unus'));
  });

  it('keeps a closing question mark (it changes the tune)', () => {
    expect(audioKey('Quid agis?')).toBe('quid agis?');
    expect(audioKey('quid agis')).toBe('quid agis');
  });

  it('turns "…" and "/" into word breaks and keeps enclitics', () => {
    expect(audioKey('prīmum … deinde')).toBe('prīmum deinde');
    expect(audioKey('nātus / nāta')).toBe('nātus nāta');
    expect(audioKey('-que')).toBe('-que');
    expect(audioKey('XII?')).toBe('xii?');
    expect(audioKey('— 12 —')).toBe('');
  });
});

describe('planClips', () => {
  const have = new Set(['mīlle', 'trecentī', 'septem', 'quid agis?', 'salvē'].map((k) => audioId(k)));
  const has = (id: string) => have.has(id);

  it('uses a whole-phrase clip when there is one', () => {
    expect(planClips('Quid agis?', has)).toEqual([audioId('quid agis?')]);
  });

  it('pieces a phrase together from the longest recorded parts', () => {
    expect(planClips('mīlle trecentī septem', has)).toEqual(['mīlle', 'trecentī', 'septem'].map(audioId));
    expect(planClips('Salvē! Quid agis?', has)).toEqual([audioId('salvē'), audioId('quid agis?')]);
  });

  it('gives up if any word was never recorded', () => {
    expect(planClips('salvē amīce', has)).toBeNull();
    expect(planClips('', has)).toBeNull();
  });
});
