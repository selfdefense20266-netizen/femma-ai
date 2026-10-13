import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'apple';

function authRedirectUri() {
  // scheme from app.json → femmaai://
  return makeRedirectUri({
    scheme: 'femmaai',
    path: 'auth/callback',
  });
}

async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(String(errorCode));

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  }

  const code = params.code;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
    if (error) throw error;
    return data.session;
  }

  throw new Error('No session returned from the provider. Check Supabase redirect URLs.');
}

/** Browser OAuth via Supabase (Google on all platforms; Apple fallback on Android/web). */
export async function signInWithOAuthProvider(provider: SocialProvider) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const redirectTo = authRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start sign-in. Enable this provider in Supabase Auth.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error(result.type === 'cancel' || result.type === 'dismiss' ? 'Sign-in cancelled.' : 'Sign-in failed.');
  }

  return createSessionFromUrl(result.url);
}

/** Native Sign in with Apple (iOS / iPadOS). Falls back to OAuth elsewhere. */
export async function signInWithApple() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  if (Platform.OS === 'ios') {
    const available = await AppleAuthentication.isAvailableAsync();
    if (available) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      return data.session;
    }
  }

  return signInWithOAuthProvider('apple');
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export function appleSignInAvailable() {
  return Platform.OS === 'ios' || Platform.OS === 'web' || Platform.OS === 'android';
}
