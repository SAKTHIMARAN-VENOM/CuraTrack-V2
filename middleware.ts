import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    
    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/alerts', '/benefits', '/profile', '/telemedicine'];
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // If trying to access a protected route without a session, redirect to login
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If authenticated user tries to access /login, redirect to dashboard
    if (request.nextUrl.pathname.startsWith('/login') && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Auto-redirect authenticated users from landing page to dashboard
    if (request.nextUrl.pathname === '/' && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
