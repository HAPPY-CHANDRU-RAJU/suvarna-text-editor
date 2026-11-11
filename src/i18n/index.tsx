import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, kn, type MessageKey } from './strings';

export type UiLanguage = 'kn' | 'en';
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const STORAGE_KEY = 'suvarna.uiLanguage';
const catalogs: Record<UiLanguage, Record<MessageKey, string>> = { en, kn };

function initialLanguage(): UiLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'kn' || saved === 'en') return saved;
  } catch {
    // Storage blocked: fall through.
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'kn';
}

interface I18nValue {
  lang: UiLanguage;
  setLang(lang: UiLanguage): void;
  t: Translate;
  /** Formats a number with Kannada digits when the UI is in Kannada. */
  n(value: number): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: UiLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Language still changes for this session.
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const catalog = catalogs[lang];
    const formatter = new Intl.NumberFormat(lang === 'kn' ? 'kn-IN-u-nu-knda' : 'en-IN');
    const n = (v: number) => formatter.format(v);
    const t: Translate = (key, vars) => {
      let text = catalog[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, typeof v === 'number' ? n(v) : v);
      return text;
    };
    return { lang, setLang, t, n };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export type { MessageKey };
