'use client'

import { useEffect, useState } from 'react'
import {
    Wallet,
    Receipt,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Sliders,
    X,
    Search,
    ChevronDown,
    Activity,
    ExternalLink,
    Save,
    FileText,
    TrendingUp,
    Ban
} from 'lucide-react'

interface ReimbursementItem {
    name: string
    amount: number
    description: string
}

export default function AccountantClaimsPage() {
    const [stats, setStats] = useState<any>({
        pending_claims_count: 0,
        pending_claims_amount: 0,
        approved_claims_count: 0,
        approved_claims_amount: 0
    })
    const [claims, setClaims] = useState<any[]>([])
    const [ratesConfig, setRatesConfig] = useState<any>({
        petrol_rate_per_km: 4.00,
        breakfast_max: 100.00,
        lunch_max: 150.00,
        dinner_max: 150.00
    })

    const [loading, setLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // all | pending | approved | rejected
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Modal states
    const [showRateModal, setShowRateModal] = useState(false)
    const [selectedClaim, setSelectedClaim] = useState<any | null>(null)
    const [rejecting, setRejecting] = useState(false)
    const [reviewNotes, setReviewNotes] = useState('')

    // Rate Form fields state
    const [formPetrolRate, setFormPetrolRate] = useState('')
    const [formBreakfastMax, setFormBreakfastMax] = useState('')
    const [formLunchMax, setFormLunchMax] = useState('')
    const [formDinnerMax, setFormDinnerMax] = useState('')

    const fetchData = async () => {
        try {
            setLoading(true)
            const [statsRes, claimsRes, ratesRes] = await Promise.all([
                fetch('/api/expense-claims/stats'),
                fetch('/api/expense-claims'),
                fetch('/api/claim-rate-config')
            ])

            const [statsData, claimsData, ratesData] = await Promise.all([
                statsRes.json(),
                claimsRes.json(),
                ratesRes.json()
            ])

            if (statsData.success) setStats(statsData.data)
            if (claimsData.success) setClaims(claimsData.data)
            if (ratesData.success) {
                setRatesConfig(ratesData.data)
                setFormPetrolRate(String(ratesData.data.petrol_rate_per_km))
                setFormBreakfastMax(String(ratesData.data.breakfast_max))
                setFormLunchMax(String(ratesData.data.lunch_max))
                setFormDinnerMax(String(ratesData.data.dinner_max))
            }
        } catch (err) {
            console.error('Error fetching accountant claims page data:', err)
            setError('Failed to fetch data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleUpdateRates = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoadingAction(true)
            setError(null)

            const res = await fetch('/api/claim-rate-config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    petrol_rate_per_km: Number(formPetrolRate),
                    breakfast_max: Number(formBreakfastMax),
                    lunch_max: Number(formLunchMax),
                    dinner_max: Number(formDinnerMax)
                })
            })

            const data = await res.json()
            if (data.success) {
                setRatesConfig(data.data)
                setSuccess('Claim rates and limits configured successfully!')
                setShowRateModal(false)
                setTimeout(() => setSuccess(null), 3000)
                await fetchData()
            } else {
                setError(data.error || 'Failed to update rate configuration')
            }
        } catch (err) {
            setError('Error occurred during configuration.')
        } finally {
            setLoadingAction(false)
        }
    }

    const handleReviewClaim = async (status: 'approved' | 'rejected') => {
        if (!selectedClaim) return

        if (status === 'rejected' && (!reviewNotes || reviewNotes.trim() === '')) {
            setError('Review comments / remarks are mandatory when rejecting a claim.')
            return
        }

        try {
            setLoadingAction(true)
            setError(null)

            const res = await fetch(`/api/expense-claims/${selectedClaim.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    review_notes: reviewNotes
                })
            })

            const data = await res.json()
            if (data.success) {
                setSuccess(`Claim request successfully ${status === 'approved' ? 'approved' : 'rejected'}!`)
                setSelectedClaim(null)
                setRejecting(false)
                setReviewNotes('')
                setTimeout(() => setSuccess(null), 3000)
                await fetchData()
            } else {
                setError(data.error || 'Failed to submit review')
            }
        } catch (err) {
            setError('Error occurred during claim review.')
        } finally {
            setLoadingAction(false)
        }
    }

    const filteredClaims = claims.filter(c => {
        const matchesSearch =
            (c.claimant?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.claimant?.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.ticket?.uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.reason || '').toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusStyle = (statusStr: string) => {
        if (statusStr === 'approved') return 'bg-green-50 border-green-200 text-green-700'
        if (statusStr === 'rejected') return 'bg-red-50 border-red-200 text-red-700'
        return 'bg-amber-50 border-amber-200 text-amber-700'
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--gray-50)] pb-12">
            {/* Header */}
            <div className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Claims Management</h1>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Review and approve field executive expense claims</p>
                    </div>
                    <button
                        onClick={() => setShowRateModal(true)}
                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        <Sliders size={13} /> Rate Config
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

                {/* Stats Grid */}
                <div className="stats-grid-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat-card bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                        <div className="stat-icon w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 text-xl">
                            <Clock size={20} />
                        </div>
                        <div className="stat-body">
                            <div className="stat-label text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pending Claims</div>
                            <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                                {loading ? '...' : stats.pending_claims_count}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                        <div className="stat-icon w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-xl">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="stat-body">
                            <div className="stat-label text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Approved (filtered)</div>
                            <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                                {loading ? '...' : `₹${(stats.approved_claims_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                        <div className="stat-icon w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-xl">
                            <Receipt size={20} />
                        </div>
                        <div className="stat-body">
                            <div className="stat-label text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Claims</div>
                            <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                                {loading ? '...' : (claims.length || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter pills */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="filter-pills flex gap-2">
                        {['all', 'pending', 'approved', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`fpill px-4.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                    statusFilter === status
                                         ? 'bg-[var(--primary-600)] border-[var(--primary-600)] text-white font-bold'
                                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Claims list */}
                <div className="table-wrap bg-white border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden">
                    <div className="table-toolbar flex items-center justify-between gap-4 p-4 border-b border-[var(--border-light)]">
                        <div className="toolbar-left flex items-center gap-3 flex-1">
                            <div className="search-box flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg w-[240px]">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                    placeholder="Search claimant or ticket..."
                                    className="text-sm focus:outline-none w-full bg-transparent text-gray-700"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                             <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-[var(--primary-600)]" /></div>
                        ) : filteredClaims.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                                <h3 className="font-bold text-sm text-gray-600">No expense claims found</h3>
                                <p className="text-xs mt-1">Adjust search parameters or status filters.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Claimant</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Ticket</th>
                                        <th className="p-4 text-right">Total Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClaims.map((claim) => (
                                        <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-semibold text-gray-700">
                                                {formatDate(claim.created_at)}
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">
                                                {claim.claimant?.full_name}
                                            </td>
                                            <td className="p-4">
                                                <span className="badge badge-gray bg-gray-100 border border-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-bold uppercase text-[9px]">
                                                    {claim.claimant?.role === 'field_executive' ? 'Field Exec' : 'Manager'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-[var(--primary-600)]">
                                                {claim.ticket ? claim.ticket.uid : <span className="text-gray-400 font-normal">—</span>}
                                            </td>
                                            <td className="p-4 text-right font-extrabold text-gray-800 text-sm">₹{Number(claim.total_amount).toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full uppercase font-bold text-[9px] border ${getStatusStyle(claim.status)}`}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {claim.status === 'pending' ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedClaim(claim)
                                                                setReviewNotes(claim.review_notes || '')
                                                                setRejecting(false)
                                                            }}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-3 rounded transition-colors cursor-pointer"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedClaim(claim)
                                                                setReviewNotes(claim.review_notes || '')
                                                                setRejecting(true)
                                                            }}
                                                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold py-1 px-3 rounded transition-colors cursor-pointer"
                                                        >
                                                            Review
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">
                                                        {claim.status === 'approved' ? 'Reviewed' : 'Rejected'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Configure Limits Modal */}
            {showRateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                                    <Sliders className="text-[var(--primary-600)]" />
                                    CONFIGURE RATES & CAPS
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Configure employee travel and meal limits</p>
                            </div>
                            <button onClick={() => setShowRateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateRates} className="p-6 space-y-4 text-xs">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1.5">Petrol Rate per Kilometer (₹)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={formPetrolRate}
                                    onChange={(e) => setFormPetrolRate(e.target.value)}
                                    required
                                     className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] focus:border-[var(--primary-400)] bg-white font-bold"
                                />
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <label className="block font-bold text-gray-700 uppercase mb-3">Daily Meal Caps (₹)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Breakfast</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formBreakfastMax}
                                            onChange={(e) => setFormBreakfastMax(e.target.value)}
                                            required
                                            className="w-full px-2.5 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Lunch</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formLunchMax}
                                            onChange={(e) => setFormLunchMax(e.target.value)}
                                            required
                                            className="w-full px-2.5 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Dinner</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formDinnerMax}
                                            onChange={(e) => setFormDinnerMax(e.target.value)}
                                            required
                                            className="w-full px-2.5 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={loadingAction}
                                     className="w-full py-3 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-gray-200 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                                >
                                    {loadingAction ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save Configurations
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review detail modal */}
            {selectedClaim && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                        {/* Header */}
                        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                                     <Receipt className="text-[var(--primary-600)]" />
                                    REVIEW EXPENSE CLAIM DETAILS
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                                    Submitted by {selectedClaim.claimant?.full_name} on {formatDate(selectedClaim.created_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedClaim(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl flex items-center gap-2 shrink-0">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Employee information */}
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Employee Role</span>
                                    <span className="font-bold text-gray-700 text-sm mt-0.5 uppercase">{selectedClaim.claimant?.role.replace('_', ' ')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Associated Task</span>
                                    <span className="font-bold text-gray-700 text-sm mt-0.5">
                                        {selectedClaim.ticket ? `${selectedClaim.ticket.uid} (${selectedClaim.ticket.patient_name})` : 'Freestanding / None'}
                                    </span>
                                </div>
                            </div>

                            {/* Reason for claims */}
                            {selectedClaim.reason && (
                                <div>
                                    <span className="font-bold text-gray-700 uppercase block mb-1">Business Reason Description</span>
                                    <p className="bg-indigo-50/20 border border-indigo-100/50 p-3 rounded-xl font-medium text-gray-600 leading-relaxed italic">
                                        "{selectedClaim.reason}"
                                    </p>
                                </div>
                            )}

                            {/* Outstation travel card */}
                            {selectedClaim.outstation_travel && (
                                <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-4 space-y-3">
                                    <div className="font-bold text-indigo-900 uppercase tracking-wider flex items-center justify-between text-[10px]">
                                        <span>Outstation Travel Log</span>
                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold uppercase">Approved Mode</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-[9px] text-indigo-400 font-bold uppercase">Route Location</span>
                                            <span className="font-bold text-gray-700 block mt-0.5">{selectedClaim.from_place} ➔ {selectedClaim.to_place}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-100/40 text-center">
                                        <div>
                                            <div className="text-[9px] text-indigo-400 font-bold uppercase">Lodging</div>
                                            <div className="font-bold text-gray-800 mt-0.5">₹{selectedClaim.accommodation_amount}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-indigo-400 font-bold uppercase">Allowance</div>
                                            <div className="font-bold text-gray-800 mt-0.5">₹{selectedClaim.travel_allowance_amount}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-indigo-400 font-bold uppercase">Misc</div>
                                            <div className="font-bold text-gray-800 mt-0.5">₹{selectedClaim.miscellaneous_amount}</div>
                                        </div>
                                    </div>
                                    {selectedClaim.miscellaneous_description && (
                                        <div className="text-[10px] text-indigo-700 italic pt-1">
                                            Misc Note: "{selectedClaim.miscellaneous_description}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mileage Petrol cost */}
                            {selectedClaim.distance_km && (
                                <div className="border border-gray-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Local Distance</span>
                                        <span className="font-extrabold text-gray-700 block mt-0.5">{selectedClaim.distance_km} km</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Petrol Rate</span>
                                        <span className="font-extrabold text-gray-700 block mt-0.5">₹{selectedClaim.petrol_rate_at_submission || 4.00}/km</span>
                                    </div>
                                    <div>
                                         <span className="text-[9px] text-[var(--primary-800)] font-bold uppercase block">Total Petrol Cost</span>
                                         <span className="font-extrabold text-[var(--primary-600)] block mt-0.5">₹{selectedClaim.petrol_amount}</span>
                                    </div>
                                </div>
                            )}

                            {/* Food allowances sum */}
                            {(selectedClaim.breakfast_amount > 0 || selectedClaim.lunch_amount > 0 || selectedClaim.dinner_amount > 0) && (
                                <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
                                    <span className="font-bold text-gray-700 uppercase block mb-1">Meal Claims Summary</span>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-gray-50 p-2 rounded-xl">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Breakfast</span>
                                            <span className="font-bold text-gray-700 block mt-0.5">₹{selectedClaim.breakfast_amount}</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-xl">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Lunch</span>
                                            <span className="font-bold text-gray-700 block mt-0.5">₹{selectedClaim.lunch_amount}</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-xl">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Dinner</span>
                                            <span className="font-bold text-gray-700 block mt-0.5">₹{selectedClaim.dinner_amount}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reimbursement items table */}
                            {selectedClaim.reimbursement_items && selectedClaim.reimbursement_items.length > 0 && (
                                <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
                                    <span className="font-bold text-gray-700 uppercase block mb-2">Custom / Consumable Reimbursement List</span>
                                    <div className="space-y-2">
                                        {selectedClaim.reimbursement_items.map((item: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-gray-700">{item.name}</span>
                                                    {item.description && <p className="text-[10px] text-gray-400 mt-0.5 italic">"{item.description}"</p>}
                                                </div>
                                                <span className="font-extrabold text-gray-800 text-sm">₹{Number(item.amount).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Proof attachments */}
                            {selectedClaim.proof_urls && selectedClaim.proof_urls.length > 0 && (
                                <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
                                    <span className="font-bold text-gray-700 uppercase block mb-2">Receipt Document Attachments</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedClaim.proof_urls.map((url: string, index: number) => (
                                            <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative aspect-square rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden hover:opacity-90 hover:border-[var(--primary-300)] transition-all cursor-pointer group"
                                            >
                                                {url.endsWith('.pdf') ? (
                                                    <div className="flex flex-col items-center justify-center p-2 text-center">
                                                        <FileText size={24} className="text-red-500" />
                                                        <span className="text-[8px] truncate max-w-full font-bold mt-1">Receipt {index + 1}</span>
                                                    </div>
                                                ) : (
                                                    <img src={url} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink size={14} className="text-white" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Claimant Notes */}
                            {selectedClaim.notes && (
                                <div>
                                    <span className="font-bold text-gray-700 uppercase block mb-1">Additional Notes / Remarks</span>
                                    <p className="bg-gray-50 border border-gray-100 p-3 rounded-xl font-medium text-gray-600 leading-relaxed">
                                        {selectedClaim.notes}
                                    </p>
                                </div>
                            )}

                            {/* Historical reviews / Accountant Notes */}
                            {selectedClaim.status !== 'pending' && (
                                <div className={`border rounded-2xl p-4 ${selectedClaim.status === 'approved' ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                                    <span className="font-bold uppercase block text-[10px] mb-1">Accountant Review Summary</span>
                                    <div className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase">Reviewed on {formatDate(selectedClaim.reviewed_at)}</div>
                                    {selectedClaim.review_notes ? (
                                        <p className="italic text-gray-600">"{selectedClaim.review_notes}"</p>
                                    ) : (
                                        <span className="text-gray-400 italic">No notes logged</span>
                                    )}
                                </div>
                            )}

                            {/* Rejection comment input (Only when rejecting) */}
                            {rejecting && (
                                <div className="border border-red-100 bg-red-50/20 p-4 rounded-2xl space-y-2 shrink-0 animate-scale-up">
                                    <label className="block font-bold text-red-800 uppercase">Review notes / Rejection Reason *</label>
                                    <textarea
                                        rows={2}
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        required
                                        placeholder="Kindly specify a detailed reason for claim rejection (e.g. invalid receipt, incorrect mileage calculation)..."
                                        className="w-full px-3 py-2 border border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-100 bg-white rounded-xl text-xs resize-none placeholder:text-red-300"
                                    />
                                </div>
                            )}

                            {/* Claim Grand Total */}
                            <div className="bg-[var(--primary-50)] border border-[var(--primary-100)]/50 p-4 rounded-2xl flex items-center justify-between shrink-0">
                                <div>
                                    <span className="font-bold text-[var(--primary-800)] uppercase tracking-wider text-[10px] block">Grand Claim Total</span>
                                    <span className="text-[9px] text-gray-400">Total requested reimbursement sum</span>
                                </div>
                                <span className="text-xl font-extrabold text-[var(--primary-600)]">₹{Number(selectedClaim.total_amount).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions (Only for pending claims) */}
                        {selectedClaim.status === 'pending' && (
                            <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center gap-3 shrink-0">
                                {rejecting ? (
                                    <>
                                        <button
                                            onClick={() => setRejecting(false)}
                                            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-all active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleReviewClaim('rejected')}
                                            disabled={loadingAction || !reviewNotes || reviewNotes.trim() === ''}
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                            Confirm Rejection
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setRejecting(true)
                                                setError(null)
                                            }}
                                            className="flex-1 py-3 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs transition-all active:scale-95"
                                        >
                                            Reject Claim
                                        </button>
                                        <button
                                            onClick={() => handleReviewClaim('approved')}
                                            disabled={loadingAction}
                                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                            Approve & Disburse
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
