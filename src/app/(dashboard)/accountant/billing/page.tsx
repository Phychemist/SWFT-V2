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
    const [hospitalsList, setHospitalsList] = useState<any[]>([])
    const [previewTickets, setPreviewTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState(false)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [billingFrom, setBillingFrom] = useState('')
    const [billingTo, setBillingTo] = useState('')
    const [hospitalFilter, setHospitalFilter] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [selectedHospitalId, setSelectedHospitalId] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const fetchData = async () => {
        try {
            setLoading(true)
            const [invoicesRes, hospitalsRes] = await Promise.all([
                fetch('/api/invoices'),
                fetch('/api/hospitals')
            ])

            const [invoicesData, hospitalsData] = await Promise.all([
                invoicesRes.json(),
                hospitalsRes.json()
            ])

            if (invoicesData.success) setInvoices(invoicesData.data)
            if (hospitalsData.success) setHospitalsList(hospitalsData.data)
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

    // Fetch unbilled tickets preview dynamically when hospital and dates are selected
    useEffect(() => {
        const fetchPreview = async () => {
            if (!selectedHospitalId || !startDate || !endDate) {
                setPreviewTickets([])
                return
            }

            try {
                setLoadingPreview(true)
                setError(null)
                const res = await fetch(`/api/billing/unbilled-tickets?hospital_id=${selectedHospitalId}&start_date=${startDate}&end_date=${endDate}`)
                const data = await res.json()
                if (data.success) {
                    setPreviewTickets(data.data)
                } else {
                    setError(data.error || 'Failed to retrieve case preview.')
                }
            } catch (err) {
                setError('Error fetching unbilled cases preview.')
            } finally {
                setLoadingPreview(false)
            }
        }

        fetchPreview()
    }, [selectedHospitalId, startDate, endDate])

    const handleGenerateInvoice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedHospitalId || !startDate || !endDate || previewTickets.length === 0) return

        try {
            setLoadingAction(true)
            setError(null)

            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hospital_id: selectedHospitalId,
                    start_date: startDate,
                    end_date: endDate
                })
            })

            const data = await res.json()
            if (data.success) {
                setSuccess(`Invoice successfully generated! sequential ID: ${data.data.uid}`)
                setShowModal(false)
                setSelectedHospitalId('')
                setStartDate('')
                setEndDate('')
                setPreviewTickets([])
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
            inv.hospital_name.toLowerCase().includes(searchQuery.toLowerCase())
            
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

    const handleDownloadPDF = (invoiceId: string) => {
        window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
    }

    const handleDownloadAnnexure = (invoiceId: string) => {
        window.open(`/api/invoices/${invoiceId}/annexure`, '_blank')
    }

    const uniqueHospitals = Array.from(new Set(invoices.map(inv => inv.hospital_name)))

    // Calculate aggregated totals for modal preview
    const baseTotal = previewTickets.reduce((acc, t) => acc + (t.base_amount || 0), 0)
    const gstTotal = previewTickets.reduce((acc, t) => acc + (t.gst_amount || 0), 0)
    const tdsTotal = previewTickets.reduce((acc, t) => acc + (t.tds_amount || 0), 0)
    const grandTotal = baseTotal + gstTotal - tdsTotal

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
                            setSelectedHospitalId('')
                            setStartDate('')
                            setEndDate('')
                            setPreviewTickets([])
                            setError(null)
                            setShowModal(true)
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-fade-in"
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
                <div className="table-wrap bg-white border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="table-toolbar flex items-center justify-between gap-4 p-4 border-b border-[var(--border-light)] flex-wrap">
                        <div className="toolbar-left flex items-center gap-3 flex-wrap flex-1">
                            <div className="search-box flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg w-[240px]">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                    placeholder="Search by Invoice UID or Hospital..."
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
                                <p className="text-xs mt-1">Generate hospital-wide invoices for completed billing periods.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-500">
                                        <th className="p-4">Invoice UID</th>
                                        <th className="p-4">Hospital Name</th>
                                        <th className="p-4">Billing Period</th>
                                        <th className="p-4 text-center">Cases Billed</th>
                                        <th className="p-4 text-right">Base Amount</th>
                                        <th className="p-4 text-right">GST (18%)</th>
                                        <th className="p-4 text-right">TDS (10%)</th>
                                        <th className="p-4 text-right font-bold">Total Receivable</th>
                                        <th className="p-4">Generated Date</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold" style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary-700)' }}>
                                                {inv.uid}
                                            </td>
                                            <td className="p-4 font-semibold text-gray-700">
                                                {inv.hospital_name}
                                            </td>
                                            <td className="p-4 font-medium text-gray-600">
                                                {inv.start_date ? `${formatDate(inv.start_date)} to ${formatDate(inv.end_date)}` : '—'}
                                            </td>
                                            <td className="p-4 text-center font-bold text-gray-700">
                                                {inv.ticket_count}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-gray-600">₹{inv.base_amount.toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-right text-gray-500">
                                                {inv.gst_amount > 0 ? `₹${inv.gst_amount.toLocaleString('en-IN')}` : '—'}
                                            </td>
                                            <td className="p-4 text-right text-red-500">
                                                {inv.tds_amount > 0 ? `-₹${inv.tds_amount.toLocaleString('en-IN')}` : '—'}
                                            </td>
                                            <td className="p-4 text-right font-extrabold text-pink-600 text-sm">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-gray-400 font-semibold">{formatDate(inv.generated_at)}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleDownloadPDF(inv.id)}
                                                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-[10px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                                        title="Download Summary Invoice PDF"
                                                    >
                                                        Invoice PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadAnnexure(inv.id)}
                                                        className="bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 text-[10px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                                        title="Download Patient Claims Annexure PDF"
                                                    >
                                                        Annexure PDF
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

            {/* Generate Bulk Invoice Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                                    <Receipt className="text-pink-600" />
                                    GENERATE HOSPITAL INVOICE
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Generate bulk invoice and detailed patient annexure</p>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Select Hospital */}
                                <div className="md:col-span-2">
                                    <label className="block font-bold text-gray-700 uppercase mb-1.5">Select Hospital *</label>
                                    <div className="relative">
                                        <select
                                            value={selectedHospitalId}
                                            onChange={(e) => setSelectedHospitalId(e.target.value)}
                                            required
                                            className="w-full bg-white px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 appearance-none cursor-pointer pr-10 text-gray-800 font-bold"
                                        >
                                            <option value="">Choose Hospital...</option>
                                            {hospitalsList.filter(h => h.is_active !== false).map((h) => (
                                                <option key={h.id} value={h.id}>
                                                    {h.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1.5">Start Date *</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                        className="w-full bg-white px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 text-gray-800 font-bold"
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1.5">End Date *</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required
                                        className="w-full bg-white px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 text-gray-800 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Draft Tickets Table Preview */}
                            {loadingPreview ? (
                                <div className="p-6 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                    <Loader2 className="animate-spin text-pink-600" size={24} />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fetching Unbilled Completed Cases...</span>
                                </div>
                            ) : previewTickets.length > 0 ? (
                                <div className="space-y-4 animate-scale-up">
                                    <div>
                                        <label className="block font-bold text-gray-500 uppercase tracking-wide text-[9px] mb-1">Unbilled cases to be included ({previewTickets.length}):</label>
                                        <div className="border border-gray-150 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto bg-gray-50/20">
                                            <table className="w-full text-left text-[11px] text-gray-500">
                                                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[8px] border-b border-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="p-2">UID</th>
                                                        <th className="p-2">Patient</th>
                                                        <th className="p-2">Service</th>
                                                        <th className="p-2 text-right">Total Charges</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {previewTickets.map((t) => (
                                                        <tr key={t.id} className="hover:bg-gray-50/30">
                                                            <td className="p-2 font-mono font-bold text-gray-700">{t.uid}</td>
                                                            <td className="p-2 font-semibold text-gray-850">{t.patient_name}</td>
                                                            <td className="p-2">{t.service_name}</td>
                                                            <td className="p-2 text-right font-bold text-gray-900">₹{t.total_amount.toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Aggregated Totals Preview */}
                                    <div className="border border-pink-100 bg-pink-50/10 rounded-2xl p-4 space-y-3">
                                        <div className="font-bold text-pink-900 uppercase tracking-wider text-[10px] flex items-center justify-between">
                                            <span>Invoice Aggregation Preview</span>
                                            <span className="bg-pink-50 border border-pink-100 text-pink-700 px-2 py-0.5 rounded font-extrabold uppercase">
                                                {previewTickets.length} cases
                                            </span>
                                        </div>

                                        <div className="space-y-2 border-b border-pink-100/30 pb-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-semibold uppercase tracking-wide">Cases Subtotal</span>
                                                <span className="font-bold text-gray-800">₹{baseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-semibold uppercase tracking-wide">Total GST (18%)</span>
                                                <span className="font-bold text-gray-600">₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-semibold uppercase tracking-wide">Total TDS Deducted (10%)</span>
                                                <span className="font-bold text-red-500">-₹{tdsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center shrink-0">
                                            <div>
                                                <span className="font-bold text-pink-800 uppercase tracking-wider text-[10px] block">Grand Total Preview</span>
                                                <span className="text-[9px] text-gray-400">Total hospital accounts receivable sum</span>
                                            </div>
                                            <span className="text-xl font-extrabold text-pink-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedHospitalId && startDate && endDate ? (
                                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl flex items-center gap-2 shrink-0 animate-scale-up">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>No completed unbilled tickets found for this hospital in the specified range.</span>
                                </div>
                            ) : selectedHospitalId ? (
                                <div className="p-4 bg-gray-50 border border-gray-200 text-gray-500 rounded-2xl flex items-center justify-center gap-2 text-center animate-scale-up">
                                    <span>Please choose a start and end date to search completed cases.</span>
                                </div>
                            ) : null}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loadingAction || loadingPreview || previewTickets.length === 0}
                                    className="w-full py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-98 cursor-pointer"
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
