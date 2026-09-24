import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const devAuth = request.cookies.get('viracis_dev_auth')?.value === 'authenticated'
  const cookieEmail = request.cookies.get('viracis_user_email')?.value

  let user = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                delete options.maxAge
                delete options.expires
                request.cookies.set(name, value)
              })
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) => {
                delete options.maxAge
                delete options.expires
                supabaseResponse.cookies.set(name, value, options)
              })
            },
          },
        }
      )

      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (e) {
      console.error('Middleware Supabase error:', e)
    }
  }

  const host = request.headers.get('host') || ''
  const isViracisDomain = host.includes('viracis.com')
  const domain = isViracisDomain ? '.viracis.com' : undefined

  // If user is authenticated via Supabase session, sync the tenant cookies
  if (user?.email) {
    if (!cookieEmail) {
      supabaseResponse.cookies.set('viracis_user_email', user.email, {
        path: '/',
        domain,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
    if (!devAuth) {
      supabaseResponse.cookies.set('viracis_dev_auth', 'authenticated', {
        path: '/',
        domain,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
  }

  const isAuthenticated = devAuth || !!cookieEmail || !!user

  // Protect the dashboard route: redirect to /login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
