import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // 1. Check if we received Google provider tokens
      if (session.provider_token) {
        
        // 2. Save the Google tokens into our google_tokens table for background fit data usage
        const { error: tokenError } = await supabase
          .from('google_tokens')
          .upsert({
              user_id: session.user.id,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token,
              // Google tokens usually last 1 hour. We store this to prompt our refresh logic in lib/google.ts
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              token_type: 'Bearer',
              scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read',
          })
          
        if (tokenError) {
            console.error('Error saving Google provider tokens to database:', tokenError)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=OAuthFailed`)
}
