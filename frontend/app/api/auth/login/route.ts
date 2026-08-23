import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEMO_ACCOUNTS: Record<string, { role: string; name: string }> = {
    'patient@curatrack.in': { role: 'patient', name: 'Kavita Bai (Patient)' },
    'doctor@curatrack.in': { role: 'doctor', name: 'Dr. David Ross (Medical Officer)' },
    'asha@curatrack.in': { role: 'fhw', name: 'Sunita Tai (ASHA Worker #402)' },
    'facility@curatrack.in': { role: 'facility_manager', name: 'Anil Deshmukh (Facility In-Charge)' },
    'admin@curatrack.in': { role: 'admin', name: 'Dr. R. K. Sharma (District Health Officer)' },
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
        const demoConfig = DEMO_ACCOUNTS[emailLower];

        // Determine user role
        let userRole = demoConfig?.role || body.role;
        if (!userRole) {
            if (emailLower.includes('admin')) {
                userRole = 'admin';
            } else if (emailLower.includes('doctor') || emailLower.includes('dr.')) {
                userRole = 'doctor';
            } else if (emailLower.includes('asha') || emailLower.includes('fhw') || emailLower.includes('anm')) {
                userRole = 'fhw';
            } else if (emailLower.includes('facility') || emailLower.includes('pharma')) {
                userRole = 'facility_manager';
            } else {
                userRole = 'patient';
            }
        }

        const userName = demoConfig?.name || (userRole === 'doctor' ? 'Dr. David Ross' : userRole === 'fhw' ? 'Sunita Tai (ASHA #402)' : userRole === 'facility_manager' ? 'Anil Deshmukh (Facility Ops)' : userRole === 'admin' ? 'District Administrator' : 'Kavita Bai');

        const supabase = await createClient();

        // 1. Attempt standard sign-in
        let authUser: any = null;
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailLower,
                password,
            });
            if (data?.user) {
                authUser = data.user;
            } else if (error) {
                // If sign-in failed, attempt signUp to auto-provision in Supabase Auth
                const signUpRes = await supabase.auth.signUp({
                    email: emailLower,
                    password,
                    options: {
                        data: {
                            name: userName,
                            role: userRole,
                        },
                    },
                });

                if (signUpRes.data?.user) {
                    authUser = signUpRes.data.user;
                    // Attempt immediate sign-in with the newly created account
                    const retry = await supabase.auth.signInWithPassword({
                        email: emailLower,
                        password,
                    });
                    if (retry.data?.user) {
                        authUser = retry.data.user;
                    }
                }
            }
        } catch (authErr) {
            console.warn('Supabase remote auth attempt failed (using fallback session):', authErr);
        }

        const userId = authUser?.id || `user-${userRole}-${Date.now()}`;

        // Provision profiles table in database if client is connected
        try {
            if (authUser?.id) {
                await supabase.from('profiles').upsert({
                    id: userId,
                    name: userName,
                    email: emailLower,
                    role: userRole,
                    profile_completed: true
                });

                if (userRole === 'doctor') {
                    await supabase.from('doctor_profile').upsert({
                        doctor_id: userId,
                        reg_number: 'DOC-KEY-2025',
                        qualification: 'MBBS, MD',
                        specialization: 'General Medicine',
                        experience_years: 5,
                        hospital_name: 'Nandurbar Sub-District Hospital',
                        department: 'Clinical Care'
                    });
                    await supabase.from('verification_status').upsert({
                        doctor_id: userId,
                        status: 'verified'
                    });
                }
            }
        } catch (dbErr) {
            console.warn('Profile provisioning fallback:', dbErr);
        }

        const userPayload = {
            id: userId,
            email: emailLower,
            name: userName,
            role: userRole,
            profile_completed: true
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
            { error: error.message || 'Login failed' },
            { status: 401 }
        );
    }
}
