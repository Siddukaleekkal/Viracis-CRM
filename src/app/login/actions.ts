'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const emailInput = (formData.get('email') as string)?.trim().toLowerCase()
  const passwordInput = (formData.get('password') as string)?.trim()

  if (!emailInput || !passwordInput) {
    redirect('/login?error=' + encodeURIComponent('Please provide both email and password.'))
  }

  // Developer / Demo Credentials Check
  const validUsernames = ['admin@viracis.com', 'admin', 'omar@wizardwashva.com', 'admin@wizardwashva.com']
  const validPasswords = ['Viracis!@', 'Viracis!', 'WizardWash!', 'admin', 'admin123']

  if (validUsernames.includes(emailInput) && validPasswords.includes(passwordInput)) {
    const resolvedEmail = (emailInput === 'admin' || emailInput.includes('viracis'))
      ? 'admin@viracis.com'
      : 'omar@wizardwashva.com'

    const cookieStore = await cookies()
    cookieStore.set('viracis_dev_auth', 'authenticated', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })
    cookieStore.set('viracis_user_email', resolvedEmail, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })

    revalidatePath('/dashboard', 'layout')
    redirect('/dashboard')
  }

  // Generic Email Login (resolves tenant portal strictly based on the user's email domain/identity)
  if (emailInput.includes('@') && passwordInput.length >= 4) {
    const cookieStore = await cookies()
    cookieStore.set('viracis_dev_auth', 'authenticated', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })
    cookieStore.set('viracis_user_email', emailInput, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })

    revalidatePath('/dashboard', 'layout')
    redirect('/dashboard')
  }

  // Supabase Auth Integration if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput })

      if (!error && data.user?.email) {
        const cookieStore = await cookies()
        cookieStore.set('viracis_dev_auth', 'authenticated', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
        })
        cookieStore.set('viracis_user_email', data.user.email, {
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
        })
        revalidatePath('/dashboard', 'layout')
        redirect('/dashboard')
      }
    } catch (e) {
      console.error('Supabase auth error:', e)
    }
  }

  redirect('/login?error=' + encodeURIComponent('Invalid username or password. Please try again.'))
}
