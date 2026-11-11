import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, isCloud } from '@/config';

export const supabase: SupabaseClient | null = isCloud
  ? createClient(config.supabaseUrl!, config.supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function supabaseAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? config.supabaseAnonKey!;
  return { Authorization: `Bearer ${token}`, apikey: config.supabaseAnonKey! };
}
