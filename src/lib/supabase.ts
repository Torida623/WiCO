import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // SSR時（web static出力のプリレンダリング）はwindowがなくAsyncStorageが例外を投げるため未指定にする
    storage: typeof window !== 'undefined' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Reads the current session without creating a new anonymous one, for read-only checks like "is this my post?". */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

let anonSessionPromise: Promise<string> | null = null;

/** Lazily signs in anonymously the first time a public-feed write is needed, and returns the stable per-device auth.uid() used as owner_id in RLS policies. */
export async function ensureAnonSession(): Promise<string> {
  if (!anonSessionPromise) {
    anonSessionPromise = (async () => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) return existing.session.user.id;

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) throw error ?? new Error('匿名サインインに失敗したよ');
      return data.session.user.id;
    })().catch((error) => {
      anonSessionPromise = null;
      throw error;
    });
  }
  return anonSessionPromise;
}
