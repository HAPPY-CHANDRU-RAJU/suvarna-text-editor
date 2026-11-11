// Contract shared by every proofing provider (built-in, Suvarna cloud, or any
// third-party endpoint). A remote provider speaks this as JSON over HTTP:
//
//   POST <url>  { "action": "check", "language": "kn", "paragraphs": ["…", "…"] }
//            →  { "results": [ { "issues": [ProofIssue, …] }, … ] }   // one per paragraph
//
//   POST <url>  { "action": "synonyms", "language": "kn", "word": "…", "context": "…" }
//            →  { "synonyms": ["…", …] }
//
// See README.md → "Connecting a language API".

export type IssueType = 'spelling' | 'grammar' | 'style';

export interface ProofIssue {
  /** Exact text from the paragraph that is wrong. */
  original: string;
  /** Replacements, best first. */
  suggestions: string[];
  type: IssueType;
  message?: string;
  /** 0–1. Only spelling issues at or above the autocorrect threshold are fixed automatically. */
  confidence?: number;
  /** Optional UTF-16 offset of `original` in the paragraph. When absent the client locates it. */
  offset?: number;
}

export interface LanguageProvider {
  readonly id: string;
  check(paragraphs: string[], signal?: AbortSignal): Promise<ProofIssue[][]>;
  synonyms?(word: string, context: string, signal?: AbortSignal): Promise<string[]>;
}

export type ProviderKind = 'builtin' | 'cloud' | 'custom';

/** `suvarna`: the paragraph contract above. `word`: one POST per word (see word-provider.ts). */
export type CustomApiFormat = 'suvarna' | 'word';

export interface AutoCorrectRule {
  from: string;
  to: string;
}

export interface LanguageSettings {
  provider: ProviderKind;
  customUrl: string;
  customFormat: CustomApiFormat;
  /** Word format only: request field holding the word, and response field (dotted path) with suggestions. */
  customWordField: string;
  customResultField: string;
  customHeaderName: string;
  customHeaderValue: string;
  checkAsYouType: boolean;
  showGrammar: boolean;
  /** Replace typed words from the AutoCorrect list as you type. */
  autoCorrect: boolean;
  /** Apply high-confidence fixes returned by the language API automatically. */
  aiAutoCorrect: boolean;
  aiAutoCorrectThreshold: number;
  userRules: AutoCorrectRule[];
  userDictionary: string[];
}
