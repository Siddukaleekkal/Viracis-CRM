'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getActiveTenantEmailFromCookie, getTenantConfig } from '@/lib/tenant'

interface Message {
  id: string
  sender: 'admin' | 'customer' | 'system'
  text: string
  timestamp: string
}

interface CrmQuickMessageModalProps {
  customerName: string
  customerPhone: string
  onClose: () => void
  onCallClient?: () => void
}

export default function CrmQuickMessageModal({
  customerName,
  customerPhone,
  onClose,
  onCallClient,
}: CrmQuickMessageModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const messageInputRef = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const getPrefix = () => getTenantConfig(getActiveTenantEmailFromCookie()).storagePrefix

  // Load existing conversation or initialize sample thread
  useEffect(() => {
    try {
      const prefix = getPrefix()
      const savedConvsStr = localStorage.getItem(`${prefix}sms_conversations`)
      if (savedConvsStr) {
        const convs = JSON.parse(savedConvsStr)
        const match = convs.find((c: any) => c.customerName.toLowerCase() === customerName.toLowerCase())
        if (match && match.messages) {
          setMessages(match.messages)
          return
        }
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    }

    // Default initial thread if no past history exists
    setMessages([
      {
        id: '1',
        sender: 'system',
        text: `SMS thread active for ${customerName}`,
        timestamp: 'Just now',
      },
      {
        id: '2',
        sender: 'admin',
        text: `Hi ${customerName.split(' ')[0]}! Our technician is en route to your property now.`,
        timestamp: 'Just now',
      },
    ])
  }, [customerName])

  // Scroll to bottom on new message
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync back to localStorage
  const saveThread = (newMessages: Message[]) => {
    setMessages(newMessages)
    try {
      const prefix = getPrefix()
      const savedConvsStr = localStorage.getItem(`${prefix}sms_conversations`)
      let convs = savedConvsStr ? JSON.parse(savedConvsStr) : []
      const existingIdx = convs.findIndex((c: any) => c.customerName.toLowerCase() === customerName.toLowerCase())

      if (existingIdx >= 0) {
        convs[existingIdx].messages = newMessages
        convs[existingIdx].lastActive = 'Just now'
        convs[existingIdx].unreadCount = 0
      } else {
        convs.unshift({
          id: `conv-${Date.now()}`,
          customerName,
          customerPhone,
          avatar: customerName ? customerName.charAt(0).toUpperCase() : 'C',
          lastActive: 'Just now',
          unreadCount: 0,
          messages: newMessages,
        })
      }

      localStorage.setItem(`${prefix}sms_conversations`, JSON.stringify(convs))
    } catch (e) {
      console.error('Failed to save SMS thread:', e)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'admin',
      text: inputMessage.trim(),
      timestamp: timeStr,
    }

    const updated = [...messages, newMsg]
    saveThread(updated)
    setInputMessage('')
  }

  const applyTemplate = (text: string) => {
    setInputMessage(text)
    messageInputRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full h-[90vh] sm:h-[620px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
              {customerName ? customerName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm text-slate-900 truncate leading-tight">{customerName}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                <span className="truncate">{customerPhone}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-semibold">2-Way SMS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCallClient && (
              <button
                type="button"
                onClick={onCallClient}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 transition-colors"
                title="In-App CRM Call"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            )}

            <Link
              href={`/dashboard/messages?customer=${encodeURIComponent(customerName)}`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full border border-slate-200 transition-colors whitespace-nowrap"
            >
              Full Inbox →
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Message Thread Container */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'admin'
                  ? 'items-end'
                  : msg.sender === 'system'
                  ? 'items-center'
                  : 'items-start'
              }`}
            >
              {msg.sender === 'system' ? (
                <span className="my-1 px-3 py-1 bg-slate-200/80 text-slate-600 rounded-full text-[10px] font-bold tracking-tight border border-slate-300/40">
                  {msg.text}
                </span>
              ) : (
                <div className="max-w-[85%] space-y-1">
                  <div
                    className={`p-3 px-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                      msg.sender === 'admin'
                        ? 'bg-slate-900 text-white rounded-br-xs font-medium'
                        : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs font-medium'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <p className={`text-[10px] text-slate-400 font-medium px-1 ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div ref={threadEndRef} />
        </div>

        {/* Quick Templates */}
        <div className="p-2 px-4 bg-slate-100/80 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 pr-1">Templates:</span>
          <button
            type="button"
            onClick={() => applyTemplate("Hi! Confirming our upcoming appointment for your house wash.")}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
          >
            Confirm Job
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("Your invoice has been generated and sent. Thank you!")}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
          >
            Send Invoice Note
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("Our technician is en route to your address now!")}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
          >
            En Route
          </button>
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 px-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            ref={messageInputRef}
            type="text"
            placeholder={`Message ${customerName}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium"
          />
          <button
            type="submit"
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-md shrink-0 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span>Send</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-7-9-7-9 7 9 7zm0 0v-8" />
            </svg>
          </button>
        </form>

      </div>
    </div>
  )
}
