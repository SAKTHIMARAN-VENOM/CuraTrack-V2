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

        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, name, profile_completed')
            .eq('id', data.user.id)
            .maybeSingle();

        const emailLower = email.toLowerCase();
        let userRole = profile?.role || data.user?.user_metadata?.role;

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

        const roleDefaultNames: Record<string, string> = {
            doctor: 'Dr. David Ross (Medical Officer)',
            fhw: 'Sunita Tai (ASHA Worker #402)',
            facility_manager: 'Anil Deshmukh (Facility In-Charge)',
            admin: 'Dr. R. K. Sharma (District Health Officer)',
            patient: 'Kavita Bai (Patient)'
        };

        const userName = profile?.name || data.user.user_metadata?.name || roleDefaultNames[userRole] || 'User';
        const profileCompleted = profile?.profile_completed ?? true;

        if (!profile) {
            // Auto-provision profile row if it doesn't exist yet to prevent downstream 406/null errors
            await supabase.from('profiles').upsert({
                id: data.user.id,
                name: userName,
                email: data.user.email,
                role: userRole,
                profile_completed: profileCompleted
            });

            if (userRole === 'doctor') {
                await supabase.from('doctor_profile').upsert({
                    doctor_id: data.user.id,
                    reg_number: 'DOC-KEY-2025',
                    qualification: 'MBBS, MD',
                    specialization: 'General Medicine',
                    experience_years: 5,
                    hospital_name: 'Nandurbar Sub-District Hospital',
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
            user: { 
                id: data.user.id, 
                email: data.user.email, 
                name: userName,
                role: userRole,
                profile_completed: profileCompleted
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Login failed' },
            { status: 401 }
        );
    }
}
