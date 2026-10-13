import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { routeAfterAuth } from '@/lib/authRouting';

const URL_WAIT_MS = 4000;

/** useURL() is null on first render — wait for the deep link (or the initial URL) with a timeout. */
function waitForCallbackUrl(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(url);
    };
    const sub = Linking.addEventListener('url', (event) => finish(event.url));
    const timer = setTimeout(() => finish(null), timeoutMs);
    Linking.getInitialURL()
      .then((url) => {
        if (url && /auth\/callback|[?#&](code|access_token|error)=/.test(url)) finish(url);
      })
      .catch(() => undefined);
  });
}

async function completeFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(String(errorCode));
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: String(params.access_token),
      refresh_token: String(params.refresh_token),
    });
    if (error) throw error;
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
    // The code may already have been exchanged by openAuthSessionAsync in lib/socialAuth.ts.
    if (error) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw error;
    }
  }
}

/** Deep-link landing for OAuth: femmaai://auth/callback */
export default function AuthCallbackScreen() {
  const colors = useColors();
  const url = Linking.useURL();
  const { completeSessionLogin } = useAuth();
  const { updateProfile, onboardingCompleted, accountReady } = useApp();
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const urlRef = useRef<string | null>(url);
  urlRef.current = url;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const cancelled = () => !mountedRef.current;

    (async () => {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }
      try {
        const existing = await supabase.auth.getSession();
        if (!existing.data.session) {
          const callbackUrl = urlRef.current || (await waitForCallbackUrl(URL_WAIT_MS)) || urlRef.current;
          if (callbackUrl) await completeFromUrl(callbackUrl);
        }
      } catch (error) {
        console.warn('OAuth callback failed', error);
      }
      if (cancelled()) return;

      const result = await completeSessionLogin();
      if (cancelled()) return;
      if (result.ok) {
        await routeAfterAuth(result.user, { updateProfile, onboardingCompleted, accountReady });
      } else {
        router.replace('/login');
      }
    })().catch(() => {
      if (!cancelled()) router.replace('/login');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.pink} />
    </View>
  );
}
