'use client'

import { useState, useEffect } from 'react'

interface CrmSoftphoneDialerProps {
  customerName: string
  customerPhone: string
  onClose: () => void
}

export default function CrmSoftphoneDialer({ customerName, customerPhone, onClose }: CrmSoftphoneDialerProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(true)
  const [showKeypad, setShowKeypad] = useState(false)

  // Simulate call connection and timer
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setCallState('connected')
    }, 1500)

    return () => clearTimeout(connectTimer)
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [callState])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = () => {
    setCallState('ended')
    setTimeout(() => {
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* CRM VOIP Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Viracis In-App VOIP Line
          </span>
        </div>

        {/* Client Avatar & Details */}
        <div className="space-y-2 pt-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-lg ring-4 ring-slate-800">
            {customerName ? customerName.slice(0, 2).toUpperCase() : 'CL'}
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{customerName || 'Client'}</h2>
          <p className="text-xs font-mono text-slate-400">{customerPhone || '(804) 555-0199'}</p>
        </div>

        {/* Call Status & Timer */}
        <div className="py-2">
          {callState === 'connecting' && (
            <p className="text-xs text-blue-400 font-semibold animate-pulse">
              Connecting via CRM Voice Gateway...
            </p>
          )}
          {callState === 'connected' && (
            <div className="space-y-1">
              <p className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
                {formatTimer(callDuration)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">HD Voice • Encrypted In-App Call</p>
            </div>
          )}
          {callState === 'ended' && (
            <p className="text-xs text-rose-400 font-semibold">
              Call Ended — Logged to Client Timeline
            </p>
          )}
        </div>

        {/* Keypad or In-Call Controls */}
        {showKeypad && callState === 'connected' && (
          <div className="grid grid-cols-3 gap-2 py-2 max-w-[200px] mx-auto text-sm font-bold font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
              <button
                key={key}
                className="h-10 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-slate-200 transition-colors flex items-center justify-center"
              >
                {key}
              </button>
            ))}
          </div>
        )}

        {/* Control Action Buttons */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isMuted ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{isMuted ? '🔇' : '🎙️'}</span>
            <span>{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              showKeypad ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🔢</span>
            <span>Keypad</span>
          </button>

          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isSpeaker ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🔊</span>
            <span>Speaker</span>
          </button>
        </div>

        {/* End Call Button */}
        <div className="pt-4">
          <button
            onClick={handleEndCall}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.27 1.11l-2.37 2.4z"/>
            </svg>
            End CRM Call
          </button>
        </div>

      </div>
    </div>
  )
}
