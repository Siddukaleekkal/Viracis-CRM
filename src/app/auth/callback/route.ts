import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard/clients'

  if (code) {
    const cookieStore = await cookies()
    const headerList = await headers()
    const host = headerList.get('host') || ''
    const isViracisDomain = host.includes('viracis.com')
    const domain = isViracisDomain ? '.viracis.com' : undefined

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  domain: options.domain || domain,
                })
              })
            } catch {
              // Ignore cookie mutations in read-only contexts
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      const email = data.user.email || ''

      // Set Viracis multi-tenant cookies for seamless cross-subdomain access
      cookieStore.set('viracis_dev_auth', 'authenticated', {
        path: '/',
        domain,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      cookieStore.set('viracis_user_email', email, {
        path: '/',
        domain,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      // If user logs in through apex domain viracis.com, send directly to app.viracis.com
      const targetBase = isViracisDomain && !host.startsWith('app.')
        ? 'https://app.viracis.com'
        : requestUrl.origin

      return NextResponse.redirect(new URL(next, targetBase))
    }

    if (error) {
      console.error('Supabase OAuth exchange error:', error)
    }
  }

  // Redirect to login with error query param if exchange fails or no code
  return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin))
}
