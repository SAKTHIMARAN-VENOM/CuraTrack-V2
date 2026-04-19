import { google } from 'googleapis';
import { createClient } from './supabase/server';

export const getOAuth2Client = (customRedirectUri?: string) => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        customRedirectUri || process.env.REDIRECT_URI
    );
};

export const SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read'
];

export async function getTokensForUser(userId: string) {
    const supabase = await createClient();
    const { data: tokens, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !tokens) {
        return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : null,
        token_type: tokens.token_type,
        scope: tokens.scope,
    });

    // Check if access token is expired (or close to it)
    const isExpired = tokens.expires_at ? new Date(tokens.expires_at).getTime() < Date.now() + 60000 : true;

    if (isExpired && tokens.refresh_token) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            
            // Update the DB with new tokens
            await supabase
                .from('google_tokens')
                .update({
                    access_token: credentials.access_token,
                    expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            oauth2Client.setCredentials(credentials);
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }

    return oauth2Client;
}

