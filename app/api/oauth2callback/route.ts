import { getOAuth2Client } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=NoCode', req.url));
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user found in callback');
            return NextResponse.redirect(new URL('/login?error=SessionLost', req.url));
        }

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Fetch user profile from Google
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: profile } = await oauth2.userinfo.get();
        
        // 1. Store/Update Google tokens in Supabase
        const { error: tokenError } = await supabase
            .from('google_tokens')
            .upsert({
                user_id: user.id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                token_type: tokens.token_type,
                scope: tokens.scope,
            });

        if (tokenError) {
            console.error('Error storing Google tokens:', tokenError);
            throw tokenError;
        }

        // 2. Update user profile in Supabase
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                picture: profile.picture,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (profileError) {
            console.warn('Error updating profile picture:', profileError);
            // Non-blocking, continue
        }

        return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (error) {
        console.error('Error in oauth2callback:', error);
        return NextResponse.redirect(new URL('/login?error=AuthFailed', req.url));
    }
}

