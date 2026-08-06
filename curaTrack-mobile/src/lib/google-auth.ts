import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

/**
 * Direct Google OpenID Connect ID Token authentication via system browser.
 * Requests id_token directly from Google accounts, bypassing external web redirects (localhost:3000),
 * and exchanges the ID token with Supabase natively.
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  const signInWithGooglePKCE = async () => {
    try {
      const res = await promptAsync();
      if (res?.type === 'success' && res.params?.id_token) {
        const idToken = res.params.id_token;
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) throw error;
        return { user: data.user, error: null };
      }
      return { user: null, error: new Error('Google Sign-In was cancelled.') };
    } catch (err: any) {
      return { user: null, error: err };
    }
  };

  return { request, response, signInWithGooglePKCE };
}
