import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_URL = 'https://pwpbcomeklrxfieaklvq.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cGJjb21la2xyeGZpZWFrbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTcwNDksImV4cCI6MjEwMTY5MzA0OX0.pVxpAV3Qq-4P9-z1_T4j17wYGim3EKu0_00OokyQFKg';

function getValidUrl(urlStr?: string): string {
  if (!urlStr) return DEFAULT_URL;
  const trimmed = urlStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed.includes('placeholder')) return DEFAULT_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch (e) {
    // fallback if invalid URL
  }
  return DEFAULT_URL;
}

function getValidKey(keyStr?: string): string {
  if (!keyStr) return DEFAULT_KEY;
  const trimmed = keyStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'placeholder') return DEFAULT_KEY;
  return trimmed;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getValidKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // getUser(). A simple mistake can make it very hard to debug
  // issues with users being logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/passport') &&
    !request.nextUrl.pathname.startsWith('/call') &&
    !request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/onboarding') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (url.hostname === '0.0.0.0') {
      url.hostname = 'localhost'
    }
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
