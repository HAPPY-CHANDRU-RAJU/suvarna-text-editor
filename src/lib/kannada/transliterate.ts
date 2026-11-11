// Phonetic English → Kannada transliteration (Baraha / Nudi style).
//
//   namaskaara → ನಮಸ್ಕಾರ    kannaDa → ಕನ್ನಡ    beMgaLUru → ಬೆಂಗಳೂರು
//
// Upper-case letters select retroflex / long forms (T D N L Sh, A I U E O),
// a consonant with no following vowel gets a virama (್), and "a" is the
// inherent vowel.

const VIRAMA = '್';
const NUKTA = '಼';

type Token =
  | { kind: 'consonant'; value: string }
  | { kind: 'vowel'; independent: string; matra: string }
  | { kind: 'sign'; value: string }
  | { kind: 'literal'; value: string };

const VOWELS: Record<string, [string, string]> = {
  a: ['ಅ', ''],
  aa: ['ಆ', 'ಾ'], A: ['ಆ', 'ಾ'],
  i: ['ಇ', 'ಿ'],
  ii: ['ಈ', 'ೀ'], ee: ['ಈ', 'ೀ'], I: ['ಈ', 'ೀ'],
  u: ['ಉ', 'ು'],
  uu: ['ಊ', 'ೂ'], oo: ['ಊ', 'ೂ'], U: ['ಊ', 'ೂ'],
  Ru: ['ಋ', 'ೃ'], RU: ['ೠ', 'ೄ'],
  e: ['ಎ', 'ೆ'],
  E: ['ಏ', 'ೇ'],
  ai: ['ಐ', 'ೈ'],
  o: ['ಒ', 'ೊ'],
  O: ['ಓ', 'ೋ'],
  au: ['ಔ', 'ೌ'], ou: ['ಔ', 'ೌ'],
};

const CONSONANTS: Record<string, string> = {
  k: 'ಕ', kh: 'ಖ', g: 'ಗ', gh: 'ಘ', '~g': 'ಙ', G: 'ಙ',
  c: 'ಚ', ch: 'ಚ', Ch: 'ಛ', chh: 'ಛ', j: 'ಜ', jh: 'ಝ', '~j': 'ಞ', J: 'ಞ',
  T: 'ಟ', Th: 'ಠ', D: 'ಡ', Dh: 'ಢ', N: 'ಣ',
  t: 'ತ', th: 'ಥ', d: 'ದ', dh: 'ಧ', n: 'ನ',
  p: 'ಪ', ph: 'ಫ', f: 'ಫ' + NUKTA, b: 'ಬ', bh: 'ಭ', m: 'ಮ',
  y: 'ಯ', r: 'ರ', R: 'ರ', l: 'ಲ', v: 'ವ', w: 'ವ',
  sh: 'ಶ', S: 'ಶ', Sh: 'ಷ', shh: 'ಷ', s: 'ಸ', h: 'ಹ', L: 'ಳ',
  x: 'ಕ' + VIRAMA + 'ಷ', ksh: 'ಕ' + VIRAMA + 'ಷ', jn: 'ಜ' + VIRAMA + 'ಞ',
  z: 'ಜ' + NUKTA, q: 'ಕ' + NUKTA,
};

const SIGNS: Record<string, string> = {
  M: 'ಂ', // anusvara
  H: 'ಃ', // visarga
};

const KANNADA_DIGITS = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'];

// Upper-case letters without a meaning of their own fall back to lower case.
const MEANINGFUL_UPPER = new Set(['A', 'I', 'U', 'E', 'O', 'T', 'D', 'N', 'L', 'S', 'M', 'H', 'R', 'G', 'J', 'C']);

const MAX_TOKEN = 3;

