import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    const curatrackCookie = req.cookies.get('curatrack_auth')?.value;

    let parsedCookieUser: any = null;
    if (curatrackCookie) {
        try {
            parsedCookieUser = JSON.parse(curatrackCookie);
        } catch {}
    }

    const targetId = user?.id || parsedCookieUser?.id;

    if (targetId) {
        let profile: any = null;
        try {
            const { data } = await adminClient.from('profiles').select('*').eq('id', targetId).maybeSingle();
            profile = data;
        } catch {}

        const mergedUser = {
            id: targetId,
            email: user?.email || profile?.email || parsedCookieUser?.email || '',
            name: profile?.name || user?.user_metadata?.name || parsedCookieUser?.name || 'Citizen Patient',
            role: profile?.role || user?.user_metadata?.role || parsedCookieUser?.role || 'patient',
            blood_group: profile?.blood_group || user?.user_metadata?.blood_group || parsedCookieUser?.blood_group || null,
            gender: profile?.gender || user?.user_metadata?.gender || parsedCookieUser?.gender || null,
            age: profile?.age || user?.user_metadata?.age || parsedCookieUser?.age || null,
            phone: profile?.phone || user?.user_metadata?.phone || parsedCookieUser?.phone || null,
            picture: user?.user_metadata?.avatar_url || parsedCookieUser?.picture || null,
        };

        return NextResponse.json({
            isAuthenticated: true,
            user: mergedUser,
        });
    }

    if (parsedCookieUser) {
        return NextResponse.json({
            isAuthenticated: true,
            user: parsedCookieUser,
        });
    }

    return NextResponse.json({ isAuthenticated: false });
}
