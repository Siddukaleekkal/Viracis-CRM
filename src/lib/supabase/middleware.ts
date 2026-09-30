import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'admin@viracis.com'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const devAuth = request.cookies.get('viracis_dev_auth')?.value === 'authenticated'
  const cookieEmail = request.cookies.get('viracis_user_email')?.value?.toLowerCase()

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

  // Strict check: only admin@viracis.com is authorized to access the CRM
  const isAdminSession =
    (devAuth && cookieEmail === ADMIN_EMAIL) ||
    (user?.email?.toLowerCase() === ADMIN_EMAIL)

  // Protect the dashboard route: redirect to /login if not authenticated as admin
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAdminSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectResponse = NextResponse.redirect(url)

      // Clear any invalid, non-admin, or stale session cookies
      redirectResponse.cookies.set('viracis_dev_auth', '', { path: '/', domain, maxAge: 0 })
      redirectResponse.cookies.set('viracis_user_email', '', { path: '/', domain, maxAge: 0 })
      return redirectResponse
    }
  }

  // If already authenticated as admin and attempting to view /login, redirect directly to dashboard
  if (request.nextUrl.pathname === '/login' && isAdminSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/clients'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
