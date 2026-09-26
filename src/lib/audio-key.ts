/**
 * Keys for the pre-recorded voice clips. Case and punctuation don't change the
 * clip, except a closing "?", which changes the intonation.
 */
export function audioKey(text: string): string {
  const t = text.normalize('NFC').toLowerCase().replace(/’/g, "'");
  const q = /\?\s*$/.test(t) ? '?' : '';
  // Letters of any language; hyphens and apostrophes stay inside words (-que, vingt-deux, j'aime).
  const words = t
    .replace(/[^\p{L}'-]+/gu, ' ')
    .split(' ')
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => /\p{L}/u.test(w));
  return words.length ? words.join(' ') + q : '';
}

/** Clip file name for a key: 32-bit FNV-1a in base 36. */
export function audioId(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Split text into the fewest clips that exist, longest match first, so a
 * phrase nobody recorded ("mīlle trecentī septem") can still be spoken from
 * its parts. Returns null if any word has no clip.
 */
export function planClips(text: string, has: (id: string) => boolean): string[] | null {
  const key = audioKey(text);
  if (!key) return null;
  if (has(audioId(key))) return [audioId(key)];
  const q = key.endsWith('?');
  const words = (q ? key.slice(0, -1) : key).split(' ');
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    let found = 0;
    for (let j = words.length; j > i && !found; j--) {
      const part = words.slice(i, j).join(' ');
      const ids = j === words.length && q ? [audioId(part + '?'), audioId(part)] : [audioId(part)];
      const id = ids.find(has);
      if (id) {
        out.push(id);
        found = j - i;
      }
    }
    if (!found) return null;
    i += found;
  }
  return out;
}
