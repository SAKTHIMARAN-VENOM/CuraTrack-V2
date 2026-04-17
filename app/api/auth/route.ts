import { getOAuth2Client, SCOPES } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = getOAuth2Client();
    
    // Generate an authentication URL
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force to get refresh token
    });

    return NextResponse.redirect(url);
}
