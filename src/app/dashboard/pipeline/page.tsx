'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([])
  const [isPipelineRunning, setIsPipelineRunning] = useState(false)
  const [isOutreachRunning, setIsOutreachRunning] = useState(false)
  const [pipelineLog, setPipelineLog] = useState<string[]>([])

  const loadLiveLeads = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    
    if (data) {
      const formatted = data.map((dbLead: any) => ({
        id: dbLead.id,
        address: dbLead.property_address,
        owner: dbLead.owner_name,
        score: dbLead.lead_score,
        status: dbLead.status,
        channel: dbLead.owner_email ? 'email' : 'mail'
      }))
      setLeads(formatted)
    }
  }

  useEffect(() => {
    loadLiveLeads()
  }, [])

  const handleRunPipeline = async () => {
    setIsPipelineRunning(true)
    setPipelineLog([])
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setPipelineLog(data.log)
        const newLeads = data.results.map((r: any, i: number) => ({
          id: `new-${i}`,
          address: r.address,
          owner: r.businessName || r.ownerName,
          score: r.score,
          status: 'enriched',
          channel: r.outreachChannel
        }))
        setLeads((prev) => [...prev, ...newLeads])
      } else {
        setPipelineLog(['Error executing pipeline: ' + data.error])
      }
    } catch (error) {
      setPipelineLog(['Fatal error executing pipeline.'])
    }
    setIsPipelineRunning(false)
  }

  const handleRunOutreach = async () => {
    setIsOutreachRunning(true)
    setPipelineLog(['Starting Outreach Phase...'])
    try {
      const res = await fetch('/api/pipeline/outreach', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setPipelineLog(prev => [...prev, ...data.log])
        await loadLiveLeads() // Refresh the board
      } else {
        setPipelineLog(prev => [...prev, 'Error executing outreach: ' + data.error])
      }
    } catch (error) {
      setPipelineLog(prev => [...prev, 'Fatal error executing outreach.'])
    }
    setIsOutreachRunning(false)
  }

  const columns = [
    { id: 'discovered', title: 'Discovered (Raw)' },
    { id: 'enriched', title: 'Enriched (Ready)' },
    { id: 'contacted', title: 'Contacted' },
    { id: 'quoted', title: 'Quoted' },
    { id: 'booked', title: 'Booked' },
  ]

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Lead Pipeline</h1>
          <p className="mt-2 text-sm text-gray-500">
            Track leads as the autonomous engine moves them toward a booked job.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleRunOutreach()}
            disabled={isOutreachRunning || isPipelineRunning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isOutreachRunning ? (
              <>
                <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Emails...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Launch Outreach
              </>
            )}
          </button>
          
          <button 
            onClick={() => handleRunPipeline()}
            disabled={isPipelineRunning || isOutreachRunning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-viracis-navy text-white text-sm font-medium rounded-lg hover:bg-[#122F54] transition-colors disabled:opacity-50"
          >
            {isPipelineRunning ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running Pipeline...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Trigger Nightly Batch
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pipeline Execution Logs */}
      {pipelineLog.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1">
          <p className="text-gray-400 mb-2">// Pipeline Execution Log</p>
          {pipelineLog.map((log, i) => (
            <div key={i}>&gt; {log}</div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.id} className="w-80 shrink-0 bg-gray-100/50 rounded-xl border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 text-sm">{col.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {leads.filter(l => l.status === col.id).length} leads
              </p>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {leads.filter(l => l.status === col.id).map(lead => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200/60 cursor-grab active:cursor-grabbing hover:border-viracis-navy/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">{lead.owner}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      lead.score >= 60 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {lead.score}
                    </span>
                  </div>
                  {lead.address && <p className="text-xs text-gray-500 truncate">{lead.address}</p>}
                  
                  {lead.channel && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-600">
                        {lead.channel === 'email' ? 'Email Queue' : 'Direct Mail Queue'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {leads.filter(l => l.status === col.id).length === 0 && (
                <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-400">No leads</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
