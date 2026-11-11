const env = import.meta.env;

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, ''),
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY as string | undefined,
  /** Overrides the cloud language endpoint (e.g. http://localhost:8787 for `npm run language-api`). */
  languageApiUrl: (env.VITE_LANGUAGE_API_URL as string | undefined)?.replace(/\/$/, ''),
  /** Default endpoint for a per-word spell-check API (Custom API → word format). */
  spellcheckUrl: (env.VITE_SPELLCHECK_URL as string | undefined)?.trim() || undefined,
};

/** True when Supabase is configured: accounts, cloud documents and sharing are enabled. */
export const isCloud = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export function cloudLanguageUrl(): string | undefined {
  if (config.languageApiUrl) return config.languageApiUrl;
  if (config.supabaseUrl) return `${config.supabaseUrl}/functions/v1/language`;
  return undefined;
}
