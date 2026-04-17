import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ isAuthenticated: false });
    }

    return NextResponse.json({
        isAuthenticated: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || null,
            picture: user.user_metadata?.avatar_url || null, // Common field in Supabase for OAuth
        },
    });
}

