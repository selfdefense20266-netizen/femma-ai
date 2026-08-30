import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEmail, validatePassword } from '@/lib/password';
import { saveMemberPassword, verifyMemberPassword } from '@/lib/memberAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchMemberByEmail, persistAndLoadProfile, saveMemberProfile } from '@/lib/members';

export interface AuthUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  signup: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const LOCAL_USER_KEY = 'fema-ai-app-user';

function errorText(error?: { message?: string; code?: string } | null) {
  return `${error?.code || ''} ${error?.message || ''}`;
}

function isUnconfirmedError(error?: { message?: string; code?: string } | null) {
  return /email_not_confirmed|email not confirmed/i.test(errorText(error));
}

function mapAuthError(message?: string) {
  const msg = message || '';
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password';
  if (/already registered|user already registered/i.test(msg)) {
    return 'An account with this email already exists. Try logging in.';
  }
  return msg || 'Unable to complete that request. Try again.';
}

async function readLocalUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const activateUser = useCallback(async (profile: AuthUser) => {
    await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const resolveSession = useCallback(async (session: Session | null) => {
    if (!session?.user) return;
    const profile = await persistAndLoadProfile(session.user, '', '', true);
    await activateUser(profile);
  }, [activateUser]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          await resolveSession(data.session);
        } else {
          const localUser = await readLocalUser();
          if (mounted && localUser) setUser(localUser);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      if (!session?.user) return;
      resolveSession(session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveSession]);

  const completeAccount = useCallback(
    async (input: {
      id?: string;
      email: string;
      firstName?: string;
      lastName?: string;
      password: string;
    }) => {
      const passwordHash = await saveMemberPassword(input.email, input.password);
      const profile = await saveMemberProfile({
        id: input.id,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      });
      return activateUser(profile);
    },
    [activateUser]
  );

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!isSupabaseConfigured) {
      return { ok: false as const, error: 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.' };
    }
    if (!normalized || !password) {
      return { ok: false as const, error: 'Email and password are required' };
    }
    if (!isValidEmail(normalized)) {
      return { ok: false as const, error: 'Enter a valid email address' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (data.user && !error) {
      const profile = await persistAndLoadProfile(data.user, '', '', true);
      await saveMemberPassword(normalized, password);
      await activateUser(profile);
      return { ok: true as const, user: profile };
    }

    const member = await fetchMemberByEmail(normalized);
    const passwordOk =
      isUnconfirmedError(error) ||
      (await verifyMemberPassword(normalized, password, member?.password_hash));

    if (!passwordOk) {
      return { ok: false as const, error: mapAuthError(error?.message || 'Invalid login credentials') };
    }

    try {
      const profile = await completeAccount({
        id: data.user?.id || member?.id,
        email: normalized,
        firstName: member?.first_name || undefined,
        lastName: member?.last_name || undefined,
        password,
      });
      return { ok: true as const, user: profile };
    } catch (saveError) {
      return {
        ok: false as const,
        error: saveError instanceof Error ? saveError.message : 'Could not save account',
      };
    }
  }, [activateUser, completeAccount]);

  const signup = useCallback(async (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (!isSupabaseConfigured) {
      return { ok: false as const, error: 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.' };
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim().toLowerCase();

    if (!firstName) return { ok: false as const, error: 'First name is required' };
    if (!lastName) return { ok: false as const, error: 'Last name is required' };
    if (!isValidEmail(email)) return { ok: false as const, error: 'Enter a valid email address' };

    const passwordError = validatePassword(input.password);
    if (passwordError) return { ok: false as const, error: passwordError };
    if (input.password !== input.confirmPassword) {
      return { ok: false as const, error: 'Passwords do not match' };
    }

    const existingMember = await fetchMemberByEmail(email);
    const existingSession = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });

    const verifiedByAuth =
      Boolean(existingSession.data.user && !existingSession.error) ||
      isUnconfirmedError(existingSession.error);
    const verifiedByPassword = await verifyMemberPassword(
      email,
      input.password,
      existingMember?.password_hash
    );

    if (existingMember && !verifiedByAuth && !verifiedByPassword) {
      return { ok: false as const, error: 'An account with this email already exists. Try logging in.' };
    }

    try {
      const profile = await completeAccount({
        id: existingSession.data.user?.id || existingMember?.id,
        email,
        firstName,
        lastName,
        password: input.password,
      });
      return { ok: true as const, user: profile };
    } catch (saveError) {
      return {
        ok: false as const,
        error: saveError instanceof Error ? saveError.message : 'Could not save account',
      };
    }
  }, [completeAccount]);

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
      }
    } catch {
      // Local session still clears below.
    }
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    await AsyncStorage.removeItem('fema-ai-app-auth');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
