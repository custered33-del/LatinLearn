const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return '';
  let out = '';
  for (const [value, sym] of ROMAN) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out;
}

/** Parse a Roman numeral; returns null unless it's in standard form. */
export function fromRoman(s: string): number | null {
  const str = s.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(str)) return null;
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = val[str[i]];
    const next = val[str[i + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return toRoman(total) === str ? total : null;
}

const UNITS = ['', 'ūnus', 'duo', 'trēs', 'quattuor', 'quīnque', 'sex', 'septem', 'octō', 'novem'];
const TEENS = ['decem', 'ūndecim', 'duodecim', 'trēdecim', 'quattuordecim', 'quīndecim', 'sēdecim', 'septendecim', 'duodēvīgintī', 'ūndēvīgintī'];
const TENS = ['', 'decem', 'vīgintī', 'trīgintā', 'quadrāgintā', 'quīnquāgintā', 'sexāgintā', 'septuāgintā', 'octōgintā', 'nōnāgintā'];
const HUNDREDS = ['', 'centum', 'ducentī', 'trecentī', 'quadringentī', 'quīngentī', 'sescentī', 'septingentī', 'octingentī', 'nōngentī'];

function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  // 28 = duodētrīgintā ("two from thirty"), 29 = ūndētrīgintā … up to 89
  if (u === 8 && t < 9) return 'duodē' + TENS[t + 1];
  if (u === 9 && t < 9) return 'ūndē' + TENS[t + 1];
  return u ? `${TENS[t]} ${UNITS[u]}` : TENS[t];
}

/** Cardinal number in Latin words (1–3999), e.g. 2026 → "duo mīlia vīgintī sex". */
export function toLatinWords(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return '';
  const parts: string[] = [];
  const th = Math.floor(n / 1000);
  if (th === 1) parts.push('mīlle');
  else if (th > 1) parts.push(`${th === 2 ? 'duo' : 'tria'} mīlia`);
  const h = Math.floor((n % 1000) / 100);
  if (h) parts.push(HUNDREDS[h]);
  const rest = n % 100;
  if (rest) parts.push(below100(rest));
  return parts.join(' ');
}
