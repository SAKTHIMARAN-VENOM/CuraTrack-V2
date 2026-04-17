import { getOAuth2Client, SCOPES } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = getOAuth2Client();
    
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [...SCOPES, 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        prompt: 'consent'
    });

    return NextResponse.redirect(url);
}
