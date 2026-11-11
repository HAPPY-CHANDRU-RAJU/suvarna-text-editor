import type { LanguageProvider, ProofIssue } from './types';

// Adapter for simple per-word spell-check APIs, e.g.
//
//   POST http://localhost:9001/spellcheck   { "word": "wanner" }
//   →                                       { "body": ["winner", "…"] }
//
// A word counts as misspelled when the API returns suggestions that don't
// include the word itself. The request field and the response field (a dotted
// path such as "data.suggestions") are configurable.

export interface WordProviderOptions {
  id: string;
  url: string;
  wordField: string;
  resultField: string;
  getHeaders: () => Promise<Record<string, string>> | Record<string, string>;
}

const WORD = /[ಀ-೿‌‍\p{L}\p{M}]+/gu;
const MAX_CONCURRENT = 6;
const MAX_SUGGESTIONS = 8;

/** Reads a dotted path; a bare array response is accepted as the list itself. */
export function readList(data: unknown, path: string): string[] {
  let value: unknown = data;
  if (!Array.isArray(data)) {
    for (const key of path.split('.').filter(Boolean)) {
      value = value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
    }
  }
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];
}

export class WordListProvider implements LanguageProvider {
  readonly id: string;
  // Successful lookups only, so a failed request is retried next time.
  private cache = new Map<string, Promise<string[]>>();

  constructor(private readonly options: WordProviderOptions) {
    this.id = options.id;
  }

  private lookup(word: string, signal?: AbortSignal): Promise<string[]> {
    let pending = this.cache.get(word);
    if (!pending) {
      pending = (async () => {
        const headers = await this.options.getHeaders();
        const res = await fetch(this.options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ [this.options.wordField]: word }),
          signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Spell-check API ${res.status}: ${text.slice(0, 200) || res.statusText}`);
        }
        return readList(await res.json(), this.options.resultField);
      })();
      this.cache.set(word, pending);
      pending.catch(() => this.cache.delete(word));
    }
    return pending;
  }

  async check(paragraphs: string[], signal?: AbortSignal): Promise<ProofIssue[][]> {
    const occurrences = paragraphs.map((text) =>
      [...text.matchAll(WORD)].filter((m) => m[0].length > 1).map((m) => ({ word: m[0], offset: m.index ?? 0 })),
    );
    const unique = [...new Set(occurrences.flat().map((o) => o.word))];

    const results = new Map<string, string[]>();
    let next = 0;
    const worker = async () => {
      while (next < unique.length) {
        const word = unique[next++];
        results.set(word, await this.lookup(word, signal));
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, unique.length) }, worker));

    return occurrences.map((list) =>
      list.flatMap(({ word, offset }) => {
        const suggestions = results.get(word) ?? [];
        if (suggestions.length === 0 || suggestions.includes(word)) return [];
        return [{ original: word, offset, suggestions: suggestions.slice(0, MAX_SUGGESTIONS), type: 'spelling' as const }];
      }),
    );
  }
}
