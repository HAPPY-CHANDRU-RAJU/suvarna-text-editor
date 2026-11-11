import { useSyncExternalStore } from 'react';
import { cloudLanguageUrl, config } from '@/config';
import { supabaseAuthHeaders } from '@/services/supabase';
import { buildRuleMap } from './autocorrect';
import { LocalProvider } from './local-provider';
import { RemoteProvider } from './remote-provider';
import { WordListProvider } from './word-provider';
import type { LanguageProvider, LanguageSettings, ProofIssue } from './types';

const STORAGE_KEY = 'suvarna.language.v1';
// Requests are batched; keep each one small enough for a quick response.
const MAX_PARAGRAPHS_PER_REQUEST = 20;

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  provider: config.spellcheckUrl ? 'custom' : cloudLanguageUrl() ? 'cloud' : 'builtin',
  customUrl: config.spellcheckUrl ?? '',
  customFormat: config.spellcheckUrl ? 'word' : 'suvarna',
  customWordField: 'word',
  customResultField: 'body',
  customHeaderName: 'Authorization',
  customHeaderValue: '',
  checkAsYouType: true,
  showGrammar: true,
  autoCorrect: true,
  aiAutoCorrect: false,
  aiAutoCorrectThreshold: 0.9,
  userRules: [],
  userDictionary: [],
};

export type ProofingStatus = 'idle' | 'checking' | 'error';

function loadSettings(): LanguageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LANGUAGE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Storage blocked or corrupt: fall back to defaults.
  }
  return DEFAULT_LANGUAGE_SETTINGS;
}

export function createProvider(settings: LanguageSettings, getUserWords: () => Set<string>): LanguageProvider {
  if (settings.provider === 'cloud') {
    const url = cloudLanguageUrl();
    if (url) return new RemoteProvider({ id: `cloud:${url}`, url, getHeaders: supabaseAuthHeaders });
  }
  if (settings.provider === 'custom' && settings.customUrl) {
    const { customUrl, customHeaderName, customHeaderValue } = settings;
    const getHeaders = () => (customHeaderName && customHeaderValue ? { [customHeaderName]: customHeaderValue } : {});
    if (settings.customFormat === 'word') {
      return new WordListProvider({
        id: `custom:${customUrl}`,
        url: customUrl,
        wordField: settings.customWordField || 'word',
        resultField: settings.customResultField || 'body',
        getHeaders,
      });
    }
    return new RemoteProvider({ id: `custom:${customUrl}`, url: customUrl, getHeaders });
  }
  return new LocalProvider(getUserWords);
}

class LanguageService {
  settings: LanguageSettings = loadSettings();
  status: ProofingStatus = 'idle';
  lastError: string | null = null;
  /** Bumped whenever results or settings change, so editors know to redraw. */
  version = 0;

  private provider: LanguageProvider;
  private rules = buildRuleMap(this.settings.userRules);
  private userWords = new Set(this.settings.userDictionary);
  private ignored = new Set<string>();
  private cache = new Map<string, ProofIssue[]>();
  private inflight = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshot = { settings: this.settings, status: this.status, version: this.version, lastError: this.lastError };

  constructor() {
    this.provider = createProvider(this.settings, () => this.userWords);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.version += 1;
    this.snapshot = { settings: this.settings, status: this.status, version: this.version, lastError: this.lastError };
    this.listeners.forEach((l) => l());
  }

  update(patch: Partial<LanguageSettings>) {
    const providerChanged =
      (patch.provider && patch.provider !== this.settings.provider) ||
      patch.customUrl !== undefined ||
      patch.customFormat !== undefined ||
      patch.customWordField !== undefined ||
      patch.customResultField !== undefined ||
      patch.customHeaderName !== undefined ||
      patch.customHeaderValue !== undefined;
    this.settings = { ...this.settings, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Settings still apply for this session.
    }
    this.rules = buildRuleMap(this.settings.userRules);
    this.userWords = new Set(this.settings.userDictionary);
    if (providerChanged) {
      this.provider = createProvider(this.settings, () => this.userWords);
      this.cache.clear();
      this.lastError = null;
      this.status = 'idle';
    }
    this.emit();
  }

  get providerId() {
    return this.provider.id;
  }

  get autoCorrectRules() {
    return this.rules;
  }

  canSuggestSynonyms() {
    return typeof this.provider.synonyms === 'function';
  }

  isIgnored(word: string) {
    return this.ignored.has(word) || this.userWords.has(word);
  }

  ignoreAll(word: string) {
    this.ignored.add(word);
    this.emit();
  }

  addToDictionary(word: string) {
    if (this.userWords.has(word)) return;
    // Remote results stay valid: the word is filtered out by isIgnored().
    if (this.provider instanceof LocalProvider) this.cache.clear();
    this.update({ userDictionary: [...this.settings.userDictionary, word] });
  }

  addRule(from: string, to: string) {
    const rest = this.settings.userRules.filter((r) => r.from !== from);
    this.update({ userRules: [...rest, { from, to }] });
  }

  /** Cached issues for a paragraph, or undefined when it has not been checked yet. */
  cached(text: string): ProofIssue[] | undefined {
    return this.cache.get(text);
  }

  /** Checks the paragraphs not already cached or in flight. Resolves when done. */
  async request(texts: string[]): Promise<void> {
    const todo = [...new Set(texts)].filter((t) => t.trim() && !this.cache.has(t) && !this.inflight.has(t));
    if (todo.length === 0) return;
    todo.forEach((t) => this.inflight.add(t));
    const provider = this.provider;
    this.status = 'checking';
    this.emit();
    try {
      for (let i = 0; i < todo.length; i += MAX_PARAGRAPHS_PER_REQUEST) {
        const batch = todo.slice(i, i + MAX_PARAGRAPHS_PER_REQUEST);
        const results = await provider.check(batch);
        // Drop results from a provider that was swapped out mid-request.
        if (provider !== this.provider) return;
        batch.forEach((text, j) => this.cache.set(text, results[j] ?? []));
        this.emit();
      }
      this.status = 'idle';
      this.lastError = null;
    } catch (err) {
      this.status = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      todo.forEach((t) => this.inflight.delete(t));
      this.emit();
    }
  }

  async synonyms(word: string, context: string): Promise<string[]> {
    if (!this.provider.synonyms) return [];
    return this.provider.synonyms(word, context);
  }

  /** Used by the settings dialog: runs a one-off check against unsaved settings. */
  async test(settings: LanguageSettings): Promise<ProofIssue[]> {
    const provider = createProvider(settings, () => this.userWords);
    // One Kannada and one English slip, so English-only APIs are exercised too.
    const [issues] = await provider.check(['ನಮಸ್ಕರ, ನಾನು ಕರ್ನಾಟಕದ ವಿದ್ಯಾರ್ತಿ. wanner']);
    return issues ?? [];
  }
}

export const languageService = new LanguageService();

export function useLanguage() {
  return useSyncExternalStore(languageService.subscribe, languageService.getSnapshot);
}
