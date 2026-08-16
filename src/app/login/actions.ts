'use server'

import { cookies, headers } from 'next/headers'

export async function setAuthCookies(email: string) {
  const cookieStore = await cookies()
  const headerList = await headers()
  const host = headerList.get('host') || ''
  const isViracisDomain = host.includes('viracis.com')
  const domain = isViracisDomain ? '.viracis.com' : undefined

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

  return { success: true }
}





