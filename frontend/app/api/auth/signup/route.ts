import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, name, password } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        const rawLicenseKey = body.doctorLicenseKey ? String(body.doctorLicenseKey).trim().toUpperCase() : '';
        const lowerEmail = email.toLowerCase();

        const isOfficialDoctorEmail = lowerEmail === 'dr.thorne@curatrack.com' || lowerEmail === 'doctor@curatrack.com';
        const isDoctorKeyValid = rawLicenseKey === 'DOC-KEY-2025' || rawLicenseKey === 'MED-00471-TX' || rawLicenseKey.startsWith('DOC-') || rawLicenseKey.startsWith('MED-');
        
        const isDoctorClaim = isOfficialDoctorEmail || isDoctorKeyValid || (Boolean(rawLicenseKey) && (lowerEmail.includes('doctor') || lowerEmail.includes('dr.'))) || body.role === 'doctor';

        // Reject doctor email signups without a valid license key
        if ((lowerEmail.includes('doctor') || lowerEmail.includes('dr.')) && !isDoctorClaim) {
            return NextResponse.json(
                { error: 'Doctor account registration requires a verified Doctor Medical Key (e.g. DOC-KEY-2025). Please enter key or contact administrator.' },
                { status: 403 }
            );
        }

        // Reject if user provided an invalid license key
        if (rawLicenseKey.length > 0 && !isDoctorKeyValid && !isOfficialDoctorEmail) {
            return NextResponse.json(
                { error: 'Invalid Doctor License Key. Please enter a valid key (e.g. DOC-KEY-2025).' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        let targetRole = isDoctorClaim ? 'doctor' : 'patient';

        let { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role: targetRole
                },
            },
        });

        // If signUp returns an error, attempt to sign in in case user exists, or return friendly error message
        if (error) {
            const errLower = (error.message || '').toLowerCase();
            
            // Try sign in as fallback
            const signInRes = await supabase.auth.signInWithPassword({ email, password });
            if (signInRes.data?.user) {
                data = signInRes.data;
            } else if (errLower.includes('already registered') || errLower.includes('already exists') || errLower.includes('user_already_exists')) {
                return NextResponse.json(
                    { error: 'An account with this email already exists. Please log in using your password.' },
                    { status: 400 }
                );
            } else if (errLower.includes('rate limit') || errLower.includes('over_email_send_rate_limit')) {
                return NextResponse.json(
                    { error: 'Email confirmation rate limit reached by Supabase auth. If you already created an account, please switch to the Login tab to sign in.' },
                    { status: 429 }
                );
            } else {
                return NextResponse.json(
                    { error: error.message || 'Signup failed' },
                    { status: 400 }
                );
            }
        }

        // Ensure session active if signUp returned user without active session
        if (data?.user && !data?.session) {
            const loginCheck = await supabase.auth.signInWithPassword({ email, password });
            if (loginCheck.data?.user) {
                data = loginCheck.data;
            }
        }

        if (data.user?.id) {
            // Upsert main profile
            await supabase.from('profiles').upsert({
                id: data.user.id,
                name: name,
                email: email,
                role: targetRole,
                profile_completed: true
            });

            // If doctor, populate doctor_profile and verification_status
            if (targetRole === 'doctor') {
                await supabase.from('doctor_profile').upsert({
                    doctor_id: data.user.id,
                    reg_number: rawLicenseKey || 'DOC-KEY-2025',
                    qualification: 'M.D. / M.B.B.S.',
                    specialization: 'General Medicine',
                    experience_years: 5,
                    hospital_name: 'CuraTrack Health Center',
                    department: 'Clinical Care'
                });

                await supabase.from('verification_status').upsert({
                    doctor_id: data.user.id,
                    status: 'verified',
                    verified_by: 'system_auto_verify'
                });
            }
        }

        return NextResponse.json({
            success: true,
            user: { id: data.user?.id, email: data.user?.email || email, name, role: targetRole },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Signup failed' },
            { status: 400 }
        );
    }
}
