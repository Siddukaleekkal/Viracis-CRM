'use server'

import { cookies, headers } from 'next/headers'

const ADMIN_EMAIL = 'admin@viracis.com'
const ADMIN_PASSWORD = 'Sidpav2003!@$'

export async function loginAdminAction(inputUsername: string, inputPassword: string) {
  const cleanUsername = (inputUsername || '').trim().toLowerCase()
  const cleanPassword = (inputPassword || '').trim()

  const isMatchUsername =
    cleanUsername === ADMIN_EMAIL.toLowerCase() || cleanUsername === 'admin'
  const isMatchPassword = cleanPassword === ADMIN_PASSWORD

  if (!isMatchUsername || !isMatchPassword) {
    return {
      success: false,
      error: 'Invalid username or password. Access is restricted to authorized administrators.',
    }
  }

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

  cookieStore.set('viracis_user_email', ADMIN_EMAIL, {
    path: '/',
    domain,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true }
}

export async function setAuthCookies(email: string) {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (cleanEmail !== ADMIN_EMAIL.toLowerCase() && cleanEmail !== 'admin') {
    return { success: false, error: 'Unauthorized user.' }
  }

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

  cookieStore.set('viracis_user_email', ADMIN_EMAIL, {
    path: '/',
    domain,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true }
}
