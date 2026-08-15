import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const devAuth = request.cookies.get('viracis_dev_auth')?.value === 'authenticated'

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

  const isAuthenticated = devAuth || !!user

  // Protect the dashboard route: redirect to /login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
