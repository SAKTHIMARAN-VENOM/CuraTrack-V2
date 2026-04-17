import { getOAuth2Client } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/?error=NoCode', req.url));
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        
        // Store tokens securely in an HttpOnly cookie
        const cookieStore = await cookies();
        cookieStore.set('tokens', JSON.stringify(tokens), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        // Redirect back to dashboard
        return NextResponse.redirect(new URL('/', req.url));
    } catch (error) {
        console.error('Error in oauth2callback:', error);
        return NextResponse.redirect(new URL('/?error=AuthFailed', req.url));
    }
}
