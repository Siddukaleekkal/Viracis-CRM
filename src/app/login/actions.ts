'use server'

import { cookies } from 'next/headers'

export async function setAuthCookies(email: string) {
  const cookieStore = await cookies()
  
  cookieStore.set('viracis_dev_auth', 'authenticated', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  cookieStore.set('viracis_user_email', email, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true }
}





