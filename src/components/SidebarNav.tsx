'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarNavProps {
  activeMessageCount?: number
}

export function SidebarNav({ activeMessageCount = 0 }: SidebarNavProps) {
  const pathname = usePathname()
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null)

  useEffect(() => {
    setOptimisticPath(null)
  }, [pathname])

  const links = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      name: 'Messages',
      href: '/dashboard/messages',
      badge: activeMessageCount > 0 ? activeMessageCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      name: 'Map View',
      href: '/dashboard/map',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.818V8.046a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      name: 'Calendar',
      href: '/dashboard/calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 0v4m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Invoices',
      href: '/dashboard/invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      )
    },
  ]

  return (
    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 font-sans">
      <div className="px-3 mb-2">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">CRM Menu</p>
      </div>
      {links.map((link) => {
        const currentPath = optimisticPath || pathname
        const isActive = currentPath === link.href || (link.href !== '/dashboard' && currentPath.startsWith(link.href))
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={() => setOptimisticPath(link.href)}
            className={`flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700/50'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}>
                {link.icon}
              </span>
              <span>{link.name}</span>
            </div>
            {link.badge !== null && link.badge !== undefined && (
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                isActive ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}>
                {link.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
