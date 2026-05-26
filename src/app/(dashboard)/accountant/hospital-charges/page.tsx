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

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header section with Premium rose accents */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
                            <Building2 size={20} />
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900">Hospital Pricing & Service Charges</h1>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure baseline hospital pricing per service category. Preserves point-in-time rates for audits.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => {
                            setPricingError('')
                            setIsPricingModalOpen(true)
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-colors duration-200"
                        leftIcon={<Plus size={16} />}
                    >
                        Configure New Rate
                    </Button>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-rose-100/60 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">
                            <Search size={16} />
                        </span>
                        <Input 
                            placeholder="Filter by Hospital name..." 
                            className="pl-9 h-10 text-sm border-gray-200"
                            value={searchHospital}
                            onChange={(e) => setSearchHospital(e.target.value)}
                        />
                    </div>
                    
                    <Select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="h-10 text-sm border-gray-200"
                    >
                        <option value="all">All Service Categories</option>
                        <option value="diagnostics">Diagnostics Only</option>
                        <option value="therapeutics">Therapeutics Only</option>
                    </Select>

                    <Select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'active' | 'all')}
                        className="h-10 text-sm border-gray-200"
                    >
                        <option value="active">Active Pricing Only</option>
                        <option value="all">All Historical Logs</option>
                    </Select>
                </div>

                <div className="text-xs text-gray-500 shrink-0 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                    <SlidersHorizontal size={12} className="text-pink-500" />
                    Showing {filteredCharges.length} pricing rows
                </div>
            </div>

            {/* Pricing Cards Grid (grouped by Hospital) */}
            {loadingCharges ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-rose-100/60 rounded-2xl shadow-sm">
                    <RefreshCw size={32} className="animate-spin text-pink-600 mb-3" />
                    <p className="text-sm text-gray-500 font-semibold">Loading pricing matrix...</p>
                </div>
            ) : Object.keys(groupedCharges).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-rose-100/60 rounded-2xl shadow-sm text-gray-400 text-sm">
                    <AlertCircle size={32} className="text-pink-300 mb-2" />
                    <span>No service charges recorded matching active filters.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {Object.entries(groupedCharges).map(([hospitalId, group]) => (
                        <Card key={hospitalId} className="border border-rose-100/60 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-[4px] h-full bg-pink-600" />
                            <CardContent className="p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <Building2 size={18} className="text-pink-600" />
                                            {group.hospital_name}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-semibold uppercase mt-0.5 tracking-wider">
                                            City: {group.hospital_city}
                                        </p>
                                    </div>
                                    <Badge className="bg-pink-50 border border-pink-200 text-pink-600 h-fit text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                                        {group.rows.length} Rates Configured
                                    </Badge>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-500">
                                        <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2.5">Service Name</th>
                                                <th className="px-4 py-2.5">Category</th>
                                                <th className="px-4 py-2.5 text-right">Base Amount (₹)</th>
                                                <th className="px-4 py-2.5 text-center">GST Apply</th>
                                                <th className="px-4 py-2.5 text-center">TDS Apply</th>
                                                <th className="px-4 py-2.5">Effective From</th>
                                                <th className="px-4 py-2.5">Valid Until</th>
                                                <th className="px-4 py-2.5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-xs">
                                            {group.rows.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50/30">
                                                    <td className="px-4 py-3 font-bold text-gray-900">
                                                        {row.service_name}
                                                    </td>
                                                    <td className="px-4 py-3 uppercase tracking-wider text-[9px] font-semibold">
                                                        {row.service_category === 'diagnostics' ? (
                                                            <span className="text-blue-500">Diagnostics</span>
                                                        ) : (
                                                            <span className="text-purple-500">Therapeutics</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">
                                                        {formatCurrency(row.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {row.gst_applicable ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-50 text-pink-600 border border-pink-200">18% GST</span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {row.tds_applicable ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-50 text-pink-600 border border-pink-200">10% TDS</span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-700">
                                                        {formatDate(row.effective_from)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {row.valid_until ? formatDate(row.valid_until) : 'Infinite / Open'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {getStatusBadge(row)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
