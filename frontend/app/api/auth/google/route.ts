import { getOAuth2Client, SCOPES } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const origin = new URL(req.url).origin;
    const dynamicRedirectUri = `${origin}/api/oauth2callback`;
    const oauth2Client = getOAuth2Client(dynamicRedirectUri);

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [...SCOPES, 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        prompt: 'consent'
    });

    return NextResponse.redirect(url);
}

