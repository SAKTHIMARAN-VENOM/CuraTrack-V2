import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const emailLower = email.trim().toLowerCase();
        const supabase = await createClient();

        // 1. Strict authentication against Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password,
        });

        if (error || !data?.user) {
            return NextResponse.json(
                { error: error?.message || 'Invalid email or password' },
                { status: 401 }
            );
        }

        const authUser = data.user;
        const userId = authUser.id;

        // 2. Fetch authenticated user profile from database to determine authentic role
        let userRole = 'patient';
        let userName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || emailLower.split('@')[0];

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profile) {
                userRole = profile.role || userRole;
                userName = profile.name || userName;
            } else {
                // If profile doesn't exist yet, assign user_metadata role or default to patient
                userRole = authUser.user_metadata?.role || 'patient';
                await supabase.from('profiles').upsert({
                    id: userId,
                    name: userName,
                    email: emailLower,
                    role: userRole,
                    profile_completed: true,
                });
            }
        } catch (dbErr) {
            console.warn('Profile fetch warning:', dbErr);
            userRole = authUser.user_metadata?.role || 'patient';
        }

        const userPayload = {
            id: userId,
            email: emailLower,
            name: userName,
            role: userRole,
            profile_completed: true,
        };

        const response = NextResponse.json({
            success: true,
            user: userPayload,
        });

        // Set persistent auth cookie readable by middleware & server components
        response.cookies.set('curatrack_auth', JSON.stringify(userPayload), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax',
        });

        return response;
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Authentication failed' },
            { status: 401 }
        );
    }
}