function lookup(chunk: string): Token | null {
  if (chunk in VOWELS) {
    const [independent, matra] = VOWELS[chunk];
    return { kind: 'vowel', independent, matra };
  }
  if (chunk in CONSONANTS) return { kind: 'consonant', value: CONSONANTS[chunk] };
  if (chunk in SIGNS) return { kind: 'sign', value: SIGNS[chunk] };
  return null;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    let matched: Token | null = null;
    let length = 0;
    for (let len = Math.min(MAX_TOKEN, input.length - i); len > 0; len--) {
      let chunk = input.slice(i, i + len);
      if (len === 1 && /[A-Z]/.test(chunk) && !MEANINGFUL_UPPER.has(chunk)) chunk = chunk.toLowerCase();
      // "C" alone behaves like "c"; "Ch" is handled by the table above.
      if (chunk === 'C') chunk = 'c';
      const token = lookup(chunk);
      if (token) {
        matched = token;
        length = len;
        break;
      }
    }
    if (matched) {
      tokens.push(matched);
      i += length;
    } else {
      tokens.push({ kind: 'literal', value: input[i] });
      i += 1;
    }
  }
  return tokens;
}

export function transliterate(input: string): string {
  let out = '';
  let pendingConsonant = false;

  for (const token of tokenize(input)) {
    switch (token.kind) {
      case 'consonant':
        if (pendingConsonant) out += VIRAMA;
        out += token.value;
        pendingConsonant = true;
        break;
      case 'vowel':
        out += pendingConsonant ? token.matra : token.independent;
        pendingConsonant = false;
        break;
      case 'sign':
        // "kM" reads as "kaM": the sign attaches to the inherent vowel.
        out += token.value;
        pendingConsonant = false;
        break;
      case 'literal':
        if (pendingConsonant) out += VIRAMA;
        out += token.value;
        pendingConsonant = false;
        break;
    }
  }
  if (pendingConsonant) out += VIRAMA;
  return out;
}

/** Characters that extend the word currently being transliterated. */
export function isTransliterationKey(char: string): boolean {
  return /^[a-zA-Z~]$/.test(char);
}

export function toKannadaDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => KANNADA_DIGITS[Number(d)]);
}

export function toWesternDigits(text: string): string {
  return text.replace(/[೦-೯]/g, (d) => String(KANNADA_DIGITS.indexOf(d)));
}

export function hasKannadaDigits(text: string): boolean {
  return /[೦-೯]/.test(text);
}

export function formatNumber(n: number, kannada: boolean): string {
  return kannada ? toKannadaDigits(String(n)) : String(n);
}

/** Reference table shown in the help dialog. */
export const TRANSLITERATION_CHART: { group: string; rows: [string, string][] }[] = [
  {
    group: 'vowels',
    rows: [
      ['a', 'ಅ'], ['aa / A', 'ಆ'], ['i', 'ಇ'], ['ii / ee / I', 'ಈ'], ['u', 'ಉ'], ['uu / oo / U', 'ಊ'],
      ['Ru', 'ಋ'], ['e', 'ಎ'], ['E', 'ಏ'], ['ai', 'ಐ'], ['o', 'ಒ'], ['O', 'ಓ'], ['au', 'ಔ'],
      ['M', 'ಂ'], ['H', 'ಃ'],
    ],
  },
  {
    group: 'consonants',
    rows: [
      ['k', 'ಕ'], ['kh', 'ಖ'], ['g', 'ಗ'], ['gh', 'ಘ'], ['~g', 'ಙ'],
      ['ch', 'ಚ'], ['Ch', 'ಛ'], ['j', 'ಜ'], ['jh', 'ಝ'], ['~j', 'ಞ'],
      ['T', 'ಟ'], ['Th', 'ಠ'], ['D', 'ಡ'], ['Dh', 'ಢ'], ['N', 'ಣ'],
      ['t', 'ತ'], ['th', 'ಥ'], ['d', 'ದ'], ['dh', 'ಧ'], ['n', 'ನ'],
      ['p', 'ಪ'], ['ph', 'ಫ'], ['b', 'ಬ'], ['bh', 'ಭ'], ['m', 'ಮ'],
      ['y', 'ಯ'], ['r', 'ರ'], ['l', 'ಲ'], ['v / w', 'ವ'], ['sh', 'ಶ'],
      ['Sh', 'ಷ'], ['s', 'ಸ'], ['h', 'ಹ'], ['L', 'ಳ'], ['x / ksh', 'ಕ್ಷ'], ['jn', 'ಜ್ಞ'],
    ],
  },
];
