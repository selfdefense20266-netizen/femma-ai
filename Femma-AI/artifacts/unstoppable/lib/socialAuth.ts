import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'apple';

function authRedirectUri() {
  // Native builds must return to the app scheme — never localhost.
  // Web can use the current origin via makeRedirectUri.
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return 'femmaai://auth/callback';
  }
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

// Google OAuth client IDs (Google Cloud Console -> Credentials). The WEB client ID is the one set in
// Supabase -> Auth -> Providers -> Google; the id token is issued for it, so Supabase accepts it.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
let googleConfigured = false;

function nativeGoogleAvailable() {
  if (Platform.OS === 'android') return Boolean(GOOGLE_WEB_CLIENT_ID);
  if (Platform.OS === 'ios') return Boolean(GOOGLE_WEB_CLIENT_ID && GOOGLE_IOS_CLIENT_ID);
  return false;
}

function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
  });
  googleConfigured = true;
}

/**
 * Native Google Sign-In: Google's own account sheet (shows the app name, no browser and no redirect back),
 * then the Google id token is exchanged for a Supabase session. Web, or missing client IDs, use browser OAuth.
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  if (!nativeGoogleAvailable()) return signInWithOAuthProvider('google');

  configureGoogle();
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new Error('Sign-in cancelled.');
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token. Check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
    return data.session;
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) throw new Error('Sign-in cancelled.');
      if (err.code === statusCodes.IN_PROGRESS) throw new Error('Google sign-in is already open.');
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services are not available on this device.');
      }
      // Android DEVELOPER_ERROR: package / SHA-1 missing in Google Cloud (often Play App Signing SHA-1).
      // Fall back to browser OAuth so sign-in still works while native setup is incomplete.
      if (String(err.code) === '10' || /DEVELOPER_ERROR/i.test(String(err.message))) {
        return signInWithOAuthProvider('google');
      }
    }
    throw err;
  }
}

/** Clear the native Google account so the next "Continue with Google" shows the account picker again. */
export async function signOutGoogle() {
  if (!nativeGoogleAvailable()) return;
  try {
    configureGoogle();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device.
  }
}

export function appleSignInAvailable() {
  return Platform.OS === 'ios' || Platform.OS === 'web' || Platform.OS === 'android';
}
