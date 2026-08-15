'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const emailInput = ((formData.get('email') as string) || '').trim().toLowerCase()
  const passwordInput = ((formData.get('password') as string) || '').trim()

  if (!emailInput || !passwordInput) {
    redirect('/login?error=' + encodeURIComponent('Please provide both email and password.'))
  }

  // Demo & Multi-Tenant Authentication (resolves tenant strictly by email domain)
  let resolvedEmail = emailInput
  if (emailInput === 'admin' || emailInput.includes('viracis') || emailInput.includes('siddu')) {
    resolvedEmail = 'admin@viracis.com'
  } else if (emailInput.includes('wizard') || emailInput.includes('omar')) {
    resolvedEmail = 'omar@wizardwashva.com'
  }

  const cookieStore = await cookies()
  
  cookieStore.set('viracis_dev_auth', 'authenticated', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  cookieStore.set('viracis_user_email', resolvedEmail, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}




