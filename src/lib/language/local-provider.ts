import { BUILTIN_WORDS, SUFFIXES } from '@/lib/kannada/dictionary';
import { BUILTIN_RULES } from './autocorrect';
import type { LanguageProvider, ProofIssue } from './types';

// Below this many words the dictionary is too small to call every unknown word
// a mistake, so only near-misses of known words are flagged.
const STRICT_MODE_MIN_WORDS = 20000;
// Short words sit one edit away from many valid words (ಇದೆ / ಇವೆ), so
// near-miss guessing only applies to longer ones, and only to single-edit
// slips (ಬ/ಭ, ದ/ಧ…): inflected forms are often two edits from their stem.
const NEAR_MISS_MIN_LENGTH = 5;
const NEAR_MISS_DISTANCE = 1;

const KANNADA_WORD = /[ಀ-೿‌‍]+/g;

const words = new Set<string>(BUILTIN_WORDS);
const knownMisspellings = new Map(BUILTIN_RULES.filter((r) => /[ಀ-೿]/.test(r.from)).map((r) => [r.from, r.to]));
let extraDictionaryLoaded: Promise<void> | null = null;

/** Merges public/dictionaries/kn.txt into the word list if the file exists. */
export function loadExtraDictionary(): Promise<void> {
  if (!extraDictionaryLoaded) {
    extraDictionaryLoaded = fetch('/dictionaries/kn.txt')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('text/plain') ? res.text() : ''))
      .then((text) => {
        for (const line of text.split(/\r?\n/)) {
          const word = line.split('/')[0].trim();
          if (word) words.add(word);
        }
      })
      .catch(() => undefined);
  }
  return extraDictionaryLoaded;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag : 1 + Math.min(prev[j], prev[j - 1], diag);
      diag = tmp;
    }
  }
  return prev[b.length];
}

function splitSuffix(word: string): { stem: string; suffix: string } {
  for (const suffix of SUFFIXES) {
    if (word.length > suffix.length + 1 && word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (words.has(stem)) return { stem, suffix };
    }
  }
  return { stem: word, suffix: '' };
}

export function isKnownWord(word: string, userWords: Set<string>): boolean {
  if (words.has(word) || userWords.has(word)) return true;
  const { suffix } = splitSuffix(word);
  return suffix !== '';
}

export function suggest(word: string, max = 5): string[] {
  const fixed = knownMisspellings.get(word);
  const maxDistance = word.length <= 4 ? 1 : 2;
  const scored: { word: string; dist: number }[] = [];
  for (const candidate of words) {
    if (Math.abs(candidate.length - word.length) > maxDistance) continue;
    const dist = levenshtein(word, candidate);
    if (dist > 0 && dist <= maxDistance) scored.push({ word: candidate, dist });
  }
  scored.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word));
  const result = scored.map((s) => s.word);
  if (fixed) result.unshift(fixed);
  return [...new Set(result)].slice(0, max);
}

export function checkParagraph(text: string, userWords: Set<string>): ProofIssue[] {
  const issues: ProofIssue[] = [];
  const strict = words.size >= STRICT_MODE_MIN_WORDS;
  const seen = new Set<string>();
  for (const match of text.matchAll(KANNADA_WORD)) {
    const word = match[0].replace(/[‌‍]/g, '');
    if (word.length < 2 || isKnownWord(word, userWords)) continue;
    const known = knownMisspellings.get(word);
    if (!known && !strict && word.length < NEAR_MISS_MIN_LENGTH) continue;
    const suggestions = suggest(word);
    if (!known && !strict && !suggestions.some((s) => levenshtein(word, s) <= NEAR_MISS_DISTANCE)) continue;
    const key = `${match.index}:${word}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({
      original: match[0],
      offset: match.index,
      suggestions,
      type: 'spelling',
      confidence: known ? 0.95 : 0.5,
    });
  }
  return issues;
}

export class LocalProvider implements LanguageProvider {
  readonly id = 'builtin';

  constructor(private readonly getUserWords: () => Set<string>) {
    void loadExtraDictionary();
  }

  async check(paragraphs: string[]): Promise<ProofIssue[][]> {
    await loadExtraDictionary();
    const userWords = this.getUserWords();
    return paragraphs.map((p) => checkParagraph(p, userWords));
  }
}
