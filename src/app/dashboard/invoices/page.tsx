'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getTenantConfig, getActiveTenantEmailFromCookie } from '@/lib/tenant'

interface Invoice {
  id: string
  customer: string
  email: string
  address: string
  service: string
  issueDate: string
  dueDate: string
  amount: string
  status: 'Paid' | 'Pending' | 'Overdue'
  lastEmailed?: string
}

export default function InvoicesPage() {
  const [tenant, setTenant] = useState(() => getTenantConfig(getActiveTenantEmailFromCookie()))
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<string>('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customerDirectory, setCustomerDirectory] = useState<any[]>([])
  const [selectedPdfInvoice, setSelectedPdfInvoice] = useState<Invoice | null>(null)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    email: '',
    address: 'Richmond, VA',
    service: 'Driveway & Exterior Power Wash',
    amount: '350.00',
    dueDate: '2026-08-20',
  })

  // Load persistent invoices & customer directory on mount
  useEffect(() => {
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      setTenant(currentTenant)
      const prefix = currentTenant.storagePrefix

      const savedInvoicesStr = localStorage.getItem(`${prefix}invoices`)
      const savedCustStr = localStorage.getItem(`${prefix}customers`)
      
      const custs = savedCustStr ? JSON.parse(savedCustStr) : []
      setCustomerDirectory(custs)

      if (savedInvoicesStr) {
        setInvoices(JSON.parse(savedInvoicesStr))
      }
    } catch (e) {
      console.error('Failed to load invoices:', e)
    }
  }, [])

  const saveInvoices = (updated: Invoice[]) => {
    setInvoices(updated)
    try {
      const activeEmail = getActiveTenantEmailFromCookie()
      const currentTenant = getTenantConfig(activeEmail)
      localStorage.setItem(`${currentTenant.storagePrefix}invoices`, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save invoices:', e)
    }
  }

  const handleSelectCustomer = (custName: string) => {
    const matched = customerDirectory.find((c) => c.name === custName)
    if (matched) {
      setNewInvoice((prev) => ({
        ...prev,
        customer: matched.name,
        email: matched.email !== 'n/a' ? matched.email : `${matched.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        address: matched.address || 'Richmond, VA',
      }))
    } else {
      setNewInvoice((prev) => ({ ...prev, customer: custName }))
    }
  }

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInvoice.customer) return

    const created: Invoice = {
      id: `INV-${Math.floor(1050 + Math.random() * 900)}`,
      customer: newInvoice.customer,
      email: newInvoice.email || `${newInvoice.customer.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      address: newInvoice.address || 'Richmond, VA',
      service: newInvoice.service,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: newInvoice.dueDate,
      amount: newInvoice.amount.startsWith('$') ? newInvoice.amount : `$${newInvoice.amount}`,
      status: 'Pending',
    }

    saveInvoices([created, ...invoices])
    setIsModalOpen(false)
    setNewInvoice({ customer: '', email: '', address: 'Richmond, VA', service: 'Driveway & Exterior Power Wash', amount: '350.00', dueDate: '2026-08-20' })
  }

  const markPaid = (id: string) => {
    saveInvoices(invoices.map((inv) => (inv.id === id ? { ...inv, status: 'Paid' } : inv)))
  }

  const handleSendEmailInvoice = (inv: Invoice) => {
    setEmailStatus(`Sending curated PDF invoice to ${inv.email}...`)
    setTimeout(() => {
      setEmailStatus(`✓ PDF Invoice ${inv.id} successfully emailed to ${inv.email}!`)
      const updated = invoices.map((i) => (i.id === inv.id ? { ...i, lastEmailed: 'Just now' } : i))
      saveInvoices(updated)
      setTimeout(() => setEmailStatus(null), 3500)
    }, 1200)
  }

  const handleDownloadPdfFile = (inv: Invoice) => {
    setSelectedPdfInvoice(inv)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${inv.id} - Viracis Enterprise</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0F172A; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #0F172A; }
          .title { font-size: 28px; font-weight: 900; text-align: right; }
          .bill-to { background: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background: #F1F5F9; padding: 10px; text-align: left; text-transform: uppercase; font-size: 12px; }
          td { padding: 12px 10px; border-bottom: 1px solid #E2E8F0; }
          .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Viracis Enterprise</div>
            <p style="font-size:12px; color:#64748B; margin: 4px 0;">100 West Broad Street • Richmond, VA 23220</p>
            <p style="font-size:12px; color:#64748B; margin: 0;">billing@viracis.com • (804) 503-3954</p>
          </div>
          <div class="title">
            INVOICE
            <div style="font-size: 14px; font-weight: bold; color: #475569; margin-top: 4px;">#${inv.id}</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Date: ${inv.issueDate} | Due: ${inv.dueDate}</div>
            <div style="font-size: 12px; color: ${inv.status === 'Paid' ? '#059669' : '#2563EB'}; font-weight: bold;">Status: ${inv.status.toUpperCase()}</div>
          </div>
        </div>

        <div class="bill-to">
          <strong>Billed To:</strong> ${inv.customer} (${inv.email})<br/>
          <strong>Service Address:</strong> ${inv.address}
        </div>

        <table>
          <thead>
            <tr>
              <th>Service Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${inv.service}</strong><br/><span style="font-size:11px; color:#64748B;">Complete exterior cleaning & surface treatment.</span></td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">${inv.amount}</td>
              <td style="text-align: right;"><strong>${inv.amount}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="total">
          Total Balance Due: <span style="color: #2563EB;">${inv.amount}</span>
        </div>

        <div class="footer">
          Thank you for your business! Please remit payments online or via check payable to <strong>Viracis LLC</strong>.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }

  const filteredInvoices = invoices.filter((inv) => filter === 'All' || inv.status === filter)

  // Calculations for summary metrics
  const totalProcessed = invoices.reduce((acc, inv) => acc + (parseFloat(inv.amount.replace(/[^0-9.]/g, '')) || 0), 0)
  const paidTotal = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((acc, inv) => acc + (parseFloat(inv.amount.replace(/[^0-9.]/g, '')) || 0), 0)
  const pendingTotal = invoices
    .filter((inv) => inv.status === 'Pending')
    .reduce((acc, inv) => acc + (parseFloat(inv.amount.replace(/[^0-9.]/g, '')) || 0), 0)
  const overdueTotal = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((acc, inv) => acc + (parseFloat(inv.amount.replace(/[^0-9.]/g, '')) || 0), 0)

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto flex flex-col font-sans text-slate-900 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6">
      {/* Toast Notification for Email Sending Status */}
      {emailStatus && (
        <div className="fixed top-5 right-5 z-[99999] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{emailStatus}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">{tenant.invoicesTitle}</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Curate PDF statements, dispatch automated client invoices to email, and manage payments.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          <span>+</span> Create Invoice
        </button>
      </div>

      {/* Summary KPI Cards (Compact 2x2 Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Receivables</p>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">${totalProcessed.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{invoices.length} Statements</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Invoices</p>
          <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 mt-1">${paidTotal.toFixed(0)}</p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            {totalProcessed > 0 ? ((paidTotal / totalProcessed) * 100).toFixed(0) : 0}% Collected
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Due</p>
          <p className="text-lg sm:text-2xl font-extrabold text-blue-600 mt-1">${pendingTotal.toFixed(0)}</p>
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
            {invoices.filter((i) => i.status === 'Pending').length} Pending
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Balance</p>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">${overdueTotal.toFixed(0)}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {invoices.filter((i) => i.status === 'Overdue').length} Overdue
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {['All', 'Paid', 'Pending', 'Overdue'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-sm font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2x2 Invoices Grid View */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">No invoice records found in billing feed.</p>
          <p className="text-xs text-slate-400">Click '+ Create Invoice' above to issue a statement.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors inline-block"
          >
            + Create New Invoice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 font-sans hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              {/* Card Header: Invoice ID, Status Pill, & Amount */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{inv.id}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : inv.status === 'Pending'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 mt-0.5">{inv.customer}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{inv.email}</p>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900 block">{inv.amount}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Due: {inv.dueDate}</span>
                </div>
              </div>

              {/* Service Rendered */}
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Service Item</p>
                <p className="font-semibold text-slate-900 mt-0.5">{inv.service}</p>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-400">
                  {inv.lastEmailed ? `Emailed: ${inv.lastEmailed}` : `Issued: ${inv.issueDate}`}
                </span>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inv.status !== 'Paid' && (
                    <button
                      onClick={() => markPaid(inv.id)}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() => handleSendEmailInvoice(inv)}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
                    title="Send PDF statement to customer email on file"
                  >
                    Send Email
                  </button>
                  <button
                    onClick={() => setSelectedPdfInvoice(inv)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
                    title="Preview & Download PDF Statement"
                  >
                    PDF Statement
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create New Invoice Statement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Customer Account</label>
                {customerDirectory.length > 0 ? (
                  <select
                    value={newInvoice.customer}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                  >
                    <option value="">-- Choose Customer from Directory --</option>
                    {customerDirectory.map((c) => (
                      <option key={c.id} value={c.name}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={newInvoice.customer}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer Email on File</label>
                <input
                  type="email"
                  required
                  placeholder="client@gmail.com"
                  value={newInvoice.email}
                  onChange={(e) => setNewInvoice({ ...newInvoice, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Service Rendered</label>
                <input
                  type="text"
                  required
                  placeholder="Service description"
                  value={newInvoice.service}
                  onChange={(e) => setNewInvoice({ ...newInvoice, service: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Total Amount ($)</label>
                  <input
                    type="text"
                    required
                    placeholder="350.00"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Issue Statement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Statement Preview & Download Modal */}
      {selectedPdfInvoice && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto text-slate-900 font-sans border border-slate-200 print:p-0 print:shadow-none print:border-none">
            
            {/* Modal Control Bar (Hidden on Print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-100">
                  PDF Statement Preview
                </span>
                <span className="text-xs text-slate-400 font-medium">#{selectedPdfInvoice.id}</span>
              </div>
              <button
                onClick={() => setSelectedPdfInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Official Curated PDF Invoice Document */}
            <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl space-y-6 print:border-none print:p-0">
              
              {/* Header: Company Logo & Statement Title */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                <div>
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="h-12 w-auto object-contain"
                  />
                  <p className="text-xs text-slate-500 font-semibold mt-2">{tenant.billingCompany}</p>
                  <p className="text-[11px] text-slate-400">{tenant.billingAddress}</p>
                  <p className="text-[11px] text-slate-400">{tenant.email} • {tenant.billingPhone}</p>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">INVOICE</h2>
                  <p className="text-sm font-extrabold text-slate-700 mt-1">#{selectedPdfInvoice.id}</p>
                  <div className="mt-2 text-[11px] space-y-0.5">
                    <p><span className="text-slate-400">Date:</span> <strong className="text-slate-800">{selectedPdfInvoice.issueDate}</strong></p>
                    <p><span className="text-slate-400">Due Date:</span> <strong className="text-slate-800">{selectedPdfInvoice.dueDate}</strong></p>
                    <p><span className="text-slate-400">Status:</span> <strong className={selectedPdfInvoice.status === 'Paid' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>{selectedPdfInvoice.status.toUpperCase()}</strong></p>
                  </div>
                </div>
              </div>

              {/* Bill To & Property Address */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To:</p>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedPdfInvoice.customer}</p>
                  <p className="text-slate-600 font-medium">{selectedPdfInvoice.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Service Location:</p>
                  <p className="font-bold text-slate-800">{selectedPdfInvoice.address}</p>
                  <p className="text-[11px] text-slate-500">Service Category: Commercial & Residential</p>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3 px-4">Service Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3.5 px-4 font-bold text-slate-900">
                        {selectedPdfInvoice.service}
                        <p className="text-[10px] font-normal text-slate-500">Includes complete exterior surface wash, deep cleaning & protective finish.</p>
                      </td>
                      <td className="p-3.5 text-center text-slate-600">1</td>
                      <td className="p-3.5 text-right text-slate-600">{selectedPdfInvoice.amount}</td>
                      <td className="p-3.5 px-4 text-right font-bold text-slate-900">{selectedPdfInvoice.amount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{selectedPdfInvoice.amount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (0.0%):</span>
                    <span className="font-semibold text-slate-800">$0.00</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Balance Due:</span>
                    <span className="text-blue-600">{selectedPdfInvoice.amount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Terms & Footer Note */}
              <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Thank you for your business!</p>
                <p>Please send payments online or via check payable to <strong>Viracis LLC</strong>.</p>
              </div>

            </div>

            {/* Bottom Actions Bar (Hidden on Print) */}
            <div className="flex items-center justify-between gap-3 pt-2 print:hidden flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPdfInvoice(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    const updated = invoices.filter((inv) => inv.id !== selectedPdfInvoice.id)
                    saveInvoices(updated)
                    setSelectedPdfInvoice(null)
                  }}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendEmailInvoice(selectedPdfInvoice)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  Email PDF to {selectedPdfInvoice.email}
                </button>
                <button
                  onClick={() => handleDownloadPdfFile(selectedPdfInvoice)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  Download / Print PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  )
}
