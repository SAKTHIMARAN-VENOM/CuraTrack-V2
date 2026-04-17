import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/users';
import { cookies } from 'next/headers';

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

        const user = await verifyUser(email, password);

        // Store a session cookie (not Google tokens, just user session)
        const cookieStore = await cookies();
        const sessionData = JSON.stringify({
            userId: user.id,
            email: user.email,
            name: user.name,
            authType: 'email',
        });

        cookieStore.set('session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Login failed' },
            { status: 401 }
        );
    }
}
