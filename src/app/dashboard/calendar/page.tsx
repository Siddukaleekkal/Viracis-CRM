'use client'

import { useState, useEffect } from 'react'
import { getTenantConfig, getActiveTenantEmailFromCookie } from '@/lib/tenant'

interface JobEvent {
  id: string
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  dateNum: number
  monthIndex?: number
  year?: number
  time: string
  durationHours: number
  customer: string
  service: string
  crew: 'Truck 1' | 'Truck 2'
  status: 'Confirmed' | 'Pending' | 'Completed'
  amount: string
  address: string
  googleSynced: boolean
}

const initialJobs: JobEvent[] = []

const monthsList = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Helper to calculate current Eastern Time (America/New_York)
function getEasternNow() {
  const now = new Date()
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  return new Date(estString)
}

function getEasternParts() {
  const estDate = getEasternNow()
  return {
    year: estDate.getFullYear(),
    month: estDate.getMonth(), // 0-indexed
    dateNum: estDate.getDate(),
    dayOfWeek: estDate.getDay(),
  }
}

function getShortStreetAddress(fullAddress: string): string {
  if (!fullAddress) return ''
  return fullAddress.split(',')[0].trim()
}

export default function CalendarPage() {
  const [tenant, setTenant] = useState(() => getTenantConfig(getActiveTenantEmailFromCookie()))
  const [jobs, setJobs] = useState<JobEvent[]>(initialJobs)
  const [viewMode, setViewMode] = useState<'Week' | 'Month' | 'Day' | 'Schedule'>('Week')
  const [selectedJob, setSelectedJob] = useState<JobEvent | null>(null)
  
  // Dynamic Eastern Time Initial State
  const initialEst = getEasternParts()
  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialEst.dateNum)
  const [monthIndex, setMonthIndex] = useState<number>(initialEst.month)
  const [currentYear, setCurrentYear] = useState<number>(initialEst.year)
  const [liveEstTime, setLiveEstTime] = useState<string>('')

  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncedCount, setSyncedCount] = useState(0)

  // Live Eastern Time Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      })
      setLiveEstTime(timeString)
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  const daysInCurrentMonth = new Date(currentYear, monthIndex + 1, 0).getDate()
  const firstDayOfMonthIndex = new Date(currentYear, monthIndex, 1).getDay()

  const handlePrevDate = () => {
    if (viewMode === 'Day') {
      if (selectedDayNum > 1) {
        setSelectedDayNum((prev) => prev - 1)
      } else {
        const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1
        const prevYear = monthIndex === 0 ? currentYear - 1 : currentYear
        const daysInPrev = new Date(prevYear, prevMonthIndex + 1, 0).getDate()
        setMonthIndex(prevMonthIndex)
        setCurrentYear(prevYear)
        setSelectedDayNum(daysInPrev)
      }
    } else if (viewMode === 'Week') {
      const prevDate = new Date(currentYear, monthIndex, selectedDayNum - 7)
      setMonthIndex(prevDate.getMonth())
      setCurrentYear(prevDate.getFullYear())
      setSelectedDayNum(prevDate.getDate())
    } else {
      setMonthIndex((prev) => {
        if (prev === 0) {
          setCurrentYear((y) => y - 1)
          return 11
        }
        return prev - 1
      })
    }
  }

  const handleNextDate = () => {
    if (viewMode === 'Day') {
      if (selectedDayNum < daysInCurrentMonth) {
        setSelectedDayNum((prev) => prev + 1)
      } else {
        const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1
        const nextYear = monthIndex === 11 ? currentYear + 1 : currentYear
        setMonthIndex(nextMonthIndex)
        setCurrentYear(nextYear)
        setSelectedDayNum(1)
      }
    } else if (viewMode === 'Week') {
      const nextDate = new Date(currentYear, monthIndex, selectedDayNum + 7)
      setMonthIndex(nextDate.getMonth())
      setCurrentYear(nextDate.getFullYear())
      setSelectedDayNum(nextDate.getDate())
    } else {
      setMonthIndex((prev) => {
        if (prev === 11) {
          setCurrentYear((y) => y + 1)
          return 0
        }
        return prev + 1
      })
    }
  }

  const handleToday = () => {
    const est = getEasternParts()
    setMonthIndex(est.month)
    setCurrentYear(est.year)
    setSelectedDayNum(est.dateNum)
    setViewMode('Week')
  }

  // Load persistent jobs from localStorage on mount & listen for real-time schedule events
  useEffect(() => {
    const loadJobs = () => {
      try {
        const activeEmail = getActiveTenantEmailFromCookie()
        const currentTenant = getTenantConfig(activeEmail)
        setTenant(currentTenant)
        const prefix = currentTenant.storagePrefix

        const saved = localStorage.getItem(`${prefix}calendar_jobs`)
        if (saved) {
          const parsed = JSON.parse(saved)
          const sanitized = parsed.map((j: any, idx: number) => ({
            ...j,
            crew: j.crew === 'Crew Alpha' ? (idx % 2 === 0 ? 'Truck 1' : 'Truck 2') : j.crew === 'Crew Bravo' ? 'Truck 2' : (j.crew || 'Truck 1'),
          }))
          setJobs(sanitized)
          setSyncedCount(sanitized.length)
          localStorage.setItem(`${prefix}calendar_jobs`, JSON.stringify(sanitized))
        }
      } catch (e) {
        console.error('Failed to load calendar jobs:', e)
      }
    }

    loadJobs()
    window.addEventListener('storage', loadJobs)
    window.addEventListener('wizardwash_job_scheduled', loadJobs)
    window.addEventListener('viracis_job_scheduled', loadJobs)

    return () => {
      window.removeEventListener('storage', loadJobs)
      window.removeEventListener('wizardwash_job_scheduled', loadJobs)
      window.removeEventListener('viracis_job_scheduled', loadJobs)
    }
  }, [])

  const saveJobs = (updated: JobEvent[]) => {
    setJobs(updated)
    setSyncedCount(updated.length)
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      localStorage.setItem(`${currentTenant.storagePrefix}calendar_jobs`, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save calendar jobs:', e)
    }
  }

  // Filter Checkboxes for Rigs / Trucks
  const [calendars, setCalendars] = useState({
    truck1: true,
    truck2: true,
    completed: true,
  })

  const [newJob, setNewJob] = useState({
    customer: '',
    service: 'Driveway Power Wash',
    day: 'Thu' as const,
    dateNum: initialEst.dateNum,
    time: '10:00 AM',
    durationHours: 2,
    crew: 'Truck 1' as const,
    amount: '350.00',
    address: '100 Main St, Richmond, VA',
  })

  // Calculate 7 week days (Mon-Sun) dynamically for currently selected date
  const getDynamicWeekDays = () => {
    const base = new Date(currentYear, monthIndex, selectedDayNum)
    const dayOfWeek = base.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const diffToMon = (dayOfWeek + 6) % 7
    const monday = new Date(currentYear, monthIndex, selectedDayNum - diffToMon)

    const dayNames: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ]

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      return {
        day: dayNames[i],
        dateNum: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
      }
    })
  }

  const weekDays = getDynamicWeekDays()

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newJob.customer) return

    const created: JobEvent = {
      id: `J-${Date.now()}`,
      day: newJob.day,
      dateNum: newJob.dateNum,
      monthIndex: monthIndex,
      year: currentYear,
      time: newJob.time,
      durationHours: newJob.durationHours,
      customer: newJob.customer,
      service: newJob.service,
      crew: newJob.crew,
      status: 'Confirmed',
      amount: `$${newJob.amount}`,
      address: newJob.address,
      googleSynced: true,
    }

    saveJobs([...jobs, created])
    setSelectedJob(created)
    setIsScheduleOpen(false)
    setSyncedCount((prev) => prev + 1)
  }

  const exportGoogleCalendarICS = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Viracis Enterprise CRM//Dispatch Schedule Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n')

    jobs.forEach((job) => {
      icsContent += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:${job.id}@viracis.com`,
        `SUMMARY:Viracis Job: ${job.customer} (${job.service})`,
        `DESCRIPTION:Customer: ${job.customer}\\nService: ${job.service}\\nPrice: ${job.amount}\\nCrew: ${job.crew}`,
        `LOCATION:${job.address}`,
        `STATUS:${job.status === 'Completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      ].join('\r\n')
    })

    icsContent += '\r\nEND:VCALENDAR'

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'viracis-dispatch-schedule.ics')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const triggerGoogleSync = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      setSyncedCount(jobs.length)
    }, 1000)
  }

  const filteredJobs = jobs.filter((j) => {
    if (j.crew === 'Truck 1' && !calendars.truck1) return false
    if (j.crew === 'Truck 2' && !calendars.truck2) return false
    if (j.status === 'Completed' && !calendars.completed) return false
    return true
  })

  const estTodayParts = getEasternParts()

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto flex flex-col font-sans text-slate-900 overflow-hidden relative space-y-6">
      
      {/* Enterprise Header Bar - Live Dynamic Eastern Time */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 font-sans">
        
        {/* Row 1: Title & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">Schedule & Dispatch Calendar</h1>
            <div className="flex items-center gap-2.5 mt-0.5 text-[11px] font-medium text-slate-500 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Confirmed</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> Completed</span>
              <span className="flex items-center gap-1 font-semibold text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending</span>
              
              {/* Live Eastern Time Clock */}
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                {liveEstTime || 'Eastern Time (ET)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToday()}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center text-slate-600 border border-slate-200 rounded-xl px-1">
              <button
                onClick={() => handlePrevDate()}
                className="px-2 py-1 hover:bg-slate-100 rounded-md font-bold text-xs transition-colors"
                title="Previous Period"
              >
                ‹
              </button>
              <button
                onClick={() => handleNextDate()}
                className="px-2 py-1 hover:bg-slate-100 rounded-md font-bold text-xs transition-colors"
                title="Next Period"
              >
                ›
              </button>
            </div>
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              + Create Event
            </button>
          </div>
        </div>

        {/* Row 2: View Mode Switcher (Full Width on Mobile) */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 w-full sm:w-auto sm:inline-flex">
          {(['Week', 'Month', 'Day', 'Schedule'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-center transition-all ${
                viewMode === mode ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

      </div>

      {/* Main Grid: Sidebar + Interactive Dynamic Calendar Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto min-h-0 pr-1 pb-6">
        
        {/* Left Sidebar (Desktop Only) */}
        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          
          {/* Mini Month Grid - Dynamic Month Calculation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>{monthsList[monthIndex]} {currentYear}</span>
              <div className="flex gap-1.5 text-slate-600">
                <button
                  onClick={() => handlePrevDate()}
                  className="px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold hover:text-slate-900"
                >
                  ‹
                </button>
                <button
                  onClick={() => handleNextDate()}
                  className="px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold hover:text-slate-900"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-bold">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-700">
              {/* Padding empty cells for first day of month */}
              {Array.from({ length: firstDayOfMonthIndex }).map((_, idx) => (
                <div key={`mini-empty-${idx}`} className="h-7 w-7"></div>
              ))}

              {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                const dayNum = i + 1
                const isSelected = selectedDayNum === dayNum
                const isToday = estTodayParts.year === currentYear && estTodayParts.month === monthIndex && estTodayParts.dateNum === dayNum
                const isInCurrentWeek = weekDays.some((w) => w.dateNum === dayNum && w.month === monthIndex)

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDayNum(dayNum)
                      setViewMode('Day')
                    }}
                    className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : isToday
                        ? 'bg-blue-100 text-blue-800 font-extrabold ring-1 ring-blue-500'
                        : isInCurrentWeek
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calendar Categories Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Dispatch Layers</h3>
            
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={calendars.truck1}
                  onChange={(e) => setCalendars({ ...calendars, truck1: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Truck 1</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={calendars.truck2}
                  onChange={(e) => setCalendars({ ...calendars, truck2: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <span>Truck 2</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={calendars.completed}
                  onChange={(e) => setCalendars({ ...calendars, completed: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Completed Jobs</span>
              </label>
            </div>
          </div>

          {/* Sync Information */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
            <p className="font-semibold text-slate-900">Google Calendar Status</p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Account: <span className="font-semibold text-slate-800">{tenant.email}</span><br/>
              {syncedCount} dispatch jobs synchronized.
            </p>
          </div>

        </div>

        {/* Right Dynamic Interactive Calendar View Container */}
        <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-x-hidden md:overflow-x-auto">
          
          {/* MODE 1: WEEK VIEW */}
          {viewMode === 'Week' && (
            <div className="space-y-4 md:space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 border-b border-slate-100 pb-2">
                <span>Week of {monthsList[weekDays[0].month]} {weekDays[0].dateNum}, {weekDays[0].year}</span>
                <span className="text-[11px] text-slate-400 font-medium">Click any day to expand timeline</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 md:gap-2">
                {weekDays.map((wd) => {
                  const isSelected = selectedDayNum === wd.dateNum && monthIndex === wd.month
                  const isToday = estTodayParts.year === wd.year && estTodayParts.month === wd.month && estTodayParts.dateNum === wd.dateNum
                  const dayJobs = filteredJobs.filter((j) => j.day === wd.day || j.dateNum === wd.dateNum)

                  return (
                    <div key={`${wd.month}-${wd.dateNum}-${wd.day}`} className="flex flex-col border border-slate-200 md:border-none md:border-r md:border-slate-100 last:border-r-0 rounded-xl md:rounded-none overflow-hidden pb-2 md:pb-0">
                      <button
                        onClick={() => {
                          setSelectedDayNum(wd.dateNum)
                          setMonthIndex(wd.month)
                          setCurrentYear(wd.year)
                          setViewMode('Day')
                        }}
                        className="flex md:flex-col items-center justify-between md:justify-center p-3 md:p-0 md:pb-3 border-b md:border-b border-slate-200 group cursor-pointer bg-slate-50 md:bg-transparent md:border-transparent"
                      >
                        <span className="text-xs md:text-[10px] font-semibold uppercase tracking-wider text-slate-700 md:text-slate-400 group-hover:text-slate-900">{wd.day}</span>
                        <span
                          className={`mt-0 md:mt-1 h-7 w-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isToday
                              ? 'bg-blue-100 text-blue-800 font-extrabold ring-1 ring-blue-500'
                              : 'text-slate-800 bg-white md:bg-transparent hover:bg-slate-100'
                          }`}
                        >
                          {wd.dateNum}
                        </span>
                      </button>

                      <div className="p-3 md:p-0 md:pr-1 pt-3 space-y-3 md:min-h-[480px]">
                        {dayJobs.length === 0 ? (
                          <div className="h-full min-h-[60px] md:min-h-[180px] flex items-center justify-center text-[10px] text-slate-400 font-medium italic">
                            No events
                          </div>
                        ) : (
                          dayJobs.map((job) => {
                            const isSelectedJob = selectedJob?.id === job.id
                            const cardBg =
                              job.status === 'Completed'
                                ? 'bg-emerald-700 text-white'
                                : job.status === 'Confirmed'
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-600 text-white'

                            return (
                              <button
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                className={`w-full p-2.5 rounded-lg text-left transition-all shadow-sm ${cardBg} ${
                                  isSelectedJob ? 'ring-2 ring-slate-900 ring-offset-2 font-semibold' : 'hover:opacity-90'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px] opacity-90">
                                  <span>{job.time}</span>
                                  <span className="font-mono text-[9px]">iCal</span>
                                </div>
                                <p className="font-bold text-xs mt-1 truncate">{job.customer}</p>
                                <p className="text-[10px] opacity-90 truncate mt-0.5">{job.service}</p>
                                <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] font-semibold">
                                  <span>{job.crew}</span>
                                  <span>{job.amount}</span>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODE 2: MONTH VIEW */}
          {viewMode === 'Month' && (
            <div className="space-y-3 w-full font-sans">
              <div className="grid grid-cols-7 gap-1 border-b border-slate-200 pb-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {/* Dynamic Empty Cells before 1st of month */}
                {Array.from({ length: firstDayOfMonthIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-11 sm:h-24 bg-slate-50/50 rounded-lg p-1 text-[10px] text-slate-300"></div>
                ))}

                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const dayNum = i + 1
                  const dayJobs = filteredJobs.filter((j) => j.dateNum === dayNum)
                  const isToday = estTodayParts.year === currentYear && estTodayParts.month === monthIndex && estTodayParts.dateNum === dayNum
                  const isSelected = selectedDayNum === dayNum

                  return (
                    <div
                      key={dayNum}
                      onClick={() => {
                        setSelectedDayNum(dayNum)
                      }}
                      className={`h-11 sm:h-24 rounded-xl p-1 sm:p-1.5 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500'
                          : isToday
                          ? 'border-blue-400 bg-blue-50/20'
                          : 'border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] sm:text-xs font-bold ${isToday || isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                          {dayNum}
                        </span>
                        {dayJobs.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            {dayJobs.slice(0, 3).map((j) => (
                              <span
                                key={j.id}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  j.status === 'Completed'
                                    ? 'bg-emerald-500'
                                    : j.status === 'Confirmed'
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                }`}
                              ></span>
                            ))}
                          </span>
                        )}
                      </div>

                      {/* Desktop Job Titles */}
                      <div className="hidden sm:block space-y-1 overflow-y-auto max-h-14">
                        {dayJobs.map((j) => (
                          <div
                            key={j.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedJob(j)
                            }}
                            className={`p-1 rounded text-[9px] font-semibold truncate ${
                              j.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : j.status === 'Confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {j.time.split(' ')[0]} {j.customer.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selected Day Agenda Box */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {monthsList[monthIndex].slice(0, 3)} {selectedDayNum}, {currentYear} Dispatches ({filteredJobs.filter((j) => j.dateNum === selectedDayNum).length})
                  </h3>
                  <button
                    onClick={() => setViewMode('Day')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Full Day View →
                  </button>
                </div>

                {filteredJobs.filter((j) => j.dateNum === selectedDayNum).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No field dispatches scheduled for {monthsList[monthIndex].slice(0, 3)} {selectedDayNum}.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredJobs
                      .filter((j) => j.dateNum === selectedDayNum)
                      .map((job) => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-900">{job.customer}</p>
                            <p className="text-[11px] text-slate-500">{job.service} • {job.time}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{getShortStreetAddress(job.address)} • {job.crew}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              job.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.status === 'Confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: DAY VIEW (DETAILED HOURLY TIMELINE) */}
          {viewMode === 'Day' && (
            <div className="space-y-4 w-full min-w-0">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Day Schedule — {monthsList[monthIndex]} {selectedDayNum}, {currentYear}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Assigned field technicians & client appointments</p>
                </div>
                <button
                  onClick={() => setIsScheduleOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg shadow-xs hover:bg-blue-700 transition-colors"
                >
                  + Add Event
                </button>
              </div>

              {/* Day Time Axis Slots */}
              <div className="space-y-3 divide-y divide-slate-100 pt-2">
                {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map((timeSlot) => {
                  const dayJobs = filteredJobs.filter(
                    (j) => j.dateNum === selectedDayNum && j.time.includes(timeSlot.split(':')[0])
                  )

                  return (
                    <div key={timeSlot} className="pt-3 flex items-start gap-3 sm:gap-4 min-w-0">
                      <span className="w-16 text-xs font-mono text-slate-400 font-semibold shrink-0 pt-1">
                        {timeSlot}
                      </span>
                      
                      <div className="flex-1 min-h-[44px] min-w-0">
                        {dayJobs.length === 0 ? (
                          <div className="border border-dashed border-slate-200 rounded-lg h-10 flex items-center px-4 text-xs text-slate-300">
                            Available time slot
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayJobs.map((j) => (
                              <div
                                key={j.id}
                                onClick={() => setSelectedJob(j)}
                                className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors min-w-0 gap-3 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs text-slate-900 truncate">{j.customer} — {j.service}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{getShortStreetAddress(j.address)} • {j.crew}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-xs text-slate-900">{j.amount}</span>
                                  <span className="block text-[10px] font-semibold text-blue-700 uppercase">{j.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODE 4: SCHEDULE VIEW (CHRONOLOGICAL AGENDA LIST) */}
          {viewMode === 'Schedule' && (
            <div className="space-y-4 w-full min-w-0">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">Agenda & Dispatch List</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chronological list of field appointments</p>
              </div>

              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between min-w-0 gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="text-center w-14 p-2 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                        <span className="block text-[10px] font-bold uppercase text-slate-400">{job.day}</span>
                        <span className="block text-base font-extrabold text-slate-900">{monthsList[monthIndex].slice(0, 3)} {job.dateNum}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 truncate">{job.customer}</h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                              job.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.status === 'Confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{job.service}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{getShortStreetAddress(job.address)} • {job.crew}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-sm text-slate-900">{job.amount}</p>
                      <p className="text-xs text-slate-500 font-semibold">{job.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Selected Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatch Event</span>
                <h2 className="text-base font-bold text-slate-900">{selectedJob.customer}</h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Date & Time</span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedJob.day}, {monthsList[monthIndex]} {selectedJob.dateNum}, {currentYear} • {selectedJob.time}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service</span>
                  <p className="font-semibold text-slate-900 truncate">{selectedJob.service}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Value</span>
                  <p className="font-bold text-emerald-600 text-sm">{selectedJob.amount}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Address</span>
                <p className="font-semibold text-slate-900">{selectedJob.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Crew</span>
                  <p className="font-semibold text-slate-900">{selectedJob.crew}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className="font-bold text-blue-700 uppercase text-[11px] block">{selectedJob.status}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Live Sync Dialog */}
      {isGoogleSyncModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Google Calendar Integration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Synchronize dispatch schedule & field events</p>
              </div>
              <button
                onClick={() => setIsGoogleSyncModalOpen(false)}
                className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Google OAuth Account Active</p>
                  <p className="text-[11px] opacity-80">{tenant.email}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded">
                  CONNECTED
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  iCal Subscription Feed URL
                </label>
                <input
                  type="text"
                  readOnly
                  value="https://calendar.google.com/calendar/ical/admin%40viracis.com/public/basic.ics"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={exportGoogleCalendarICS}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
                >
                  Download .ICS Feed File
                </button>

                <button
                  onClick={triggerGoogleSync}
                  disabled={isSyncing}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-all"
                >
                  {isSyncing ? 'Synchronizing with Google Calendar API...' : 'Force Sync Google Calendar Now'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Schedule Job / Create Event Dialog */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create Dispatch Event</h2>
              <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Client Account</label>
                <input
                  type="text"
                  required
                  placeholder="Client name"
                  value={newJob.customer}
                  onChange={(e) => setNewJob({ ...newJob, customer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Service Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street address, City, State"
                  value={newJob.address}
                  onChange={(e) => setNewJob({ ...newJob, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Day</label>
                  <select
                    value={newJob.day}
                    onChange={(e) => setNewJob({ ...newJob, day: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    {weekDays.map((d) => (
                      <option key={d.day} value={d.day}>{d.day} ({monthsList[monthIndex].slice(0, 3)} {d.dateNum})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="text"
                    value={newJob.time}
                    onChange={(e) => setNewJob({ ...newJob, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Vehicle</label>
                  <select
                    value={newJob.crew}
                    onChange={(e) => setNewJob({ ...newJob, crew: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="Truck 1">Truck 1</option>
                    <option value="Truck 2">Truck 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={newJob.amount}
                    onChange={(e) => setNewJob({ ...newJob, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save & Sync Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
