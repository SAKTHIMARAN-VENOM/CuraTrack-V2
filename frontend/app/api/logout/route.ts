import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut();
    } catch {}

    const response = NextResponse.json({ success: true });
    response.cookies.delete('curatrack_auth');
    return response;
}
