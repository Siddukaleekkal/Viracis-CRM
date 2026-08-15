'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTenantConfig, getActiveTenantEmailFromCookie, TENANTS } from '@/lib/tenant'

export default function DashboardPage() {
  const [tenant, setTenant] = useState(TENANTS.viracis)
  const [customerCount, setCustomerCount] = useState(0)
  const [completedRevenue, setCompletedRevenue] = useState(0)
  const [scheduledRevenue, setScheduledRevenue] = useState(0)
  const [quotedRevenue, setQuotedRevenue] = useState(0)
  const [messageCount, setMessageCount] = useState(0)
  const [jobCount, setJobCount] = useState(0)

  useEffect(() => {
    const activeEmail = getActiveTenantEmailFromCookie()
    setTenant(getTenantConfig(activeEmail))
  }, [])

  const loadMetrics = () => {
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      const prefix = currentTenant.storagePrefix

      // Map to hold unique customer/job records to prevent double-counting/stacking across LocalStorage collections
      // Key: normalized customer name (e.g. "robert taylor")
      const recordMap = new Map<string, { status: 'Completed' | 'Scheduled' | 'Quoted'; amount: number }>()

      // 1. Calendar Jobs (primary dispatch events)
      const savedJobs = localStorage.getItem(`${prefix}calendar_jobs`)
      let totalJobsCount = 0
      if (savedJobs) {
        const parsed = JSON.parse(savedJobs)
        totalJobsCount = parsed.length
        parsed.forEach((job: any) => {
          const val = parseFloat((job.amount || '$0').replace(/[^0-9.]/g, '')) || 0
          const key = (job.customer || '').trim().toLowerCase()
          if (key) {
            const status: 'Completed' | 'Scheduled' | 'Quoted' =
              job.status === 'Completed' ? 'Completed' : job.status === 'Confirmed' || job.status === 'Scheduled' ? 'Scheduled' : 'Quoted'
            recordMap.set(key, { status, amount: val })
          }
        })
      }

      // 2. Client Directory
      const savedCust = localStorage.getItem(`${prefix}clients`) || localStorage.getItem(`${prefix}customers`)
      let totalCustomerCount = 0
      if (savedCust) {
        const parsed = JSON.parse(savedCust)
        totalCustomerCount = parsed.length
        parsed.forEach((c: any) => {
          const val = parseFloat((c.totalSpent || '$0').replace(/[^0-9.]/g, '')) || 0
          const key = (c.name || '').trim().toLowerCase()
          if (key) {
            const status: 'Completed' | 'Scheduled' | 'Quoted' =
              c.status === 'Completed' ? 'Completed' : c.status === 'Scheduled' ? 'Scheduled' : 'Quoted'

            if (recordMap.has(key)) {
              const existing = recordMap.get(key)!
              if (c.status === 'Completed' || (c.status === 'Scheduled' && existing.status === 'Quoted')) {
                recordMap.set(key, { status: status, amount: Math.max(val, existing.amount) })
              }
            } else {
              recordMap.set(key, { status: status, amount: val })
            }
          }
        })
      }

      // 3. Map View Pins
      const savedPins = localStorage.getItem(`${prefix}mappins`)
      if (savedPins) {
        const parsed = JSON.parse(savedPins)
        parsed.forEach((p: any) => {
          const val = parseFloat((p.value || '$0').replace(/[^0-9.]/g, '')) || 0
          const key = (p.customer || '').trim().toLowerCase()
          if (key) {
            const status: 'Completed' | 'Scheduled' | 'Quoted' =
              p.status === 'Completed' ? 'Completed' : p.status === 'Scheduled' ? 'Scheduled' : 'Quoted'

            if (recordMap.has(key)) {
              const existing = recordMap.get(key)!
              if (p.status === 'Completed' || (p.status === 'Scheduled' && existing.status === 'Quoted')) {
                recordMap.set(key, { status, amount: Math.max(val, existing.amount) })
              }
            } else {
              recordMap.set(key, { status, amount: val })
            }
          }
        })
      }

      // 4. Invoices
      const savedInv = localStorage.getItem(`${prefix}invoices`)
      if (savedInv) {
        const parsed = JSON.parse(savedInv)
        parsed.forEach((inv: any) => {
          const val = parseFloat((inv.amount || '$0').replace(/[^0-9.]/g, '')) || 0
          const key = (inv.customer || '').trim().toLowerCase()
          if (key) {
            const status: 'Completed' | 'Scheduled' | 'Quoted' =
              inv.status === 'Paid' ? 'Completed' : inv.status === 'Pending' ? 'Scheduled' : 'Quoted'

            if (recordMap.has(key)) {
              const existing = recordMap.get(key)!
              if (inv.status === 'Paid' || existing.status !== 'Completed') {
                recordMap.set(key, { status, amount: Math.max(val, existing.amount) })
              }
            } else {
              recordMap.set(key, { status, amount: val })
            }
          }
        })
      }

      // Sum exact non-stacked revenue totals
      let completedSum = 0
      let scheduledSum = 0
      let quotedSum = 0

      recordMap.forEach((entry) => {
        if (entry.status === 'Completed') {
          completedSum += entry.amount
        } else if (entry.status === 'Scheduled') {
          scheduledSum += entry.amount
        } else if (entry.status === 'Quoted') {
          quotedSum += entry.amount
        }
      })

      setCustomerCount(totalCustomerCount)
      setJobCount(totalJobsCount)
      setCompletedRevenue(completedSum)
      setScheduledRevenue(scheduledSum)
      setQuotedRevenue(quotedSum)
    } catch (e) {
      console.error('Failed to load dashboard metrics from LocalStorage:', e)
    }
  }

  useEffect(() => {
    loadMetrics()

    const handleSync = () => loadMetrics()
    window.addEventListener('storage', handleSync)
    window.addEventListener('wizardwash_pin_added', handleSync)
    window.addEventListener('viracis_pin_added', handleSync)

    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('wizardwash_pin_added', handleSync)
      window.removeEventListener('viracis_pin_added', handleSync)
    }
  }, [])

  const monthlyGoal = 30000
  const totalPipeline = completedRevenue + scheduledRevenue + quotedRevenue
  const goalPercent = Math.min(100, (completedRevenue / monthlyGoal) * 100)

  const metrics = [
    {
      name: 'Completed Rev',
      value: `$${completedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: completedRevenue > 0 ? 'Paid' : '$0',
      subtext: `$${completedRevenue.toFixed(0)} total`,
    },
    {
      name: 'Scheduled Rev',
      value: `$${scheduledRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: scheduledRevenue > 0 ? 'Upcoming' : '$0',
      subtext: `$${scheduledRevenue.toFixed(0)} queued`,
    },
    {
      name: 'Quoted Pipeline',
      value: `$${quotedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: quotedRevenue > 0 ? 'Quoted' : '$0',
      subtext: `$${quotedRevenue.toFixed(0)} quotes`,
    },
    {
      name: 'Dispatches',
      value: jobCount.toString(),
      change: `${jobCount} Jobs`,
      subtext: `${jobCount} field jobs`,
    },
  ]

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto flex flex-col font-sans text-slate-900 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6">
      
      {/* Executive Header - Streamlined for Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            className="h-12 w-auto object-contain rounded-lg shrink-0"
          />
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">{tenant.dashboardTitle}</h1>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">
              System Account: <span className="font-semibold text-slate-800">{tenant.email}</span> • Real-time operational overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Link
            href="/dashboard/clients"
            className="whitespace-nowrap shrink-0 px-4 py-2 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> Client
          </Link>
          <Link
            href="/dashboard/invoices"
            className="whitespace-nowrap shrink-0 px-4 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> Invoice
          </Link>
        </div>
      </div>

      {/* KPI Metrics - Compact 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">{metric.name}</p>
            <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
              <span className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">{metric.value}</span>
            </div>
            <p className="mt-1 text-[10px] sm:text-xs text-slate-500 font-medium">{metric.subtext}</p>
          </div>
        ))}
      </div>

      {/* Analytics & Revenue Pipeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Revenue & Service Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue Pipeline</h2>
              <p className="text-[11px] text-slate-500">Target: ${monthlyGoal.toLocaleString('en-US')}.00 / mo</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {goalPercent.toFixed(1)}% Goal
            </span>
          </div>

          <div className="space-y-3">
            {/* Completed Revenue Bar */}
            <div>
              <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed Jobs
                </span>
                <span className="text-slate-900 font-bold">${completedRevenue.toFixed(0)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${goalPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Scheduled Revenue Bar */}
            <div>
              <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1">
                <span className="text-blue-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Scheduled Jobs
                </span>
                <span className="text-slate-900 font-bold">${scheduledRevenue.toFixed(0)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (scheduledRevenue / monthlyGoal) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Quoted Pipeline Bar */}
            <div>
              <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1">
                <span className="text-amber-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Quoted Estimates
                </span>
                <span className="text-slate-900 font-bold">${quotedRevenue.toFixed(0)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (quotedRevenue / monthlyGoal) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Dispatches</p>
              <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5">{jobCount}</p>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Clients</p>
              <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5">{customerCount}</p>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Total Pipeline</p>
              <p className="text-xs sm:text-base font-extrabold text-emerald-600 mt-0.5">${totalPipeline.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Audit Log / Desktop Activity Feed */}
        <div className="hidden sm:flex bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Audit & Persistence Log</h2>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Auto-Sync
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <p className="font-semibold text-emerald-900">Completed Jobs Revenue Pipeline</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  When a job or account status is updated to <strong>Completed</strong>, its revenue automatically adds to your completed monthly revenue total.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-semibold text-slate-900">Real-Time Event Listener Active</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Updates on Clients, Map Pins, Calendar, or Invoices immediately update this executive dashboard.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-6 text-right">
            <Link href="/dashboard/clients" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Manage Client Directory →
            </Link>
          </div>
        </div>

      </div>

      </div>
    </div>
  )
}
