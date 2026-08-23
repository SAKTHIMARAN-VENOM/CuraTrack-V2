import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const curatrackCookie = req.cookies.get('curatrack_auth')?.value;

    if (user) {
        return NextResponse.json({
            isAuthenticated: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || null,
                role: user.user_metadata?.role || null,
                picture: user.user_metadata?.avatar_url || null,
            },
        });
    }

    if (curatrackCookie) {
        try {
            const parsed = JSON.parse(curatrackCookie);
            return NextResponse.json({
                isAuthenticated: true,
                user: parsed,
            });
        } catch {}
    }

    return NextResponse.json({ isAuthenticated: false });
}
