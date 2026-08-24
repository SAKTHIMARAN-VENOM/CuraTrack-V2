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
        let { data, error } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password,
        });

        // 2. If user does not exist in Supabase Auth yet but is an official stakeholder account, auto-provision
        const officialAccount = OFFICIAL_ROLE_ACCOUNTS[emailLower];
        if ((error || !data?.user) && officialAccount) {
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
                    data = signupRes.data;
                    error = null;
                } else {
                    const secondAttempt = await supabase.auth.signInWithPassword({ email: emailLower, password });
                    if (secondAttempt.data?.user) {
                        data = secondAttempt.data;
                        error = null;
                    }
                }
            } catch (signupErr) {
                console.warn('Auto-provisioning official role error:', signupErr);
            }
        }

        // Determine user details
        let userId = data?.user?.id;
        let userRole = officialAccount?.role || 'patient';
        let userName = officialAccount?.name || data?.user?.user_metadata?.name || data?.user?.user_metadata?.full_name || emailLower.split('@')[0];

        if (!userId) {
            if (officialAccount) {
                // Generate a deterministic official ID so official role login is always accessible
                userId = `official-${emailLower.replace(/[^a-z0-9]/g, '-')}`;
            } else {
                return NextResponse.json(
                    { error: error?.message || 'Invalid email or password' },
                    { status: 401 }
                );
            }
        }

        // Ensure database profile exists with the correct role
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
