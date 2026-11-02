import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEmail, validatePassword } from '@/lib/password';
import { clearMemberPasswords } from '@/lib/memberAuth';
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { persistAndLoadProfile } from '@/lib/members';
import { clearMemberIdCache } from '@/lib/memberProgress';
import { signInWithApple, signInWithGoogle, signOutGoogle } from '@/lib/socialAuth';
import {
  createConfirmedAccount,
  isAppSignupConflict,
  isAppSignupUnavailable,
  isUnconfirmedError,
} from '@/lib/appSignup';

export interface AuthUser {
  firstName: string;
  lastName: string;
  email: string;
}

type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  loginWithApple: () => Promise<AuthResult>;
  /** Re-read the current Supabase session (e.g. after an OAuth deep link). */
  completeSessionLogin: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const LOCAL_USER_KEY = 'fema-ai-app-user';
const NOT_CONFIGURED =
  'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';
const EXISTS_MESSAGE = 'An account with this email already exists. Try logging in.';

/**
 * Device-local keys that hold one member's personal data. Cleared on logout / account deletion
 * so the next person on this device never sees them.
 */
export const USER_SCOPED_STORAGE_KEYS = [
  LOCAL_USER_KEY,
  'fema-ai-app-auth',
  'cycle_daily_logs',
  'fema-avatar-uri',
  'fema-emergency-contacts',
  'fema-safety-sos',
  'fema-privacy',
];

