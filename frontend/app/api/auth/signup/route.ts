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
        const isDoctorClaim = isOfficialDoctorEmail || Boolean(body.doctorLicenseKey && body.doctorLicenseKey.trim().length > 0) || body.role === 'doctor' || email.toLowerCase().includes('doctor') || email.toLowerCase().includes('dr.');
        const finalRole = isDoctorClaim ? 'doctor' : 'patient';

        const supabase = await createClient();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role: finalRole
                },
            },
        });

        if (error) {
            throw error;
        }

        if (data.user?.id) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                name: name,
                email: email,
                role: finalRole,
                profile_completed: finalRole === 'doctor' ? true : false
            });

            if (finalRole === 'doctor') {
                await supabase.from('doctor_profile').upsert({
                    doctor_id: data.user.id,
                    reg_number: body.doctorLicenseKey || 'DOC-KEY-2025',
                    qualification: 'MBBS, MD',
                    specialization: 'General Medicine',
                    experience_years: 5,
                    hospital_name: 'Metropolitan Health System',
                    department: 'Clinical Care'
                });

                await supabase.from('verification_status').upsert({
                    doctor_id: data.user.id,
                    status: 'verified'
                });
            }
        }

        return NextResponse.json({
            success: true,
            user: { id: data.user?.id, email: data.user?.email, name, role: finalRole },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Signup failed' },
            { status: 400 }
        );
    }
}

