'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
    Building2, 
    Plus, 
    Search, 
    Calendar,
    RefreshCw,
    AlertCircle,
    SlidersHorizontal,
    TrendingUp,
    FileText,
    CheckCircle2,
    Clock,
    Ban
} from 'lucide-react'
import { Card, CardContent, Modal, ModalFooter, Button, Input, Select, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Hospital {
    id: string
    name: string
    city: string
    is_active: boolean
}

interface ServiceType {
    id: string
    name: string
    category: 'diagnostics' | 'therapeutics'
}

interface ChargeRow {
    id: string
    hospital_id: string
    hospital_name: string
    hospital_city: string
    service_type_id: string
    service_name: string
    service_category: 'diagnostics' | 'therapeutics'
    amount: number
    gst_applicable: boolean
    tds_applicable: boolean
    effective_from: string
    valid_until: string | null
    created_at: string
}

export default function HospitalChargesPage() {
    const [charges, setCharges] = useState<ChargeRow[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [services, setServices] = useState<ServiceType[]>([])
    
    // UI filters
    const [loadingCharges, setLoadingCharges] = useState(true)
    const [searchHospital, setSearchHospital] = useState('')
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<'active' | 'all'>('active')

    // Modal
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [pricingHospitalId, setPricingHospitalId] = useState('')
    const [pricingServiceId, setPricingServiceId] = useState('')
    const [pricingAmount, setPricingAmount] = useState('')
    const [pricingGst, setPricingGst] = useState(false)
    const [pricingTds, setPricingTds] = useState(false)
    const [pricingEffectiveDate, setPricingEffectiveDate] = useState(new Date().toISOString().split('T')[0])
    const [pricingError, setPricingError] = useState('')
    const [submittingPricing, setSubmittingPricing] = useState(false)

    // Fetch lists
    const fetchHospitals = async () => {
        try {
            const res = await fetch('/api/hospitals')
            const result = await res.json()
            if (result.success) {
                setHospitals(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch hospitals:', err)
        }
    }

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/service-types')
            const result = await res.json()
            if (result.success) {
                setServices(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch service types:', err)
        }
    }

    const fetchCharges = useCallback(async () => {
        setLoadingCharges(true)
        try {
            const res = await fetch(`/api/hospital-charges?active=${filterStatus === 'active'}`)
            const result = await res.json()
            if (result.success) {
                setCharges(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch charges:', err)
        } finally {
            setLoadingCharges(false)
        }
    }, [filterStatus])

    useEffect(() => {
        fetchHospitals()
        fetchServices()
    }, [])

    useEffect(() => {
        fetchCharges()
    }, [fetchCharges])

    // SavePricing
    const handleSavePricing = async (e: React.FormEvent) => {
        e.preventDefault()
        setPricingError('')

        if (!pricingHospitalId) {
            setPricingError('Please select a Hospital.')
            return
        }
        if (!pricingServiceId) {
            setPricingError('Please select a Service.')
            return
        }

        const parsedAmount = parseFloat(pricingAmount)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            setPricingError('Please enter a valid positive base amount.')
            return
        }

        setSubmittingPricing(true)
        try {
            const res = await fetch('/api/hospital-charges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hospital_id: pricingHospitalId,
                    service_type_id: pricingServiceId,
                    amount: parsedAmount,
                    gst_applicable: pricingGst,
                    tds_applicable: pricingTds,
                    effective_from: pricingEffectiveDate
                })
            })
            const result = await res.json()
            if (result.success) {
                setIsPricingModalOpen(false)
                setPricingHospitalId('')
                setPricingServiceId('')
                setPricingAmount('')
                setPricingGst(false)
                setPricingTds(false)
                setPricingEffectiveDate(new Date().toISOString().split('T')[0])
                fetchCharges()
            } else {
                setPricingError(result.error || 'Failed to save rate pricing.')
            }
        } catch (err) {
            setPricingError('Network error. Failed to save.')
        } finally {
            setSubmittingPricing(false)
        }
    }

    // Date/Status badge formatter
    const getStatusBadge = (row: ChargeRow) => {
        const todayStr = new Date().toISOString().split('T')[0]
        
        if (row.valid_until && row.valid_until < todayStr) {
            return (
                <Badge className="bg-gray-50 border border-gray-200 text-gray-500 flex items-center gap-1 w-fit">
                    <Ban size={12} />
                    Expired
                </Badge>
            )
        }

        if (row.effective_from > todayStr) {
            return (
                <Badge className="bg-amber-50 border border-amber-200 text-amber-600 flex items-center gap-1 w-fit">
                    <Clock size={12} />
                    Scheduled
                </Badge>
            )
        }

        return (
            <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center gap-1 w-fit">
                <CheckCircle2 size={12} />
                Active Rate
            </Badge>
        )
    }

    // Filter charges list
    const filteredCharges = charges.filter(row => {
        const matchesSearch = row.hospital_name.toLowerCase().includes(searchHospital.toLowerCase()) ||
                              row.hospital_city.toLowerCase().includes(searchHospital.toLowerCase())
        const matchesCategory = filterCategory === 'all' || row.service_category === filterCategory
        return matchesSearch && matchesCategory
    })

    // Group charges by hospital for a beautiful premium structured layout
    const groupedCharges = filteredCharges.reduce((acc, row) => {
        if (!acc[row.hospital_id]) {
            acc[row.hospital_id] = {
                hospital_name: row.hospital_name,
                hospital_city: row.hospital_city,
                rows: []
            }
        }
        acc[row.hospital_id].rows.push(row)
        return acc
    }, {} as Record<string, { hospital_name: string; hospital_city: string; rows: ChargeRow[] }>)

    // Count stats
    const activeHospitalsCount = Array.from(new Set(charges.map(c => c.hospital_id))).length
    const activeAllocationsCount = charges.length

    return (
        <div className="flex flex-col min-h-screen bg-[var(--gray-50)] pb-12 rose-theme">
            {/* Header */}
            <div className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Hospital Charge Allocation</h1>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Manage service charge rates per hospital</p>
                    </div>
                    <button
                        onClick={() => {
                            setPricingError('')
                            setPricingHospitalId('')
                            setPricingServiceId('')
                            setPricingAmount('')
                            setPricingGst(false)
                            setPricingTds(false)
                            setPricingEffectiveDate(new Date().toISOString().split('T')[0])
                            setIsPricingModalOpen(true)
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} /> Add Allocation
                    </button>
                </div>
            </div>

            <div className="px-6 mt-6 w-full space-y-6">
                {/* Stats Grid */}
                <div className="stats-grid-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="stat-card bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                        <div className="stat-icon w-11 h-11 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 text-xl">
                            <Building2 size={20} />
                        </div>
                        <div className="stat-body">
                            <div className="stat-label text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Hospitals</div>
                            <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                                {loadingCharges ? '...' : activeHospitalsCount}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                        <div className="stat-icon w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-xl">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="stat-body">
                            <div className="stat-label text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Current Allocations</div>
                            <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                                {loadingCharges ? '...' : activeAllocationsCount}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter section card */}
                <div className="section-card bg-white p-4 rounded-xl border border-[var(--border-light)] shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                        <div className="search-box flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg flex-1 min-w-[280px] w-full sm:w-auto">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                                placeholder="Search by hospital or service name..."
                                className="text-sm focus:outline-none w-full bg-transparent text-gray-700"
                                value={searchHospital}
                                onChange={(e) => setSearchHospital(e.target.value)}
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none w-full sm:w-[200px]"
                        >
                            <option value="all">All Service Categories</option>
                            <option value="diagnostics">Diagnostics Only</option>
                            <option value="therapeutics">Therapeutics Only</option>
                        </select>
                        <button
                            onClick={() => setFilterStatus(prev => prev === 'active' ? 'all' : 'active')}
                            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold h-9 px-4 rounded-lg flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
                        >
                            <Calendar size={13} />
                            {filterStatus === 'active' ? 'Show History' : 'Hide History'}
                        </button>
                    </div>
                </div>

                {/* Table Wrap */}
                <div className="table-wrap bg-white border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {loadingCharges ? (
                            <div className="p-12 flex justify-center"><RefreshCw size={24} className="animate-spin text-pink-600" /></div>
                        ) : filteredCharges.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <AlertCircle size={32} className="text-pink-300 mx-auto mb-2" />
                                <p className="text-sm">No service charges recorded matching active filters.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500">
                                        <th className="p-4">Hospital</th>
                                        <th className="p-4">Diagnostics</th>
                                        <th className="p-4">Therapeutics</th>
                                        <th className="p-4 text-right">Amount (₹)</th>
                                        <th className="p-4 text-center">GST</th>
                                        <th className="p-4 text-center">TDS</th>
                                        <th className="p-4">Start Date</th>
                                        <th className="p-4">End Date</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCharges.map((row) => (
                                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-gray-800">
                                                {row.hospital_name}
                                                <div className="text-[10px] text-gray-400 font-normal mt-0.5">{row.hospital_city}</div>
                                            </td>
                                            <td className="p-4">
                                                {row.service_category === 'diagnostics' ? (
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{row.service_name}</div>
                                                        <div className="td-sm text-[9px] text-pink-600 font-bold mt-0.5 tracking-wider uppercase">DIAGNOSTICS</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-normal">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {row.service_category === 'therapeutics' ? (
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{row.service_name}</div>
                                                        <div className="td-sm text-[9px] text-pink-600 font-bold mt-0.5 tracking-wider uppercase">THERAPEUTICS</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-normal">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-extrabold text-gray-800 text-sm">₹{Number(row.amount).toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-center">
                                                {row.gst_applicable ? (
                                                    <span className="badge badge-green bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full px-2.5 py-0.5 font-bold text-[10px]">✓</span>
                                                ) : (
                                                    <span className="badge badge-gray bg-gray-100 border border-gray-200 text-gray-400 rounded-full px-2.5 py-0.5 font-bold text-[10px]">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {row.tds_applicable ? (
                                                    <span className="badge badge-green bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full px-2.5 py-0.5 font-bold text-[10px]">✓</span>
                                                ) : (
                                                    <span className="badge badge-gray bg-gray-100 border border-gray-200 text-gray-400 rounded-full px-2.5 py-0.5 font-bold text-[10px]">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-500 font-semibold">{formatDate(row.effective_from)}</td>
                                            <td className="p-4 text-gray-400 font-medium">{row.valid_until ? formatDate(row.valid_until) : 'Open-ended'}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setPricingError('')
                                                        setPricingHospitalId(row.hospital_id)
                                                        setPricingServiceId(row.service_type_id)
                                                        setPricingAmount(String(row.amount))
                                                        setPricingGst(row.gst_applicable)
                                                        setPricingTds(row.tds_applicable)
                                                        setPricingEffectiveDate(row.effective_from)
                                                        setIsPricingModalOpen(true)
                                                    }}
                                                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold py-1 px-3 rounded transition-colors cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* CONFIGURE NEW RATE MODAL */}
            <Modal
                isOpen={isPricingModalOpen}
                onClose={() => setIsPricingModalOpen(false)}
                title="Configure Pricing Rate"
                description="Set or schedule base price structures, GST, and TDS requirements for partner hospitals."
                size="md"
            >
                <form onSubmit={handleSavePricing} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Partner Hospital *</label>
                        <Select 
                            required
                            value={pricingHospitalId}
                            onChange={(e) => setPricingHospitalId(e.target.value)}
                            className="border-gray-200 h-10 bg-white"
                        >
                            <option value="">-- Choose Hospital --</option>
                            {hospitals.map(h => (
                                <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Diagnostic/Therapeutic Service *</label>
                        <Select 
                            required
                            value={pricingServiceId}
                            onChange={(e) => setPricingServiceId(e.target.value)}
                            className="border-gray-200 h-10 bg-white"
                        >
                            <option value="">-- Choose Service Type --</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Base Service Amount (₹) *</label>
                        <Input 
                            type="number"
                            placeholder="Enter amount (e.g. 7500)"
                            required
                            step="0.01"
                            min="0.00"
                            value={pricingAmount}
                            onChange={(e) => setPricingAmount(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-rose-100 bg-rose-50/20">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={pricingGst}
                                onChange={(e) => setPricingGst(e.target.checked)}
                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                            />
                            <div>
                                <div className="text-xs font-bold text-gray-900">Apply GST</div>
                                <div className="text-[10px] text-gray-400">18% standard rate addition</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={pricingTds}
                                onChange={(e) => setPricingTds(e.target.checked)}
                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                            />
                            <div>
                                <div className="text-xs font-bold text-gray-900">Withhold TDS</div>
                                <div className="text-[10px] text-gray-400">10% tax deduct at source</div>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pricing Effective Date *</label>
                        <Input 
                            type="date"
                            required
                            value={pricingEffectiveDate}
                            onChange={(e) => setPricingEffectiveDate(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    {/* Point-in-Time safety alert */}
                    <div className="flex gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 text-xs leading-relaxed">
                        <TrendingUp size={16} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <span className="font-bold">Append-Only Audit Notice:</span> Creating a new rate preserves historical logs. Any existing active rate for this service at the selected hospital will automatically valid-expire a day prior to this new date.
                        </div>
                    </div>

                    {pricingError && (
                        <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{pricingError}</span>
                        </div>
                    )}

                    <ModalFooter>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsPricingModalOpen(false)}
                        >
                            Discard
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-colors duration-200"
                            isLoading={submittingPricing}
                        >
                            Save Pricing Rate
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