function mapAuthError(message?: string) {
  const msg = message || '';
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password';
  if (/email rate limit|over_email_send_rate_limit/i.test(msg)) {
    return 'Too many signup emails sent. Wait about an hour, or turn off “Confirm email” in Supabase Auth.';
  }
  if (/email not confirmed|email_not_confirmed/i.test(msg)) {
    return 'Account is not ready yet. Try again in a moment, or contact support.';
  }
  if (/already registered|user already registered|already exists/i.test(msg)) {
    return EXISTS_MESSAGE;
  }
  if (/network|fetch/i.test(msg)) return 'Network error. Check your connection and try again.';
  return msg || 'Unable to complete that request. Try again.';
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function clearUserScopedStorage() {
  try {
    await AsyncStorage.multiRemove(USER_SCOPED_STORAGE_KEYS);
  } catch {
    // ignore
  }
  await clearMemberPasswords();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const activateUser = useCallback(async (profile: AuthUser) => {
    try {
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    } catch {
      // in-memory user still works
    }
    setUser(profile);
    return profile;
  }, []);

  const resolveSession = useCallback(
    async (session: Session | null, names?: { firstName?: string; lastName?: string }) => {
      if (!session?.user) return null;
      if (lastUserIdRef.current && lastUserIdRef.current !== session.user.id) {
        clearMemberIdCache();
      }
      lastUserIdRef.current = session.user.id;
      const profile = await persistAndLoadProfile(
        session.user,
        names?.firstName || '',
        names?.lastName || '',
        Boolean(names?.firstName || names?.lastName)
      );
      return activateUser(profile);
    },
    [activateUser]
  );

  const clearLocalUser = useCallback(async () => {
    lastUserIdRef.current = null;
    clearMemberIdCache();
    try {
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

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
          // Never activate a user without a Supabase session.
          await clearLocalUser();
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (event === 'SIGNED_OUT' && mounted) void clearLocalUser();
        return;
      }
      // Don't await inside the auth callback (supabase-js holds a lock while it runs).
      setTimeout(() => {
        resolveSession(session)
          .catch((error) => {
            console.warn('Could not load member profile for session', error);
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveSession, clearLocalUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalized = email.trim().toLowerCase();
      if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
      if (!normalized || !password) return { ok: false, error: 'Email and password are required' };
      if (!isValidEmail(normalized)) return { ok: false, error: 'Enter a valid email address' };

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
        if (error || !data.session?.user) {
          return { ok: false, error: mapAuthError(error?.message || 'Invalid login credentials') };
        }
        const profile = await resolveSession(data.session);
        if (!profile) return { ok: false, error: 'Sign-in did not complete. Try again.' };
        return { ok: true, user: profile };
      } catch (err) {
        return { ok: false, error: mapAuthError(errorMessage(err, 'Could not sign in.')) };
      }
    },
    [resolveSession]
  );

  const signup = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };

      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const email = input.email.trim().toLowerCase();

      if (!firstName) return { ok: false, error: 'First name is required' };
      if (!lastName) return { ok: false, error: 'Last name is required' };
      if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email address' };

      const passwordError = validatePassword(input.password);
      if (passwordError) return { ok: false, error: passwordError };
      if (input.password !== input.confirmPassword) return { ok: false, error: 'Passwords do not match' };

      const names = { firstName, lastName };

      try {
        // Server creates a confirmed auth user (no confirmation email / OTP) + members row.
        let useFallback = false;
        try {
          await createConfirmedAccount({ email, password: input.password, firstName, lastName });
        } catch (err) {
          if (isAppSignupConflict(err)) return { ok: false, error: EXISTS_MESSAGE };
          if (!isAppSignupUnavailable(err)) {
            return { ok: false, error: mapAuthError(errorMessage(err, 'Unable to create account.')) };
          }
          useFallback = true;
        }

        if (useFallback) {
          // app-signup not deployed — client sign-up; auto-confirm trigger should skip email verification.
          const { data, error } = await supabase.auth.signUp({
            email,
            password: input.password,
            options: {
              data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim() },
            },
          });
          if (error) return { ok: false, error: mapAuthError(error.message) };
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            return { ok: false, error: EXISTS_MESSAGE };
          }
          if (!data.session) {
            return {
              ok: false,
              error: 'Account created. Turn off "Confirm email" in Supabase Auth settings, then log in.',
            };
          }
          const profile = await resolveSession(data.session, names);
          if (!profile) return { ok: false, error: 'Sign-up did not complete. Try logging in.' };
          return { ok: true, user: profile };
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
        if (error || !data.session?.user) {
          if (isUnconfirmedError(error)) {
            return {
              ok: false,
              error: 'Account is not ready yet. Turn off email confirmation in Supabase, then try again.',
            };
          }
          return {
            ok: false,
            error: mapAuthError(error?.message || 'Account created, but sign-in failed. Try logging in.'),
          };
        }

        const profile = await resolveSession(data.session, names);
        if (!profile) return { ok: false, error: 'Sign-up did not complete. Try logging in.' };
        return { ok: true, user: profile };
      } catch (err) {
        return { ok: false, error: mapAuthError(errorMessage(err, 'Could not create account.')) };
      }
    },
    [resolveSession]
  );

  const completeSessionLogin = useCallback(async (): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return { ok: false, error: 'Sign-in did not complete. Try again.' };
      const profile = await resolveSession(data.session);
      if (!profile) return { ok: false, error: 'Sign-in did not complete. Try again.' };
      return { ok: true, user: profile };
    } catch (err) {
      return { ok: false, error: mapAuthError(errorMessage(err, 'Sign-in did not complete.')) };
    }
  }, [resolveSession]);

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      await signInWithGoogle();
      return await completeSessionLogin();
    } catch (err) {
      const message = errorMessage(err, 'Google sign-in failed.');
      if (/cancel/i.test(message)) return { ok: false, error: 'Sign-in cancelled.' };
      return { ok: false, error: mapAuthError(message) };
    }
  }, [completeSessionLogin]);

  const loginWithApple = useCallback(async (): Promise<AuthResult> => {
    try {
      await signInWithApple();
      return await completeSessionLogin();
    } catch (err) {
      const message = errorMessage(err, 'Apple sign-in failed.');
      if (/cancel|ERR_REQUEST_CANCELED/i.test(message)) return { ok: false, error: 'Sign-in cancelled.' };
      return { ok: false, error: mapAuthError(message) };
    }
  }, [completeSessionLogin]);

  const logout = useCallback(async () => {
    void signOutGoogle();
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
    await clearUserScopedStorage();
    await clearLocalUser();
  }, [clearLocalUser]);

  const deleteAccount = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { ok: false, error: 'Your session has expired. Log in again, then retry.' };

      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({}),
        });
      } catch {
        return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
      }

      let body: { ok?: boolean; error?: string } = {};
      try {
        body = (await response.json()) as typeof body;
      } catch {
        body = {};
      }
      if (!response.ok || body.error || body.ok === false) {
        return { ok: false, error: body.error || `Could not delete account (${response.status}).` };
      }

      await logout();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not delete account.') };
    }
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithApple,
      completeSessionLogin,
      logout,
      deleteAccount,
    }),
    [user, loading, login, signup, loginWithGoogle, loginWithApple, completeSessionLogin, logout, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
