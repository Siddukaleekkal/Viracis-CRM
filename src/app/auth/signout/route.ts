import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function handleSignOut(request: Request) {
  const cookieStore = await cookies()
  const headerList = await headers()
  const host = headerList.get('host') || ''
  const isViracisDomain = host.includes('viracis.com')
  const domain = isViracisDomain ? '.viracis.com' : undefined

  // Delete cookies across domain and path
  cookieStore.set('viracis_dev_auth', '', { path: '/', domain, maxAge: 0 })
  cookieStore.set('viracis_user_email', '', { path: '/', domain, maxAge: 0 })
  cookieStore.delete('viracis_dev_auth')
  cookieStore.delete('viracis_user_email')

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (e) {
    console.error('Sign out error:', e)
  }

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}
