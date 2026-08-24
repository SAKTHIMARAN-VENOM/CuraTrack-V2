import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OFFICIAL_ROLE_ACCOUNTS: Record<string, { role: string; name: string }> = {
    'facility@curatrack.com': { role: 'facility_manager', name: 'Anil Deshmukh (Hospital Ops)' },
    'pharma@curatrack.com': { role: 'facility_manager', name: 'R. Verma (Pharmacist)' },
    'doctor@curatrack.com': { role: 'doctor', name: 'Dr. David Ross' },
    'dr.david@curatrack.com': { role: 'doctor', name: 'Dr. David Ross' },
    'dr.thorne@curatrack.com': { role: 'doctor', name: 'Dr. David Ross' },
    'asha@curatrack.com': { role: 'fhw', name: 'Sunita Tai (ASHA)' },
    'fhw@curatrack.com': { role: 'fhw', name: 'Sunita Tai (ASHA)' },
    'admin@curatrack.com': { role: 'admin', name: 'District Health Administrator' },
    'patient@curatrack.com': { role: 'patient', name: 'Kavita Bai' },
};

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

        // 1. Attempt Supabase Auth Sign In
        const signInRes = await supabase.auth.signInWithPassword({
            email: emailLower,
            password,
        });

        let authUser = signInRes.data?.user;
        let authError = signInRes.error;

        // 2. If user does not exist in Supabase Auth yet but is an official stakeholder account, auto-provision
        const officialAccount = OFFICIAL_ROLE_ACCOUNTS[emailLower];
        if (!authUser && officialAccount) {
            try {
                // Try signing up the official account in Supabase
                const signupRes = await supabase.auth.signUp({
                    email: emailLower,
                    password,
                    options: {
                        data: {
                            name: officialAccount.name,
                            role: officialAccount.role,
                        }
                    }
                });

                if (signupRes.data?.user) {
                    authUser = signupRes.data.user;
                    authError = null;
                } else {
                    const secondAttempt = await supabase.auth.signInWithPassword({ email: emailLower, password });
                    if (secondAttempt.data?.user) {
                        authUser = secondAttempt.data.user;
                        authError = null;
                    }
                }
            } catch (signupErr) {
                console.warn('Auto-provisioning official role error:', signupErr);
            }
        }

        // Determine user details
        let userId = authUser?.id;
        let userRole = officialAccount?.role || 'patient';
        let userName = officialAccount?.name || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || emailLower.split('@')[0];

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const OFFICIAL_UUID_MAP: Record<string, string> = {
            'facility@curatrack.com': '00000000-0000-4000-a000-000000000001',
            'pharma@curatrack.com': '00000000-0000-4000-a000-000000000002',
            'doctor@curatrack.com': '00000000-0000-4000-a000-000000000003',
            'dr.david@curatrack.com': '00000000-0000-4000-a000-000000000004',
            'dr.thorne@curatrack.com': '00000000-0000-4000-a000-000000000005',
            'asha@curatrack.com': '00000000-0000-4000-a000-000000000006',
            'fhw@curatrack.com': '00000000-0000-4000-a000-000000000007',
            'admin@curatrack.com': '00000000-0000-4000-a000-000000000008',
            'patient@curatrack.com': '00000000-0000-4000-a000-000000000009',
        };

        if (!userId) {
            if (officialAccount) {
                // Check if official user already exists by email
                try {
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id, name, role')
                        .eq('email', emailLower)
                        .maybeSingle();
                    if (existingProfile?.id) {
                        userId = existingProfile.id;
                        userRole = existingProfile.role || userRole;
                        userName = existingProfile.name || userName;
                    }
                } catch {}

                if (!userId) {
                    userId = OFFICIAL_UUID_MAP[emailLower] || '00000000-0000-4000-a000-000000000099';
                }
            } else {
                return NextResponse.json(
                    { error: authError?.message || 'Invalid email or password' },
                    { status: 401 }
                );
            }
        }

        const isUuid = Boolean(userId && UUID_REGEX.test(userId));

        // Ensure database profile exists with the correct role
        try {
            let profile = null;
            if (isUuid) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                profile = data;
            } else {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', emailLower)
                    .maybeSingle();
                profile = data;
            }

            if (profile) {
                userRole = profile.role || userRole;
                userName = profile.name || userName;
                if (profile.id && UUID_REGEX.test(profile.id)) {
                    userId = profile.id;
                }
            } else if (isUuid) {
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
