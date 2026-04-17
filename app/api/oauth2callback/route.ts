import { getOAuth2Client } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=NoCode', req.url));
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Fetch user profile from Google
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: profile } = await oauth2.userinfo.get();
        
        const cookieStore = await cookies();

        // Store Google tokens for Fit API access
        cookieStore.set('tokens', JSON.stringify(tokens), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        // Store unified session cookie
        const sessionData = JSON.stringify({
            userId: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            authType: 'google',
        });

        cookieStore.set('session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (error) {
        console.error('Error in oauth2callback:', error);
        return NextResponse.redirect(new URL('/login?error=AuthFailed', req.url));
    }
}
