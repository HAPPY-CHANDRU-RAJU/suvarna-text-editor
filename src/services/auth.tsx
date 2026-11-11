import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isCloud } from '@/config';
import { supabase } from './supabase';
import { LocalRepository } from './storage/local';
import { SupabaseRepository } from './storage/supabase';
import type { DocumentRepository } from './storage/types';

export interface AppUser {
  id: string;
  name: string;
  email?: string;
}

interface AuthContextValue {
  mode: 'local' | 'cloud';
  user: AppUser | null;
  loading: boolean;
  repository: DocumentRepository | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  renameLocalUser(name: string): void;
}

const LOCAL_USER_KEY = 'suvarna.localUser';

function loadLocalUser(): AppUser {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fall through to the default guest.
  }
  return { id: 'local', name: 'ಅತಿಥಿ' };
}

function fromSupabase(user: User): AppUser {
  const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User';
  return { id: user.id, name, email: user.email };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(isCloud ? null : loadLocalUser());
  const [loading, setLoading] = useState(isCloud);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? fromSupabase(data.session.user) : null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? fromSupabase(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const repository = useMemo<DocumentRepository | null>(() => {
    if (!user) return null;
    return supabase ? new SupabaseRepository(supabase, user.id) : new LocalRepository(user.id);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: isCloud ? 'cloud' : 'local',
      user,
      loading,
      repository,
      async signIn(email, password) {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, name) {
        if (!supabase) return { needsConfirmation: false };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async sendMagicLink(email) {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
      },
      renameLocalUser(name) {
        if (isCloud) return;
        const next = { id: 'local', name };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(next));
        setUser(next);
      },
    }),
    [user, loading, repository],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
