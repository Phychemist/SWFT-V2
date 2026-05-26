'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Wallet,
    Receipt,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Plus,
    Trash2,
    Upload,
    FileText,
    Save,
    X,
    Activity
} from 'lucide-react'
import Link from 'next/link'

interface ReimbursementItem {
    name: string
    amount: number
    description: string
}

export default function ManagerClaimsPage() {
    const router = useRouter()

    const [stats, setStats] = useState<any>({
        total_allocated: 0,
        total_claimed: 0,
        available_balance: 0,
        pending_claims_amount: 0
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
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [isResubmission, setIsResubmission] = useState(false)

    // Form fields state
    const [reason, setReason] = useState('')
    const [outstationTravel, setOutstationTravel] = useState(false)
    const [fromPlace, setFromPlace] = useState('')
    const [toPlace, setToPlace] = useState('')
    const [distanceKm, setDistanceKm] = useState('')
    const [breakfastAmount, setBreakfastAmount] = useState('')
    const [lunchAmount, setLunchAmount] = useState('')
    const [dinnerAmount, setDinnerAmount] = useState('')
    const [reimbursementItems, setReimbursementItems] = useState<ReimbursementItem[]>([])
    const [accommodationAmount, setAccommodationAmount] = useState('')
    const [travelAllowanceAmount, setTravelAllowanceAmount] = useState('')
    const [miscellaneousAmount, setMiscellaneousAmount] = useState('')
    const [miscellaneousDescription, setMiscellaneousDescription] = useState('')
    const [notes, setNotes] = useState('')
    const [proofUrls, setProofUrls] = useState<string[]>([])
    const [uploadingReceipt, setUploadingReceipt] = useState(false)

    // Fetch initial data
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
            if (ratesData.success) setRatesConfig(ratesData.data)
        } catch (err) {
            console.error('Error fetching claims page data:', err)
            setError('Failed to retrieve expense claims data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingReceipt(true)
            setError(null)
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/claims/upload', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (data.success) {
                setProofUrls(prev => [...prev, data.data.url])
                setSuccess('Receipt uploaded successfully')
                setTimeout(() => setSuccess(null), 2000)
            } else {
                setError(data.error || 'Failed to upload receipt proof')
            }
        } catch (err) {
            setError('Error occurred during file upload')
        } finally {
            setUploadingReceipt(false)
        }
    }

    const removeProofUrl = (index: number) => {
        setProofUrls(prev => prev.filter((_, i) => i !== index))
    }

    const addReimbursementRow = () => {
        setReimbursementItems(prev => [...prev, { name: '', amount: 0, description: '' }])
    }

    const removeReimbursementRow = (index: number) => {
        setReimbursementItems(prev => prev.filter((_, i) => i !== index))
    }

    const updateReimbursementItem = (index: number, field: keyof ReimbursementItem, value: any) => {
        setReimbursementItems(prev => {
            const updated = [...prev]
            if (field === 'amount') {
                updated[index].amount = Number(value) || 0
            } else {
                updated[index][field] = value as string
            }
            return updated
        })
    }

    // Dynamic Petrol Amount
    const calculatedPetrolAmount = Number(distanceKm || 0) * Number(ratesConfig.petrol_rate_per_km || 4.00)

    // Dynamic Total Amount
    const calculatedTotal =
        calculatedPetrolAmount +
        Number(breakfastAmount || 0) +
        Number(lunchAmount || 0) +
        Number(dinnerAmount || 0) +
        Number(accommodationAmount || 0) +
        Number(travelAllowanceAmount || 0) +
        Number(miscellaneousAmount || 0) +
        reimbursementItems.reduce((acc, item) => acc + (item.amount || 0), 0)

    const handleOpenSubmitClaim = () => {
        setIsResubmission(false)
        setReason('')
        setOutstationTravel(false)
        setFromPlace('')
        setToPlace('')
        setDistanceKm('')
        setBreakfastAmount('')
        setLunchAmount('')
        setDinnerAmount('')
        setAccommodationAmount('')
        setTravelAllowanceAmount('')
        setMiscellaneousAmount('')
        setMiscellaneousDescription('')
        setReimbursementItems([])
        setNotes('')
        setProofUrls([])
        setError(null)
        setShowModal(true)
    }

    const handleOpenResubmission = (rejectedClaim: any) => {
        setIsResubmission(true)
        setReason(rejectedClaim.reason || '')
        setOutstationTravel(rejectedClaim.outstation_travel || false)
        setFromPlace(rejectedClaim.from_place || '')
        setToPlace(rejectedClaim.to_place || '')
        setDistanceKm(rejectedClaim.distance_km ? String(rejectedClaim.distance_km) : '')
        setBreakfastAmount(rejectedClaim.breakfast_amount ? String(rejectedClaim.breakfast_amount) : '')
        setLunchAmount(rejectedClaim.lunch_amount ? String(rejectedClaim.lunch_amount) : '')
        setDinnerAmount(rejectedClaim.dinner_amount ? String(rejectedClaim.dinner_amount) : '')
        setAccommodationAmount(rejectedClaim.accommodation_amount ? String(rejectedClaim.accommodation_amount) : '')
        setTravelAllowanceAmount(rejectedClaim.travel_allowance_amount ? String(rejectedClaim.travel_allowance_amount) : '')
        setMiscellaneousAmount(rejectedClaim.miscellaneous_amount ? String(rejectedClaim.miscellaneous_amount) : '')
        setMiscellaneousDescription(rejectedClaim.miscellaneous_description || '')
        setReimbursementItems(rejectedClaim.reimbursement_items || [])
        setNotes(rejectedClaim.notes || '')
        setProofUrls(rejectedClaim.proof_urls || [])
        setError(null)
        setShowModal(true)
    }

    const handleSubmitClaim = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!reason || reason.trim() === '') {
            setError('A business reason description is required for Manager claims.')
            return
        }

        const bAmount = Number(breakfastAmount || 0)
        const lAmount = Number(lunchAmount || 0)
        const dAmount = Number(dinnerAmount || 0)

        if (bAmount > ratesConfig.breakfast_max) {
            setError(`Breakfast claim cannot exceed ₹${ratesConfig.breakfast_max}.`)
            return
        }
        if (lAmount > ratesConfig.lunch_max) {
            setError(`Lunch claim cannot exceed ₹${ratesConfig.lunch_max}.`)
            return
        }
        if (dAmount > ratesConfig.dinner_max) {
            setError(`Dinner claim cannot exceed ₹${ratesConfig.dinner_max}.`)
            return
        }

        try {
            setLoadingAction(true)
            setError(null)

            const claimData = {
                reason: reason,
                outstation_travel: outstationTravel,
                from_place: outstationTravel ? fromPlace : null,
                to_place: outstationTravel ? toPlace : null,
                distance_km: Number(distanceKm) || 0,
                breakfast_amount: bAmount,
                lunch_amount: lAmount,
                dinner_amount: dAmount,
                accommodation_amount: outstationTravel ? Number(accommodationAmount || 0) : 0,
                travel_allowance_amount: outstationTravel ? Number(travelAllowanceAmount || 0) : 0,
                miscellaneous_amount: outstationTravel ? Number(miscellaneousAmount || 0) : 0,
                miscellaneous_description: outstationTravel ? miscellaneousDescription : null,
                reimbursement_items: reimbursementItems.filter(i => i.name && i.amount > 0),
                proof_urls: proofUrls,
                notes: notes
            }

            const res = await fetch('/api/expense-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(claimData)
            })

            const data = await res.json()
            if (data.success) {
                setSuccess(isResubmission ? 'Claim successfully resubmitted!' : 'Claim submitted successfully!')
                setShowModal(false)
                setTimeout(() => setSuccess(null), 3000)
                await fetchData()
            } else {
                setError(data.error || 'Failed to submit claim request')
            }
        } catch (err) {
            setError('An error occurred during submission.')
        } finally {
            setLoadingAction(false)
        }
    }

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
            <div className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10 px-4 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/manager" className="p-2 -ml-2 rounded-full hover:bg-[var(--gray-50)] text-gray-600 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">My Balance & Claims</h1>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Manager Expense Management</p>
                        </div>
                    </div>
                    <button
                        onClick={handleOpenSubmitClaim}
                        className="bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <Plus size={14} /> Raise Claim
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6 w-full space-y-6">
                {/* Error/Success banners */}
                {error && !showModal && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-sm flex items-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-2xl text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Available Seragen Account Balance */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-pink-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Available Seragen Account Balance</span>
                            <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg"><Wallet size={16} /></div>
                        </div>
                        <div className="text-2xl font-extrabold text-pink-600">
                            {loading ? <Loader2 className="animate-spin text-pink-500" size={24} /> : `₹${stats.available_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Liquid fund balance available to you</p>
                    </div>

                    {/* Card 2: Allocated */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-indigo-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Allocated</span>
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Wallet size={16} /></div>
                        </div>
                        <div className="text-xl font-bold text-gray-800">
                            {loading ? <Loader2 className="animate-spin text-indigo-500" size={20} /> : `₹${stats.total_allocated?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                    </div>

                    {/* Card 3: Approved */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-green-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Approved Expenses</span>
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Receipt size={16} /></div>
                        </div>
                        <div className="text-xl font-bold text-gray-800">
                            {loading ? <Loader2 className="animate-spin text-green-500" size={20} /> : `₹${stats.total_claimed?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-light)] bg-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <Activity size={16} className="text-[var(--primary-600)]" />
                            EXPENSE CLAIM HISTORY
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-[var(--primary-600)]" /></div>
                        ) : claims.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                                <h3 className="font-bold text-sm text-gray-600">No expense claims raised</h3>
                                <p className="text-xs mt-1">Submit a business claim to request reimbursement.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-500">
                                        <th className="p-4">Submission Date</th>
                                        <th className="p-4">Business Reason</th>
                                        <th className="p-4">Travel Details</th>
                                        <th className="p-4 text-right">Claim Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Review Notes / Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claims.map((claim) => (
                                        <tr key={claim.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-medium text-gray-500">{formatDate(claim.created_at)}</td>
                                            <td className="p-4 max-w-xs font-semibold text-gray-700 truncate">{claim.reason || 'General Claim'}</td>
                                            <td className="p-4">
                                                {claim.outstation_travel ? (
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase tracking-wider text-[9px]">
                                                        Outstation ({claim.from_place} ➔ {claim.to_place})
                                                    </span>
                                                ) : claim.distance_km ? (
                                                    <span>Local ({claim.distance_km} km)</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">None</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-800 text-sm">₹{Number(claim.total_amount).toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full uppercase font-bold text-[9px] border ${getStatusStyle(claim.status)}`}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                {claim.status === 'rejected' ? (
                                                    <div className="space-y-1.5">
                                                        {claim.review_notes && (
                                                            <div className="bg-red-50 text-red-800 p-2 rounded-lg text-[10px] leading-relaxed italic border border-red-100">
                                                                "{claim.review_notes}"
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenResubmission(claim)}
                                                            className="text-pink-600 font-bold hover:underline block text-[10px] uppercase tracking-wider"
                                                        >
                                                            Resubmit ➔
                                                        </button>
                                                    </div>
                                                ) : claim.status === 'approved' && claim.review_notes ? (
                                                    <span className="text-gray-400 italic">"{claim.review_notes}"</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">—</span>
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

            {/* Submit / Resubmit Claim Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                        {/* Modal Header */}
                        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                                    <Receipt className="text-[var(--primary-600)]" />
                                    {isResubmission ? 'RESUBMIT REJECTED EXPENSE CLAIM' : 'RAISE EXPENSE CLAIM'}
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                                    {isResubmission ? 'Logs a new entry to preserve historical logs' : 'Claims are validated against allowance caps'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form Body - Scrollable */}
                        <form onSubmit={handleSubmitClaim} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl text-xs flex items-center gap-2 shrink-0">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Business Reason */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1.5">Business Reason / Description *</label>
                                <textarea
                                    rows={2}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    placeholder="Explain why this expense claim is being raised (e.g. Q2 Chennai Client dinner, offsite travel)..."
                                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 resize-none font-medium placeholder:text-gray-400"
                                />
                            </div>

                            {/* Outstation travel toggle */}
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div>
                                    <label className="font-bold text-gray-700 uppercase block">Outstation Travel</label>
                                    <span className="text-[10px] text-gray-400">Enable if travel was outside local jurisdiction</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOutstationTravel(!outstationTravel)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${outstationTravel ? 'bg-[var(--primary-600)]' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${outstationTravel ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Outstation fields */}
                            {outstationTravel && (
                                <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">From Place</label>
                                            <input
                                                type="text"
                                                required={outstationTravel}
                                                value={fromPlace}
                                                onChange={(e) => setFromPlace(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800"
                                                placeholder="Origin city"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">To Place</label>
                                            <input
                                                type="text"
                                                required={outstationTravel}
                                                value={toPlace}
                                                onChange={(e) => setToPlace(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800"
                                                placeholder="Destination city"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">Accommodation (₹)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={accommodationAmount}
                                                onChange={(e) => setAccommodationAmount(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">Travel Allowance (₹)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={travelAllowanceAmount}
                                                onChange={(e) => setTravelAllowanceAmount(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">Misc (₹)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={miscellaneousAmount}
                                                onChange={(e) => setMiscellaneousAmount(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {Number(miscellaneousAmount) > 0 && (
                                        <div>
                                            <label className="block font-bold text-gray-500 uppercase mb-1">Misc Description *</label>
                                            <input
                                                type="text"
                                                required={Number(miscellaneousAmount) > 0}
                                                value={miscellaneousDescription}
                                                onChange={(e) => setMiscellaneousDescription(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800"
                                                placeholder="Explain miscellaneous expenses"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Local travel petrol claim */}
                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1">Distance (km)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={distanceKm}
                                        onChange={(e) => setDistanceKm(e.target.value)}
                                        className="w-full px-3 py-3 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                        placeholder="0.00"
                                    />
                                    <span className="text-[10px] text-gray-400 mt-1 block">Local rate: ₹{ratesConfig.petrol_rate_per_km}/km</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Computed Petrol Cost</span>
                                    <span className="text-lg font-bold text-gray-700 mt-1">₹{calculatedPetrolAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Food allowances */}
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <label className="block font-bold text-gray-700 uppercase">Food Claims (Max Allowances Displayed)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Breakfast</span>
                                            <span className="text-[9px] text-pink-600 font-bold">Max ₹{ratesConfig.breakfast_max}</span>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={ratesConfig.breakfast_max}
                                            value={breakfastAmount}
                                            onChange={(e) => setBreakfastAmount(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Lunch</span>
                                            <span className="text-[9px] text-pink-600 font-bold">Max ₹{ratesConfig.lunch_max}</span>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={ratesConfig.lunch_max}
                                            value={lunchAmount}
                                            onChange={(e) => setLunchAmount(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Dinner</span>
                                            <span className="text-[9px] text-pink-600 font-bold">Max ₹{ratesConfig.dinner_max}</span>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={ratesConfig.dinner_max}
                                            value={dinnerAmount}
                                            onChange={(e) => setDinnerAmount(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Custom Items Reimbursements table */}
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block font-bold text-gray-700 uppercase">Custom items / Reimbursements</label>
                                    <button
                                        type="button"
                                        onClick={addReimbursementRow}
                                        className="text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 hover:underline"
                                    >
                                        <Plus size={14} /> Add Row
                                    </button>
                                </div>

                                {reimbursementItems.length > 0 && (
                                    <div className="space-y-3">
                                        {reimbursementItems.map((item, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-3">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="col-span-2">
                                                        <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Item Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={item.name}
                                                            onChange={(e) => updateReimbursementItem(idx, 'name', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-800 text-[11px]"
                                                            placeholder="Client dinner, travel tickets..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Amount (₹)</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            min={1}
                                                            value={item.amount || ''}
                                                            onChange={(e) => updateReimbursementItem(idx, 'amount', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-800 text-[11px] font-bold"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateReimbursementItem(idx, 'description', e.target.value)}
                                                        className="flex-1 px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-800 text-[10px]"
                                                        placeholder="Item description / details"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeReimbursementRow(idx)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Proof URL receipt uploads */}
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <label className="block font-bold text-gray-700 uppercase">Receipt Proofs / Invoices (Optional)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {proofUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-square rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center group overflow-hidden">
                                            {url.endsWith('.pdf') ? (
                                                <div className="flex flex-col items-center justify-center p-2 text-center">
                                                    <FileText size={20} className="text-red-500" />
                                                    <span className="text-[8px] truncate max-w-full font-bold mt-1">Receipt {index + 1}</span>
                                                </div>
                                            ) : (
                                                <img src={url} alt={`Receipt ${index + 1}`} className="w-full h-full object-cover" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeProofUrl(index)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-gray-50 cursor-pointer">
                                        {uploadingReceipt ? <Loader2 size={18} className="animate-spin text-pink-600" /> : <Upload size={18} />}
                                        <span className="text-[8px] font-bold uppercase tracking-wider">Add Receipt</span>
                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploadingReceipt} />
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block font-bold text-gray-700 uppercase mb-1.5">Additional Notes / Remarks</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Explain any details regarding this reimbursement request..."
                                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-xl focus:outline-none bg-white text-gray-800 resize-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Live preview total sum */}
                            <div className="bg-pink-50 border border-pink-100/50 p-4 rounded-2xl flex items-center justify-between shrink-0">
                                <div>
                                    <span className="font-bold text-pink-800 uppercase tracking-wider text-[10px] block">Live Preview Total</span>
                                    <span className="text-[9px] text-gray-400">Total request amount calculated live</span>
                                </div>
                                <span className="text-xl font-extrabold text-pink-600">₹{calculatedTotal.toFixed(2)}</span>
                            </div>

                            {/* Submit buttons */}
                            <div className="pt-2 shrink-0">
                                <button
                                    type="submit"
                                    disabled={loadingAction || uploadingReceipt || calculatedTotal <= 0}
                                    className="w-full py-3.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98"
                                >
                                    {loadingAction ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isResubmission ? 'Confirm & Resubmit Claim' : 'Submit Claim Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
