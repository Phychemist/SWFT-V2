'use client'

import { useEffect, useState } from 'react'
import {
    Receipt,
    Plus,
    X,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FileText,
    Download,
    Building2,
    Calendar,
    ArrowRight,
    TrendingUp,
    FileSpreadsheet,
    Activity,
    ChevronDown,
    Save
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AccountantBillingPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [unbilledTickets, setUnbilledTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [billingFrom, setBillingFrom] = useState('')
    const [billingTo, setBillingTo] = useState('')
    const [hospitalFilter, setHospitalFilter] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [selectedTicketId, setSelectedTicketId] = useState('')
    const [previewCharge, setPreviewCharge] = useState<any | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [invoicesRes, unbilledRes] = await Promise.all([
                fetch('/api/invoices'),
                fetch('/api/billing/unbilled-tickets')
            ])

            const [invoicesData, unbilledData] = await Promise.all([
                invoicesRes.json(),
                unbilledRes.json()
            ])

            if (invoicesData.success) setInvoices(invoicesData.data)
            if (unbilledData.success) setUnbilledTickets(unbilledData.data)
        } catch (err) {
            console.error('Error fetching billing data:', err)
            setError('Failed to fetch billing data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Preview rate calculations when a ticket is selected
    useEffect(() => {
        const fetchPreviewRate = async () => {
            if (!selectedTicketId) {
                setPreviewCharge(null)
                return
            }

            const ticket = unbilledTickets.find(t => t.id === selectedTicketId)
            if (!ticket) return

            try {
                setLoadingPreview(true)
                setError(null)
                
                // Fetch active hospital pricing charges
                const res = await fetch(`/api/hospital-charges?active=true&hospital_id=${ticket.hospital_id}`)
                const data = await res.json()
                
                if (data.success) {
                    const match = data.data.find((c: any) => c.service_type_id === ticket.service_type_id)
                    if (match) {
                        const base = Number(match.amount)
                        const gst = match.gst_applicable ? base * 0.18 : 0
                        const tds = match.tds_applicable ? base * 0.10 : 0
                        const total = base + gst - tds
                        
                        setPreviewCharge({
                            ...match,
                            base_amount: base,
                            gst_amount: gst,
                            tds_amount: tds,
                            total_amount: total
                        })
                    } else {
                        setPreviewCharge(null)
                        setError('No active rate configured for this ticket\'s hospital & service type.')
                    }
                } else {
                    setError('Failed to fetch pricing rates for selected ticket.')
                }
            } catch (err) {
                setError('Error occurred while fetching rate preview.')
            } finally {
                setLoadingPreview(false)
            }
        }

        fetchPreviewRate()
    }, [selectedTicketId, unbilledTickets])

    const handleGenerateInvoice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTicketId || !previewCharge) return

        try {
            setLoadingAction(true)
            setError(null)

            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: selectedTicketId })
            })

            const data = await res.json()
            if (data.success) {
                setSuccess(`Invoice successfully generated! Sequential ID: ${data.data.uid}`)
                setShowModal(false)
                setSelectedTicketId('')
                setPreviewCharge(null)
                setTimeout(() => setSuccess(null), 3000)
                await fetchData()
            } else {
                setError(data.error || 'Failed to generate invoice')
            }
        } catch (err) {
            setError('Error occurred during invoice generation.')
        } finally {
            setLoadingAction(false)
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = 
            inv.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.ticket_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.service_name.toLowerCase().includes(searchQuery.toLowerCase())
            
        const matchesHospital = hospitalFilter === '' || inv.hospital_name === hospitalFilter
        
        let matchesDates = true
        if (billingFrom) {
            matchesDates = matchesDates && new Date(inv.generated_at) >= new Date(billingFrom)
        }
        if (billingTo) {
            matchesDates = matchesDates && new Date(inv.generated_at) <= new Date(billingTo)
        }
        
        return matchesSearch && matchesHospital && matchesDates
    })

    const handleDownloadPDF = (invoiceId: string, invoiceUid: string) => {
        window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
    }

    const uniqueHospitals = Array.from(new Set(invoices.map(inv => inv.hospital_name)))

    return (
        <div className="flex flex-col min-h-screen bg-[var(--gray-50)] pb-12 rose-theme">
            {/* Header */}
            <div className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Billing & Invoices</h1>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Generate and manage hospital invoices for completed tickets</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedTicketId('')
                            setPreviewCharge(null)
                            setError(null)
                            setShowModal(true)
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} /> Generate Invoice
                    </button>
                </div>
            </div>

            <div className="px-6 mt-6 w-full space-y-6">
                {/* Success Banner */}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-2xl text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Table Wrap */}
                <div className="table-wrap bg-white border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden">
                    <div className="table-toolbar flex items-center justify-between gap-4 p-4 border-b border-[var(--border-light)] flex-wrap">
                        <div className="toolbar-left flex items-center gap-3 flex-wrap flex-1">
                            <div className="search-box flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg w-[240px]">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                    placeholder="Invoice UID or ticket UID..."
                                    className="text-sm focus:outline-none w-full bg-transparent text-gray-700"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="date-pair flex items-center gap-2">
                                <input 
                                    type="date" 
                                    className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:border-pink-400" 
                                    value={billingFrom}
                                    onChange={(e) => setBillingFrom(e.target.value)}
                                    style={{ width: '130px' }}
                                />
                                <span className="text-gray-400 text-xs">to</span>
                                <input 
                                    type="date" 
                                    className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:border-pink-400" 
                                    value={billingTo}
                                    onChange={(e) => setBillingTo(e.target.value)}
                                    style={{ width: '130px' }}
                                />
                            </div>

                            <select
                                value={hospitalFilter}
                                onChange={(e) => setHospitalFilter(e.target.value)}
                                className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none w-[180px]"
                            >
                                <option value="">All Hospitals</option>
                                {uniqueHospitals.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-pink-600" /></div>
                        ) : filteredInvoices.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                                <h3 className="font-bold text-sm text-gray-600">No invoices generated</h3>
                                <p className="text-xs mt-1">Generate invoices for completed workflow procedures.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-500">
                                        <th className="p-4">Invoice UID</th>
                                        <th className="p-4">Ticket</th>
                                        <th className="p-4">Hospital</th>
                                        <th className="p-4">Service</th>
                                        <th className="p-4 text-right">Base Amount</th>
                                        <th className="p-4 text-right">GST</th>
                                        <th className="p-4 text-right">TDS</th>
                                        <th className="p-4 text-right font-bold">Total</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold" style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary-700)' }}>
                                                {inv.uid}
                                            </td>
                                            <td className="p-4 font-bold text-pink-600">
                                                {inv.ticket_uid}
                                            </td>
                                            <td className="p-4 font-semibold text-gray-700">
                                                {inv.hospital_name}
                                                <div className="text-[10px] text-gray-400 font-normal mt-0.5">Patient: {inv.patient_name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="badge badge-gray bg-gray-100 border border-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-bold uppercase text-[9px]">
                                                    {inv.service_category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-semibold text-gray-600">₹{inv.base_amount.toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-right text-gray-500">
                                                {inv.gst_amount > 0 ? `₹${inv.gst_amount.toLocaleString('en-IN')}` : '—'}
                                            </td>
                                            <td className="p-4 text-right text-red-500">
                                                {inv.tds_amount > 0 ? `-₹${inv.tds_amount.toLocaleString('en-IN')}` : '—'}
                                            </td>
                                            <td className="p-4 text-right font-extrabold text-gray-800 text-sm">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-gray-400 font-semibold">{formatDate(inv.generated_at)}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleDownloadPDF(inv.id, inv.uid)}
                                                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-[11px] font-bold py-1 px-3 rounded transition-colors cursor-pointer"
                                                    >
                                                        View PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPDF(inv.id, inv.uid)}
                                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                                    >
                                                        ↓
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Generate Invoice Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                                    <Receipt className="text-pink-600" />
                                    GENERATE WORKFLOW INVOICE
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Select completed unbilled ticket to invoice</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleGenerateInvoice} className="p-6 space-y-5 text-xs">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Ticket dropdown selection */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1.5">Select Completed Closed Task *</label>
                                <div className="relative">
                                    <select
                                        value={selectedTicketId}
                                        onChange={(e) => setSelectedTicketId(e.target.value)}
                                        required
                                        className="w-full bg-white px-3 py-3 border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 appearance-none cursor-pointer pr-10 text-gray-800 font-bold"
                                    >
                                        <option value="">Select a ticket...</option>
                                        {unbilledTickets.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.uid} — {t.patient_name} ({t.hospital_name})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Loader or pricing preview */}
                            {loadingPreview ? (
                                <div className="p-6 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                    <Loader2 className="animate-spin text-pink-600" size={24} />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fetching Active Pricing Rates...</span>
                                </div>
                            ) : previewCharge ? (
                                <div className="border border-pink-100 bg-pink-50/10 rounded-2xl p-4 space-y-4 animate-scale-up">
                                    <div className="font-bold text-pink-900 uppercase tracking-wider text-[10px] flex items-center justify-between">
                                        <span>Live Invoice Preview</span>
                                        <span className="bg-pink-50 border border-pink-100 text-pink-700 px-2 py-0.5 rounded font-extrabold uppercase">Active Rate Found</span>
                                    </div>

                                    <div className="space-y-2 border-b border-pink-100/30 pb-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wide">Base Procedure Rate</span>
                                            <span className="font-bold text-gray-800">₹{previewCharge.base_amount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wide">GST (18% Applicable)</span>
                                            <span className="font-bold text-gray-600">
                                                {previewCharge.gst_applicable ? `₹${previewCharge.gst_amount.toFixed(2)}` : 'Exempt (₹0.00)'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wide">TDS (10% Deducted)</span>
                                            <span className="font-bold text-red-500">
                                                {previewCharge.tds_applicable ? `-₹${previewCharge.tds_amount.toFixed(2)}` : 'Exempt (₹0.00)'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center shrink-0">
                                        <div>
                                            <span className="font-bold text-pink-800 uppercase tracking-wider text-[10px] block">Grand Total Preview</span>
                                            <span className="text-[9px] text-gray-400">Total accounts receivable sum</span>
                                        </div>
                                        <span className="text-xl font-extrabold text-pink-600">₹{previewCharge.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : selectedTicketId ? (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-2 shrink-0 animate-scale-up">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>Please configure hospital charges for this service category before billing.</span>
                                </div>
                            ) : null}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loadingAction || loadingPreview || !previewCharge}
                                    className="w-full py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-98"
                                >
                                    {loadingAction ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Confirm & Generate Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
