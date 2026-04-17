import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const tokenStr = cookieStore.get('tokens')?.value;

    return NextResponse.json({
        isAuthenticated: !!tokenStr
    });
}
