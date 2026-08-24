import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL, default to patient dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      const user = session.user
      const defaultName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Citizen Patient'
      let userRole = 'patient'

      // 1. Check/Upsert profile in database defaulting Google OAuth logins to 'patient'
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .maybeSingle()

        if (existingProfile?.role) {
          userRole = existingProfile.role
        } else {
          // Default all Google OAuth sign-ins to patient role
          userRole = 'patient'
          await supabase.from('profiles').upsert({
            id: user.id,
            name: defaultName,
            email: user.email,
            role: 'patient',
            profile_completed: true,
            updated_at: new Date().toISOString(),
          })
        }
      } catch (profErr) {
        console.warn('Google OAuth profile sync warning:', profErr)
      }

      // 2. Check if we received Google provider tokens for Fit/Wearables sync
      if (session.provider_token) {
        const { error: tokenError } = await supabase
          .from('google_tokens')
          .upsert({
              user_id: user.id,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token,
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              token_type: 'Bearer',
              scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read',
          })
          
        if (tokenError) {
            console.error('Error saving Google provider tokens to database:', tokenError)
        }
      }

      const userPayload = {
        id: user.id,
        email: user.email,
        name: defaultName,
        role: userRole,
        profile_completed: true,
      }

      const cleanOrigin = origin.replace('0.0.0.0', 'localhost')
      const targetPath = userRole === 'doctor' ? '/doctor' : userRole === 'fhw' ? '/fhw' : userRole === 'facility_manager' ? '/facility' : userRole === 'admin' ? '/admin' : next
      const response = NextResponse.redirect(`${cleanOrigin}${targetPath}`)

      response.cookies.set('curatrack_auth', JSON.stringify(userPayload), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      })

      return response
    }
  }

  // return the user to an error page with instructions
  const cleanOrigin = origin.replace('0.0.0.0', 'localhost')
  return NextResponse.redirect(`${cleanOrigin}/login?error=OAuthFailed`)
}
