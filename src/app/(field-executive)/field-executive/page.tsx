'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Clock,
    MapPin,
    User,
    ChevronRight,
    Search,
    RefreshCw,
    CircleDashed,
    PackageCheck,
    Phone,
    ExternalLink,
    ArrowRight,
    ArrowUpNarrowWide,
    ArrowDownWideNarrow,
    CheckCircle2,
    Calendar,
    Boxes
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function FieldExecutiveDashboard() {
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [userName, setUserName] = useState('')
    const router = useRouter()

    const searchParams = useSearchParams()

    // State for filtering and sorting
    const [status, setStatus] = useState<'active' | 'completed' | 'inventory'>('active')
    const [sort, setSort] = useState<'asc' | 'desc'>('asc') // Default: Earliest First (asc)
    const [inventoryItems, setInventoryItems] = useState<any[]>([])
    const [loadingInventory, setLoadingInventory] = useState(false)

    // Sync tab from URL
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'completed') setStatus('completed')
        else if (tab === 'inventory') setStatus('inventory')
        else setStatus('active')
    }, [searchParams])

    const fetchFEInventory = async () => {
        try {
            setLoadingInventory(true)
            const [resItems, resAllocs, resCons] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/inventory/allocations'),
                fetch('/api/inventory/consumptions')
            ])
            const [dataItems, dataAllocs, dataCons] = await Promise.all([
                resItems.json(),
                resAllocs.json(),
                resCons.json()
            ])

            if (dataItems.success && dataAllocs.success && dataCons.success) {
                const allocations = dataAllocs.data
                const consumptions = dataCons.data

                const holdingsMap = new Map<string, { total_alloc: number; total_cons: number }>()
                for (const row of allocations) {
                    const current = holdingsMap.get(row.item_id) || { total_alloc: 0, total_cons: 0 }
                    holdingsMap.set(row.item_id, {
                        ...current,
                        total_alloc: current.total_alloc + row.quantity
                    })
                }
                for (const row of consumptions) {
                    const current = holdingsMap.get(row.item_id) || { total_alloc: 0, total_cons: 0 }
                    holdingsMap.set(row.item_id, {
                        ...current,
                        total_cons: current.total_cons + row.quantity_used
                    })
                }

                const computed = dataItems.data.map((item: any) => {
                    const stats = holdingsMap.get(item.id) || { total_alloc: 0, total_cons: 0 }
                    return {
                        id: item.id,
                        name: item.name,
                        unit: item.unit,
                        total_allocated: stats.total_alloc,
                        total_consumed: stats.total_cons,
                        current_holding: stats.total_alloc - stats.total_cons
                    }
                })
                setInventoryItems(computed)
            }
        } catch (err) {
            console.error('Failed to load FE inventory:', err)
        } finally {
            setLoadingInventory(false)
        }
    }

    const fetchTickets = async () => {
        try {
            setLoading(true)
            const ticketStatus = status === 'completed' ? 'completed' : 'active'
            const query = new URLSearchParams({ status: ticketStatus, sort })
            const res = await fetch(`/api/field-executive/tickets?${query.toString()}`)
            const data = await res.json()
            if (data.success) {
                setTickets(data.data)
            }

            if (!userName) {
                const meRes = await fetch('/api/auth/me')
                const meData = await meRes.json()
                if (meData.success) {
                    setUserName(meData.data.full_name)
                }
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'inventory') {
            fetchFEInventory()
        } else {
            fetchTickets()
        }
    }, [status, sort]) // Refetch on filter/sort change

    const filteredTickets = tickets.filter(ticket =>
        ticket.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.hospital?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.label_code?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getStatusStyle = (stageName: string) => {
        const name = stageName.toLowerCase()
        if (name === 'assigned') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
        if (name === 'sample collected') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
        if (name === 'in progress') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    }

    const getCategoryStyle = (category: string) => {
        const isTherapeutics = category?.toLowerCase() === 'therapeutics'
        if (isTherapeutics) {
            return {
                border: 'border-l-teal-500',
                badgeBg: 'bg-teal-50',
                badgeText: 'text-teal-700',
                badgeBorder: 'border-teal-100',
                label: 'Therapeutics',
                icon: '🏥'
            }
        }
        return {
            border: 'border-l-indigo-500',
            badgeBg: 'bg-indigo-50',
            badgeText: 'text-indigo-700',
            badgeBorder: 'border-indigo-100',
            label: 'Diagnostics',
            icon: '🔬'
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }

    const formatScheduledTime = (timeString: string) => {
        // Handle HH:MM format
        if (timeString && timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':')
            const hour = parseInt(hours, 10)
            const ampm = hour >= 12 ? 'pm' : 'am'
            const displayHour = hour % 12 || 12
            return `${displayHour}:${minutes} ${ampm}`
        }
        return timeString
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] pb-20 md:pb-0">
            {/* Hero Section */}
            <div className="bg-white px-4 md:px-0 pt-4 pb-6 border-b md:border-b-0 border-[var(--border-light)] md:bg-transparent">
                <div className="flex justify-between items-start mb-4 md:hidden">
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">
                            Hello, {userName.split(' ')[0] || 'Executive'}!
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
                            Ready for today's tasks?
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-[var(--primary-600)] leading-none">
                            {status === 'active' ? tickets.length : '--'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase min-w-[60px] text-right">Pending</span>
                    </div>
                </div>

                {/* Desktop Welcome (Hidden on Mobile) */}
                <div className="hidden md:block mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Field Executive Dashboard
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Manage your sample collection tasks
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative shadow-sm rounded-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search patient, ID..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--border-light)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Tickets List */}
            <div className="px-4 md:px-0 mt-4 space-y-4 flex-1">
                {/* Tabs & Sorting */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-1 p-1 bg-[var(--gray-100)] rounded-xl w-full">
                        <button
                            onClick={() => setStatus('active')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${status === 'active'
                                ? 'bg-white shadow-sm text-[var(--primary-600)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            <User size={15} />
                            Assignments
                        </button>
                        <button
                            onClick={() => setStatus('completed')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${status === 'completed'
                                ? 'bg-white shadow-sm text-green-600'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            <CheckCircle2 size={15} />
                            Completed
                        </button>
                        <button
                            onClick={() => setStatus('inventory')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${status === 'inventory'
                                ? 'bg-white shadow-sm text-pink-600'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            <Boxes size={15} />
                            My Inventory
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="uppercase tracking-wider font-bold" style={{ fontSize: '18px', color: '#9ca3af', fontWeight: 600 }}>
                            {status === 'active' 
                                ? `Pending Tasks (${tickets.length})` 
                                : status === 'completed' 
                                    ? `History (${tickets.length})` 
                                    : `Inventory Holdings (${inventoryItems.length})`}
                        </h2>

                        {status !== 'inventory' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="flex items-center justify-center w-8 h-8 bg-white border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--gray-50)] transition-colors"
                                    title={sort === 'asc' ? 'Earliest First' : 'Latest First'}
                                >
                                    {sort === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
                                </button>
    
                                <button
                                    onClick={() => fetchTickets()}
                                    className="text-[var(--primary-600)] p-2 rounded-full hover:bg-[var(--primary-50)] transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        )}
                        {status === 'inventory' && (
                            <button
                                onClick={() => fetchFEInventory()}
                                className="text-pink-600 p-2 rounded-full hover:bg-pink-50 transition-colors"
                                title="Refresh Inventory"
                              >
                                <RefreshCw size={16} className={loadingInventory ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>

                {status === 'inventory' ? (
                    loadingInventory ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-[var(--border-light)]" />
                            ))}
                        </div>
                    ) : inventoryItems.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-8 bg-white rounded-2xl border border-dashed border-[var(--border-light)]">
                            <div className="w-16 h-16 bg-[var(--gray-50)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                                <Boxes size={32} />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">No inventory held</h3>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                Contact the Backoffice Officer to allocate kit items to you.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventoryItems.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[3px] bg-pink-500" />
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-gray-900 text-base">{item.name}</span>
                                        <span className="bg-pink-50 border border-pink-100 text-pink-600 rounded-full uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">
                                            {item.unit}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50 text-center">
                                        <div>
                                            <div className="text-[10px] text-gray-400 font-semibold uppercase">Disbursed</div>
                                            <div className="font-bold text-gray-800 mt-0.5">{item.total_allocated}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400 font-semibold uppercase">Consumed</div>
                                            <div className="font-bold text-gray-800 mt-0.5">{item.total_consumed}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-pink-800 font-bold uppercase">In Hand</div>
                                            <div className="font-extrabold text-pink-600 text-base mt-0.5">{item.current_holding}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : loading && tickets.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-[var(--border-light)]" />
                        ))}
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-8 bg-white rounded-2xl border border-dashed border-[var(--border-light)]">
                        <div className="w-16 h-16 bg-[var(--gray-50)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                            <Search size={32} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] text-lg">No tickets found</h3>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            {searchQuery ? "Try searching for something else" : "Great job! You have no pending tasks."}
                        </p>
                    </div>
                ) : (
                    filteredTickets.map((ticket) => {
                        const style = getStatusStyle(ticket.current_stage?.name || '')
                        const catStyle = getCategoryStyle(ticket.service_type?.category || 'diagnostics')

                        // Get patient names - show both if available
                        const patientNames = [ticket.patient_name, ticket.patient_name_2].filter(Boolean)
                        const displayPatientName = patientNames.length > 0 ? patientNames.join(' & ') : 'Anonymous Patient'

                        // Get location - hospital or collection address
                        const locationName = ticket.hospital?.name || ticket.collection_address || 'N/A'
                        const locationDetail = ticket.hospital
                            ? (ticket.hospital.city ? ticket.hospital.city : ticket.hospital.address || '')
                            : (ticket.collection_address ? 'Home Collection' : '')

                        // Get date/time - prefer scheduled, fallback to created
                        const displayDate = ticket.scheduled_date || ticket.created_at
                        const displayTime = ticket.scheduled_time
                            ? formatScheduledTime(ticket.scheduled_time)
                            : (ticket.created_at ? formatTime(ticket.created_at) : '')
                        const dateLabel = ticket.scheduled_date ? 'Scheduled' : 'Created'

                        return (
                            <div
                                key={ticket.id}
                                onClick={() => router.push(`/field-executive/tickets/${ticket.id}`)}
                                className={`bg-white rounded-2xl border border-[var(--border-light)] border-l-4 ${catStyle.border} shadow-sm active:scale-[0.98] transition-all overflow-hidden group hover:border-[var(--primary-300)] hover:shadow-md cursor-pointer`}
                            >
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider">
                                                {ticket.uid}
                                            </span>
                                            <h3 className="font-bold text-[var(--text-primary)] text-lg leading-tight">
                                                {displayPatientName}
                                            </h3>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${style.bg} ${style.text} ${style.border}`}>
                                                {ticket.current_stage?.name}
                                            </span>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${catStyle.badgeBg} ${catStyle.badgeText} ${catStyle.badgeBorder}`}>
                                                <span>{catStyle.icon}</span>
                                                {catStyle.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 my-4">
                                        {/* Location */}
                                        <div className="flex items-start gap-2.5 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={12} className="text-[var(--primary-600)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[var(--text-primary)] leading-tight">{locationName}</p>
                                                {locationDetail && (
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{locationDetail}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hospital Contact */}
                                        {ticket.hospital?.contact && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                    <Phone size={12} className="text-[var(--primary-600)]" />
                                                </div>
                                                <span className="text-[var(--text-secondary)] text-xs">{ticket.hospital.contact}</span>
                                            </div>
                                        )}

                                        {/* Hospital Maps Link */}
                                        {ticket.hospital?.location && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                    <ExternalLink size={12} className="text-[var(--primary-600)]" />
                                                </div>
                                                <a href={ticket.hospital.location} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-600)] text-xs hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                                    Open in Maps
                                                </a>
                                            </div>
                                        )}

                                        {/* Doctor - only if exists */}
                                        {ticket.doctor?.name && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                    <User size={12} className="text-[var(--primary-600)]" />
                                                </div>
                                                <span className="text-[var(--text-primary)] font-medium">Dr. {ticket.doctor.name}</span>
                                            </div>
                                        )}

                                        {/* Service Type - if available */}
                                        {ticket.service_type?.name && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                    <PackageCheck size={12} className="text-[var(--primary-600)]" />
                                                </div>
                                                <span className="text-[var(--text-secondary)] text-xs">{ticket.service_type.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[var(--gray-50)] px-4 py-3 border-t border-[var(--border-light)] flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs font-medium">
                                        <Clock size={14} />
                                        <span>
                                            {formatDate(displayDate)}
                                            {displayTime && ` • ${displayTime}`}
                                            {ticket.scheduled_date && <span className="ml-1 text-[10px]">({dateLabel})</span>}
                                        </span>
                                    </div>

                                    <div className={`
                                        flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide
                                        ${ticket.current_stage?.name.toLowerCase() === 'sample collected'
                                            ? 'text-green-600'
                                            : 'text-[var(--primary-600)]'}
                                    `}>
                                        {ticket.current_stage?.name.toLowerCase() === 'sample collected' ? (
                                            <>Completed <PackageCheck size={16} /></>
                                        ) : ticket.type === 'query' && ticket.query_category ? (
                                            <>
                                                {ticket.query_category === 'report_related' && '📄 Report Query'}
                                                {ticket.query_category === 'scientific' && '🔬 Scientific Query'}
                                                {ticket.query_category === 'billing_related' && '💰 Billing Query'}
                                                {ticket.query_category === 'others' && '📋 Query'}
                                                <ArrowRight size={16} />
                                            </>
                                        ) : (
                                            <>Action <ArrowRight size={16} /></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
