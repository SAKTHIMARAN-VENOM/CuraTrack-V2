import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('session')?.value;

    if (!sessionStr) {
        return NextResponse.json({ isAuthenticated: false });
    }

    try {
        const session = JSON.parse(sessionStr);
        return NextResponse.json({
            isAuthenticated: true,
            user: {
                email: session.email,
                name: session.name,
                picture: session.picture || null,
                authType: session.authType,
            },
        });
    } catch {
        return NextResponse.json({ isAuthenticated: false });
    }
}
