'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTenantConfig, getActiveTenantEmailFromCookie } from '@/lib/tenant'
import CrmSoftphoneDialer from '@/components/CrmSoftphoneDialer'

interface Message {
  id: string
  sender: 'client' | 'admin' | 'system'
  text: string
  timestamp: string
}

interface Conversation {
  id: string
  customerName: string
  customerPhone: string
  unreadCount: number
  lastActive: string
  avatar: string
  messages: Message[]
}

export default function MessagesPage() {
  const [tenant, setTenant] = useState(() => getTenantConfig(getActiveTenantEmailFromCookie()))
  const [callingCustomer, setCallingCustomer] = useState<{ name: string; phone: string } | null>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>('')
  const [inputMessage, setInputMessage] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [customerDirectory, setCustomerDirectory] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load persistent conversations and sync ONLY with active CRM customer list on mount
  useEffect(() => {
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      setTenant(currentTenant)
      const prefix = currentTenant.storagePrefix

      let initialList: Conversation[] = []
      const savedConvStr = localStorage.getItem(`${prefix}conversations`)
      
      if (savedConvStr) {
        initialList = JSON.parse(savedConvStr)
      }

      // Load client directory from localStorage
      const savedCustStr = localStorage.getItem(`${prefix}clients`) || localStorage.getItem(`${prefix}customers`)
      let custs = savedCustStr ? JSON.parse(savedCustStr) : []
      setCustomerDirectory(custs)

      // Only keep conversations for customers that actually exist in the customer directory
      const activeCustomerNames = new Set(custs.map((c: any) => c.name.toLowerCase()))
      initialList = initialList.filter((c) => activeCustomerNames.has(c.customerName.toLowerCase()))

      // Auto-create threads for customers in directory missing from conversations
      custs.forEach((cust: any) => {
        const exists = initialList.some((c) => c.customerName.toLowerCase() === cust.name.toLowerCase())
        if (!exists) {
          initialList.push({
            id: `conv-${cust.id || Date.now()}`,
            customerName: cust.name,
            customerPhone: cust.phone || '(804) 555-0100',
            unreadCount: 0,
            lastActive: 'Active thread',
            avatar: cust.name.charAt(0).toUpperCase(),
            messages: [
              { id: `m-init-${Date.now()}`, sender: 'system', text: `SMS thread active for ${cust.name}`, timestamp: 'Just now' }
            ]
          })
        }
      })

      setConversations(initialList)
      localStorage.setItem(`${prefix}conversations`, JSON.stringify(initialList))

      // Handle URL query parameter targeting specific customer e.g. ?customer=John+Smith
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const targetName = params.get('customer')
        if (targetName) {
          const found = initialList.find((c) => c.customerName.toLowerCase() === targetName.toLowerCase())
          if (found) {
            setActiveConvId(found.id)
            setShowMobileChat(true)
            return
          }
        }
      }

      if (initialList.length > 0 && !activeConvId) {
        setActiveConvId(initialList[0].id)
      }
    } catch (e) {
      console.error('Failed to load conversations:', e)
      setConversations([])
    }
  }, [])

  const saveConversations = (updated: Conversation[]) => {
    setConversations(updated)
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      localStorage.setItem(`${currentTenant.storagePrefix}conversations`, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save conversations:', e)
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || !activeConvId) return

    const sentText = inputMessage.trim()
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: 'admin',
      text: sentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updated = conversations.map((c) => {
      if (c.id === activeConvId) {
        return {
          ...c,
          unreadCount: 0,
          lastActive: 'Just now',
          messages: [...c.messages, newMsg],
        }
      }
      return c
    })

    saveConversations(updated)
    setInputMessage('')

    // Simulate automated client SMS reply after 2 seconds for active demo engagement
    setTimeout(() => {
      const autoReplies = [
        "Received! Thanks for keeping me updated.",
        "Sounds great, looking forward to the service!",
        "Got it, thank you Wizard Wash!",
        "Appreciate the quick response!",
      ]
      const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)]

      const replyMsg: Message = {
        id: `m-reply-${Date.now()}`,
        sender: 'client',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setConversations((prev) => {
        const refreshed = prev.map((c) => {
          if (c.id === activeConvId) {
            return {
              ...c,
              lastActive: 'Just now',
              messages: [...c.messages, replyMsg],
            }
          }
          return c
        })
        try {
          localStorage.setItem('wizardwash_conversations', JSON.stringify(refreshed))
        } catch (err) {}
        return refreshed
      })
    }, 2000)
  }

  const startNewConversation = (cust: any) => {
    const existing = conversations.find((c) => c.customerName.toLowerCase() === cust.name.toLowerCase())
    if (existing) {
      setActiveConvId(existing.id)
    } else {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        customerName: cust.name,
        customerPhone: cust.phone || '(804) 555-0100',
        unreadCount: 0,
        lastActive: 'Just started',
        avatar: cust.name.charAt(0).toUpperCase(),
        messages: [
          { id: `m-start-${Date.now()}`, sender: 'system', text: `Thread started with ${cust.name}`, timestamp: 'Just now' }
        ]
      }
      const updated = [newConv, ...conversations]
      saveConversations(updated)
      setActiveConvId(newConv.id)
    }
    setShowMobileChat(true)
    setIsNewChatModalOpen(false)
  }

  const applyTemplate = (text: string) => {
    setInputMessage(text)
  }

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto flex flex-col font-sans text-slate-900 overflow-hidden relative space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{tenant.messagingTitle}</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Real-time SMS & Email communication feed for automated follow-ups, dispatches & client replies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>+</span> Start New Chat
          </button>
          <span className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SMS Gateway Active
          </span>
        </div>
      </div>

      {/* Main Two-Column Messaging Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pr-1 pb-6">
        
        {/* Left Column: Conversations List */}
        <div className={`lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex-col overflow-hidden ${
          showMobileChat ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Conversations ({conversations.length})</h2>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                + New
              </button>
            </div>
            {/* Live Thread Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search threads by name, phone, msg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {conversations.length === 0 ? (
            <div className="flex-1 p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <p className="font-semibold text-slate-600">No active threads</p>
              <p className="text-slate-400">Incoming customer SMS & email messages will appear here.</p>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs mt-2"
              >
                Start New Thread
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations
                .filter((c) => {
                  if (!searchQuery.trim()) return true
                  const q = searchQuery.toLowerCase()
                  return (
                    c.customerName.toLowerCase().includes(q) ||
                    c.customerPhone.includes(q) ||
                    c.messages.some((m) => m.text.toLowerCase().includes(q))
                  )
                })
                .map((conv) => {
                const isActive = conv.id === activeConvId
                const lastMsg = conv.messages[conv.messages.length - 1]
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id)
                      setShowMobileChat(true)
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                      )
                    }}
                    className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                      isActive ? 'bg-slate-100 border-l-4 border-slate-900 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {conv.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 truncate">{conv.customerName}</p>
                        <span className="text-[10px] text-slate-400 font-medium">{conv.lastActive}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{lastMsg?.text || 'No messages'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{conv.customerPhone}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Chat View */}
        <div className={`lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex-col overflow-hidden ${
          showMobileChat ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <p className="font-semibold text-slate-600">Select or start a conversation</p>
              <p className="text-xs">Incoming messages and outbound SMS dispatches will load in this area.</p>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl mt-2"
              >
                + Select Client from Directory
              </button>
            </div>
          ) : (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white backdrop-blur-md sticky top-0 z-10 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center gap-0.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Back to conversations"
                  >
                    <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-xs font-bold text-slate-700">Inbox</span>
                  </button>
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow-sm shrink-0">
                    {activeConv.avatar}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">{activeConv.customerName}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">{activeConv.customerPhone}</span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="hidden sm:inline text-slate-400 font-semibold">2-Way SMS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCallingCustomer({ name: activeConv.customerName, phone: activeConv.customerPhone })}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                    title="In-App CRM Call"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="hidden sm:inline">Call Client</span>
                  </button>
                </div>
              </div>

              {/* Messages Thread Container */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-[#F8FAFC]">
                {activeConv.messages.map((msg) => (
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
                      <span className="my-1 px-3 py-1 bg-slate-200/80 text-slate-600 rounded-full text-[10px] font-bold tracking-tight shadow-2xs border border-slate-300/40">
                        {msg.text}
                      </span>
                    ) : (
                      <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                        <div
                          className={`p-3.5 px-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs transition-all ${
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
              </div>

              {/* Quick Template Shortcuts */}
              <div className="p-2 sm:p-2.5 px-3 sm:px-4 bg-slate-100/80 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 pr-1">Templates:</span>
                <button
                  type="button"
                  onClick={() => applyTemplate("Hi! Confirming our upcoming appointment for your house wash.")}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
                >
                  Confirm Job
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("Your invoice has been generated and sent. Thank you!")}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
                >
                  Send Invoice Note
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("Our technician is en route to your address now!")}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95"
                >
                  En Route
                </button>
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-2.5 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3">
                <input
                  ref={messageInputRef}
                  type="text"
                  placeholder={`Message ${activeConv.customerName}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium"
                />
                <button
                  type="submit"
                  className="h-10 px-4 sm:px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-md shrink-0 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span className="hidden sm:inline">Send</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-7-9-7-9 7 9 7zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </>
          )}

        </div>

      </div>

      {/* CRM In-App Softphone Dialer */}
      {callingCustomer && (
        <CrmSoftphoneDialer
          customerName={callingCustomer.name}
          customerPhone={callingCustomer.phone}
          onClose={() => setCallingCustomer(null)}
        />
      )}

      {/* Start New Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Start New Message Thread</h2>
              <button onClick={() => setIsNewChatModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a client account from your directory to open an SMS thread:
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
              {customerDirectory.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No clients found. Add clients in the Clients tab first.
                </div>
              ) : (
                customerDirectory.map((cust: any) => (
                  <button
                    key={cust.id}
                    onClick={() => startNewConversation(cust)}
                    className="w-full p-3 text-left hover:bg-slate-100 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900">{cust.name}</p>
                      <p className="text-[11px] text-slate-400">{cust.phone} • {cust.address}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Message ›</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
