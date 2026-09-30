'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { setAuthCookies } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('viracis.com') && !window.location.hostname.startsWith('app.')) {
        window.location.href = 'https://app.viracis.com/login'
      }

      const params = new URLSearchParams(window.location.search)
      if (params.get('error') === 'oauth_failed') {
        setError('Sign-in could not be completed. Please try again or sign in with your email.')
      } else if (params.get('error') === 'oauth_disabled' || params.get('error') === 'disabled') {
        setError('Login is restricted. Please sign in with your administrator email and password.')
      }
    }
  }, [])

  const handleGoogleLogin = async () => {
    setError('Third-party logins are disabled. Please sign in with your administrator email and password.')
  }

  const handleMicrosoftLogin = async () => {
    setError('Third-party logins are disabled. Please sign in with your administrator email and password.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const emailTrimmed = email.trim().toLowerCase()
    const passwordTrimmed = password.trim()

    if (!emailTrimmed || !passwordTrimmed) {
      setError('Please enter your email address and password.')
      setLoading(false)
      return
    }

    const isValidUser = emailTrimmed === 'admin@viracis.com' || emailTrimmed === 'admin'
    const isValidPassword = passwordTrimmed === 'Sidpav2003!@$'

    if (!isValidUser || !isValidPassword) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const resolvedEmail = 'admin@viracis.com'

    // Set client cookies with domain=.viracis.com for cross-subdomain authentication
    const isViracisDomain = typeof window !== 'undefined' && window.location.hostname.includes('viracis.com')
    const domainAttr = isViracisDomain ? '; domain=.viracis.com' : ''
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

    document.cookie = `viracis_dev_auth=authenticated; path=/${domainAttr}; max-age=604800; SameSite=Lax${isSecure}`
    document.cookie = `viracis_user_email=${encodeURIComponent(resolvedEmail)}; path=/${domainAttr}; max-age=604800; SameSite=Lax${isSecure}`

    try {
      await setAuthCookies(resolvedEmail)
    } catch (e) {
      console.error('Server cookie error:', e)
    }

    // Direct single-step navigation straight to app.viracis.com dashboard
    const targetUrl = isViracisDomain ? 'https://app.viracis.com/dashboard/clients' : '/dashboard/clients'
    window.location.href = targetUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#FAFAFA] overflow-hidden font-sans">
      
      {/* Premium Enterprise Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-slate-900/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[440px] p-6 sm:p-10">
        
        <div className="flex justify-center mb-8">
          <a href="https://viracis.com">
            <Image
              src="/viracis-logo.png"
              alt="Viracis"
              width={160}
              height={50}
              className="h-9 w-auto object-contain hover:opacity-90 transition-opacity"
              priority
            />
          </a>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] rounded-2xl p-8 sm:p-10">
          
          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight mb-1.5">
              Sign in to Viracis
            </h1>
            <p className="text-[14px] text-gray-500">
              Welcome back to your workspace
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 text-red-600 text-[13px] rounded-lg border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* OAuth Providers */}
          <div className="space-y-2.5">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || microsoftLoading || loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-50/90 border border-gray-200 rounded-lg text-[14px] font-medium text-gray-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {googleLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Continue with Microsoft */}
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={googleLoading || microsoftLoading || loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-50/90 border border-gray-200 rounded-lg text-[14px] font-medium text-gray-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {microsoftLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting to Microsoft...</span>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  <span>Continue with Microsoft</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/80" />
            </div>
            <div className="relative px-3 bg-white text-[11px] text-gray-400 font-semibold tracking-wider uppercase">
              Or sign in with email
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-gray-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200/80 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none shadow-sm placeholder:text-gray-400"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-[13px] font-medium text-gray-500 hover:text-slate-900 transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200/80 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none shadow-sm placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-[14px] font-medium rounded-lg shadow-sm hover:bg-gray-800 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-all mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

        </div>

        <div className="mt-7 text-center space-y-4">
          <p className="text-[14px] text-gray-500">
            Don't have an account?{' '}
            <a
              href="https://viracis.com/signup"
              className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700 transition-colors"
            >
              Sign Up
            </a>
          </p>

          <div className="flex items-center justify-center gap-6 text-[13px] text-gray-500">
            <a
              href="https://viracis.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="https://viracis.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
