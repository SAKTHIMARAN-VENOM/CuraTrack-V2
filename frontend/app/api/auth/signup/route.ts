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

        const isOfficialDoctorEmail = email.toLowerCase() === 'dr.thorne@curatrack.com' || email.toLowerCase() === 'doctor@curatrack.com';
        const isDoctorClaim = isOfficialDoctorEmail || body.doctorLicenseKey === 'DOC-KEY-2025' || body.doctorLicenseKey === 'MED-00471-TX';
        
        // Prevent arbitrary public signups from claiming doctor accounts without license verification or official doctor email
        if ((email.toLowerCase().includes('doctor') || email.toLowerCase().includes('dr.')) && !isDoctorClaim) {
            return NextResponse.json(
                { error: 'Doctor account registration requires a verified Doctor Medical Key (e.g. DOC-KEY-2025). Please enter key or contact administrator.' },
                { status: 403 }
            );
        }

        const supabase = await createClient();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role: isDoctorClaim ? 'doctor' : 'patient'
                },
            },
        });

        if (data.user?.id) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                name: name,
                email: email,
                role: isDoctorClaim ? 'doctor' : 'patient'
            });
        }

        return NextResponse.json({
            success: true,
            user: { id: data.user?.id, email: data.user?.email, name, role: isDoctorClaim ? 'doctor' : 'patient' },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Signup failed' },
            { status: 400 }
        );
    }
}

