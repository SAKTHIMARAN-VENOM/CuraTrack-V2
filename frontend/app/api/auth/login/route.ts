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
            .single();

        const isDoctor = profile?.role === 'doctor' || email.toLowerCase().includes('doctor') || email.toLowerCase().includes('dr.');
        const isAdmin = profile?.role === 'admin' || email.toLowerCase().includes('admin');
        const userRole = isAdmin ? 'admin' : isDoctor ? 'doctor' : 'patient';
        const profileCompleted = profile?.profile_completed ?? false;

        return NextResponse.json({
            success: true,
            user: { 
                id: data.user.id, 
                email: data.user.email, 
                name: profile?.name || data.user.user_metadata?.name || 'User',
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

