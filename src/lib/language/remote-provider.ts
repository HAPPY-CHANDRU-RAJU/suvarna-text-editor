import type { IssueType, LanguageProvider, ProofIssue } from './types';

export interface RemoteProviderOptions {
  id: string;
  url: string;
  /** Called per request so short-lived tokens (e.g. a Supabase session) stay fresh. */
  getHeaders: () => Promise<Record<string, string>> | Record<string, string>;
}

const ISSUE_TYPES: IssueType[] = ['spelling', 'grammar', 'style'];

// Third-party APIs are untrusted input: keep only well-formed issues.
function sanitizeIssue(raw: unknown): ProofIssue | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.original !== 'string' || !r.original) return null;
  const suggestions = Array.isArray(r.suggestions)
    ? r.suggestions.filter((s): s is string => typeof s === 'string' && s !== r.original).slice(0, 8)
    : [];
  return {
    original: r.original,
    suggestions,
    type: ISSUE_TYPES.includes(r.type as IssueType) ? (r.type as IssueType) : 'spelling',
    message: typeof r.message === 'string' ? r.message : undefined,
    confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : undefined,
    offset: typeof r.offset === 'number' ? r.offset : undefined,
  };
}

export class RemoteProvider implements LanguageProvider {
  readonly id: string;

  constructor(private readonly options: RemoteProviderOptions) {
    this.id = options.id;
  }

  private async post(body: object, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const headers = await this.options.getHeaders();
    const res = await fetch(this.options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ language: 'kn', ...body }),
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Language API ${res.status}: ${text.slice(0, 200) || res.statusText}`);
    }
    return res.json();
  }

  async check(paragraphs: string[], signal?: AbortSignal): Promise<ProofIssue[][]> {
    const data = await this.post({ action: 'check', paragraphs }, signal);
    const results = Array.isArray(data.results) ? data.results : [];
    return paragraphs.map((_, i) => {
      const entry = results[i] as { issues?: unknown[] } | undefined;
      return (entry?.issues ?? []).map(sanitizeIssue).filter((x): x is ProofIssue => x !== null);
    });
  }

  async synonyms(word: string, context: string, signal?: AbortSignal): Promise<string[]> {
    const data = await this.post({ action: 'synonyms', word, context }, signal);
    return Array.isArray(data.synonyms)
      ? data.synonyms.filter((s): s is string => typeof s === 'string' && s !== word).slice(0, 10)
      : [];
  }
}
