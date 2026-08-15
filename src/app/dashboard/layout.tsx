import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SidebarNav } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const isDevAuth = cookieStore.get('viracis_dev_auth')?.value === 'authenticated'
  const userEmail = cookieStore.get('viracis_user_email')?.value

  const isAuthenticated = isDevAuth || !!userEmail

  if (!isAuthenticated) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar Navigation (Desktop Only) */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 hidden md:flex flex-col">

        {/* Top Left of Screen: Viracis Logo (Hardcoded for all portals) */}
        <div className="h-16 flex items-center px-6 border-b border-slate-900 shrink-0">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/viracis-logo.png"
              alt="Viracis"
              width={160}
              height={48}
              className="h-9 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>
        </div>

        <SidebarNav />

        {/* Sign Out Section */}
        <div className="p-4 border-t border-slate-900">
          <form action="/auth/signout" method="post">
            <button className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 md:hidden sticky top-0 z-40 shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/viracis-logo.png"
              alt="Viracis"
              width={120}
              height={32}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <form action="/auth/signout" method="post">
              <button className="text-[11px] text-red-600 font-bold px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Page Content with padding bottom for mobile nav bar */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </main>
    </div>
  )
}

