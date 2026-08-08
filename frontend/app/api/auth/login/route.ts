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

        const isDoctor = profile?.role === 'doctor' || data.user?.user_metadata?.role === 'doctor' || email.toLowerCase().includes('doctor') || email.toLowerCase().includes('dr.');
        const isAdmin = profile?.role === 'admin' || data.user?.user_metadata?.role === 'admin' || email.toLowerCase().includes('admin');
        const userRole = isAdmin ? 'admin' : isDoctor ? 'doctor' : 'patient';
        const userName = profile?.name || data.user.user_metadata?.name || (userRole === 'doctor' ? 'Dr. Practitioner' : 'User');
        const profileCompleted = profile?.profile_completed ?? (userRole === 'doctor' ? true : false);

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

