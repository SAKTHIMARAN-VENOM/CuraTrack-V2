/**
 * Google Fit OAuth integration via Supabase OAuth Provider.
 * Explicitly sets redirectTo to 'curatrackmobile://' to bypass default Site URL (localhost:3000).
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleFitAuth() {
  const promptAsync = async () => {
    try {
      const redirectUrl = 'curatrackmobile://';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          scopes: 'https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.sleep.read',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const rawUrl = result.url;
          let accessToken: string | null = null;
          let refreshToken: string | null = null;

          if (rawUrl.includes('#')) {
            const params = new URLSearchParams(rawUrl.split('#')[1]);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
          } else if (rawUrl.includes('?')) {
            const params = new URLSearchParams(rawUrl.split('?')[1]);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
          }

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
        return result;
      }
    } catch (err: any) {
      console.error('Google Fit OAuth Error:', err);
    }
    return { type: 'cancel' };
  };

  return { request: true, response: null, promptAsync };
}

/**
 * Exchange helper.
 */
export async function exchangeGoogleCode(_code: string): Promise<boolean> {
  return true;
}
