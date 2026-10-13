import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseAnonKey } from '@/lib/supabase';

/**
 * Legacy key: older builds stored client-side password hashes here as a login fallback.
 * Login is now Supabase Auth only — this map is only removed, never read.
 */
const LEGACY_PASSWORD_STORE_KEY = 'fema-ai-member-passwords';

export async function clearMemberPasswords() {
  try {
    await AsyncStorage.removeItem(LEGACY_PASSWORD_STORE_KEY);
  } catch {
    // ignore
  }
}

/** Current user's access token (edge functions require it); anon key only when signed out. */
export async function getAccessToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || supabaseAnonKey;
  } catch {
    return supabaseAnonKey;
  }
}

/** After a 401 — try refreshing the session once. Returns a new token or null. */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}
