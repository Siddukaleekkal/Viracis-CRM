'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { loginAdminAction } from './actions'

const ADMIN_EMAIL = 'admin@viracis.com'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('viracis.com') && !window.location.hostname.startsWith('app.')) {
        window.location.href = 'https://app.viracis.com/login'
      }

      const params = new URLSearchParams(window.location.search)
      const errParam = params.get('error')
      if (errParam === 'oauth_disabled' || errParam === 'disabled') {
        setError('Public and third-party logins have been disabled. Access is restricted to the administrator.')
      } else if (errParam === 'oauth_failed') {
        setError('Sign-in failed. Please sign in with your administrator credentials.')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanUsername = username.trim()
    const cleanPassword = password.trim()

    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both your administrator username and password.')
      return
    }

    setLoading(true)

    try {
      const res = await loginAdminAction(cleanUsername, cleanPassword)

      if (!res.success) {
        setError(res.error || 'Invalid credentials. Access restricted to administrator.')
        setLoading(false)
        return
      }

      // Sync client-side cookies for cross-subdomain authentication on viracis.com
      const isViracisDomain = typeof window !== 'undefined' && window.location.hostname.includes('viracis.com')
      const domainAttr = isViracisDomain ? '; domain=.viracis.com' : ''
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

      document.cookie = `viracis_dev_auth=authenticated; path=/${domainAttr}; max-age=604800; SameSite=Lax${isSecure}`
      document.cookie = `viracis_user_email=${encodeURIComponent(ADMIN_EMAIL)}; path=/${domainAttr}; max-age=604800; SameSite=Lax${isSecure}`

      // Redirect straight to CRM dashboard
      const targetUrl = isViracisDomain && !window.location.hostname.startsWith('app.')
        ? 'https://app.viracis.com/dashboard/clients'
        : '/dashboard/clients'
      window.location.href = targetUrl
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#090D16] overflow-hidden font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] bg-indigo-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-cyan-500/5 rounded-full blur-[120px]" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[440px] p-6 sm:p-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="https://viracis.com" className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Image
              src="/viracis-logo.png"
              alt="Viracis"
              width={160}
              height={50}
              className="h-10 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
              priority
            />
          </a>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7)] rounded-2xl p-7 sm:p-9 relative">
          
          {/* Admin badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Admin Portal
            </span>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold text-white tracking-tight mb-1.5">
              Sign In to Viracis CRM
            </h1>
            <p className="text-[13px] text-slate-400">
              Restricted portal for authorized system administrators
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-[13px] rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <svg className="w-4 h-4 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-300" htmlFor="username">
                Admin Username or Email
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-inner"
                  placeholder="admin@viracis.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-inner"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-[14px] font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In as Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Secure access advisory */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2.5 text-[12px] text-slate-400">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Single administrator access enforced. Other logins are disabled.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-[12px] text-slate-400">
            Viracis CRM Enterprise Operations • Richmond, VA
          </p>
          <div className="flex items-center justify-center gap-5 text-[12px] text-slate-400">
            <a
              href="https://viracis.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              Terms of Service
            </a>
            <span>•</span>
            <a
              href="https://viracis.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
