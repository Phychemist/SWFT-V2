'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    ClipboardCheck,
    ChevronRight,
    User,
    Building2,
    Stethoscope,
    FlaskConical,
    RefreshCw,
    History,
    Clock,
    CheckCircle2,
    Search,
    Activity,
    ArrowRight,
    ArrowUpNarrowWide,
    ArrowDownWideNarrow,
    MapPin,
    Package,
    PackageCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Pagination } from '@/components/ui'
import type { Ticket, WorkflowStage, StatusTransition, SessionUser } from '@/lib/types'

const PAGE_SIZE = 10

// Stages that backoffice can see (tickets at these stages are visible to them)
const BACKOFFICE_ACTIONABLE_STAGES = ['sample collected', 'sample received', 'sample sent to']

// Stages that backoffice can transition TO
const BACKOFFICE_TARGET_STAGES = ['sample received', 'sample sent to', 'report received']

// Map current stage to next action
const getNextAction = (stageName: string): { label: string; targetStage: string } | null => {
    const stage = stageName.toLowerCase()
    if (stage === 'sample collected') {
        return { label: 'Mark Sample Received', targetStage: 'sample received' }
    }
    if (stage === 'sample received') {
        return { label: 'Send to Lab', targetStage: 'sample sent to' }
    }
    if (stage === 'sample sent to') {
        return { label: 'Mark Report Received', targetStage: 'report received' }
    }
    return null
}

type TabType = 'pending' | 'history'

// Extended type for history items with ticket info
interface HistoryItem extends StatusTransition {
    ticket?: Ticket
}

export default function BackofficeDashboard() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabType>('pending')
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [loading, setLoading] = useState(true)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userName, setUserName] = useState('')

    // Filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [stageFilter, setStageFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [sort, setSort] = useState<'asc' | 'desc'>('asc')

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    const fetchPendingTasks = async (page = 1) => {
        setLoading(true)
        try {
            // Fetch current user
            const meRes = await fetch('/api/auth/me')
            const meData = await meRes.json()
            if (meData.success) {
                setCurrentUser(meData.data)
                if (!userName) setUserName(meData.data.full_name)
            }

            // Fetch workflow stages first
            const stagesRes = await fetch('/api/workflow-stages')
            const stagesData = await stagesRes.json()
            let allStages: any[] = []
            if (stagesData.success) {
                allStages = stagesData.data
                setStages(allStages)
            }

            // Resolve actionable stage IDs for server-side filtering
            const actionableStageIds = allStages
                .filter((s: any) => BACKOFFICE_ACTIONABLE_STAGES.includes(s.name.toLowerCase().trim()))
                .map((s: any) => s.id)

            const params = new URLSearchParams()
            if (startDate) params.set('start_date', startDate)
            if (endDate) params.set('end_date', endDate)
            if (searchQuery) params.set('search', searchQuery)
            // If a specific stage is selected, filter by that one; otherwise show all actionable stages
            if (stageFilter) {
                params.set('stage_id', stageFilter)
            } else if (actionableStageIds.length > 0) {
                params.set('stage_ids', actionableStageIds.join(','))
            }
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String((page - 1) * PAGE_SIZE))

            const ticketsRes = await fetch(`/api/tickets?${params.toString()}`)
            const ticketsData = await ticketsRes.json()

            if (ticketsData.success) {
                setTickets(ticketsData.data)
                setTotalCount(ticketsData.total ?? ticketsData.data.length)
                setCurrentPage(page)
            } else {
                setError(ticketsData.error)
            }
        } catch (err) {
            setError('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    const fetchHistory = async () => {
        if (!currentUser) return

        setHistoryLoading(true)
        try {
            // Fetch status transitions made by current user - only "Report Received" (completed tickets)
            const historyRes = await fetch(
                `/api/status-transitions?changed_by=${currentUser.id}&to_stages=${encodeURIComponent('report received')}`
            )
            const historyData = await historyRes.json()

            if (historyData.success) {
                setHistoryItems(historyData.data || [])
            } else {
                setError(historyData.error || 'Failed to fetch history')
            }
        } catch (err) {
            setError('Failed to fetch history')
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        fetchPendingTasks(1)
    }, [startDate, endDate, searchQuery, stageFilter])

    useEffect(() => {
        if (activeTab === 'history' && currentUser && historyItems.length === 0) {
            fetchHistory()
        }
    }, [activeTab, currentUser])

    // Real-time updates for backoffice
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('backoffice-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets'
                },
                (payload) => {
                    fetchPendingTasks()
                    fetchHistory()
                }
            )
            .subscribe()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchPendingTasks()
                fetchHistory()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [fetchPendingTasks, fetchHistory])

    const handleRefresh = () => {
        if (activeTab === 'pending') {
            fetchPendingTasks()
        } else {
            fetchHistory()
        }
    }

    const getStageColor = (stageName: string): string => {
        const stage = stages.find(s => s.name.toLowerCase() === stageName.toLowerCase())
        return stage?.color || '#6b7280'
    }

    const getStatusStyle = (stageName: string) => {
        const name = stageName.toLowerCase()
        if (name === 'sample collected') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
        if (name === 'sample received') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
        if (name === 'sample sent to') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
        })
    }

    const formatTime = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }

    // Sort tickets — filtering is fully server-side, only sort client-side within the current page
    const filteredTickets = useMemo(() => {
        return [...tickets].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return sort === 'asc' ? dateA - dateB : dateB - dateA
        })
    }, [tickets, sort])

    // Get available stages for filter (only actionable stages)
    const filterableStages = useMemo(() => {
        return stages.filter(s =>
            BACKOFFICE_ACTIONABLE_STAGES.includes(s.name.toLowerCase())
        )
    }, [stages])

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] pb-20 md:pb-0">
            {/* Hero Section */}
            <div className="bg-white px-4 md:px-0 pt-4 pb-6 border-b md:border-b-0 border-[var(--border-light)] md:bg-transparent">
                <div className="flex justify-between items-start mb-4 md:hidden">
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">
                            Hello, {userName.split(' ')[0] || 'Officer'}!
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
                            Manage sample processing
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-[var(--primary-600)] leading-none">
                            {tickets.length}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase min-w-[60px] text-right">Pending</span>
                    </div>
                </div>

                {/* Desktop Welcome (Hidden on Mobile) */}
                <div className="hidden md:block mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <ClipboardCheck className="text-[var(--primary-600)]" size={28} />
                        Backoffice Dashboard
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {activeTab === 'pending' ? 'Tickets waiting for your action' : 'Your completed updates'}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative shadow-sm rounded-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search tickets, patients..."
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
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending'
                                ? 'bg-white shadow-sm text-[var(--primary-600)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            <ClipboardCheck size={16} />
                            My Assignments
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                                ? 'bg-white shadow-sm text-green-600'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            <History size={16} />
                            Completed
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="uppercase tracking-wider" style={{ fontSize: '20px', color: '#9ca3af', fontWeight: 400 }}>
                            {activeTab === 'pending' ? `Pending (${totalCount})` : `History (${historyItems.length})`}
                        </h2>

                        <div className="flex items-center gap-2">
                            {/* Stage Filter - Mobile */}
                            {activeTab === 'pending' && (
                                <select
                                    value={stageFilter}
                                    onChange={(e) => setStageFilter(e.target.value)}
                                    className="md:hidden px-3 py-1.5 text-sm border border-[var(--border-light)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] w-28"
                                >
                                    <option value="">All Status</option>
                                    {filterableStages.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            )}

                            <button
                                onClick={() => setSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="flex items-center justify-center w-8 h-8 bg-white border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--gray-50)] transition-colors"
                                title={sort === 'asc' ? 'Earliest First' : 'Latest First'}
                            >
                                {sort === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
                            </button>

                            <button
                                onClick={handleRefresh}
                                className="text-[var(--primary-600)] p-2 rounded-full hover:bg-[var(--primary-50)] transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={loading || historyLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Desktop Filters */}
                    {activeTab === 'pending' && (
                        <div className="hidden md:flex items-center gap-2">
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-[var(--border-light)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] w-32"
                            >
                                <option value="">All Status</option>
                                {filterableStages.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {(searchQuery || stageFilter) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('')
                                        setStageFilter('')
                                    }}
                                    className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--error-600)]"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <>
                        {loading && filteredTickets.length === 0 ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-[var(--border-light)]" />
                                ))}
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center px-8 bg-white rounded-2xl border border-dashed border-[var(--border-light)]">
                                <div className="w-16 h-16 bg-[var(--gray-50)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">No pending tasks</h3>
                                <p className="text-[var(--text-muted)] text-sm mt-1">
                                    {searchQuery ? "Try searching for something else" : "Great job! You're all caught up."}
                                </p>
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => {
                                const style = getStatusStyle(ticket.current_stage?.name || '')
                                const nextAction = getNextAction(ticket.current_stage?.name || '')

                                // Get patient names
                                const patientNames = [ticket.patient_name, ticket.patient_name_2].filter(Boolean)
                                const displayPatientName = patientNames.length > 0 ? patientNames.join(' & ') : 'Anonymous Patient'

                                // Get location
                                const locationName = ticket.hospital?.name || ticket.collection_address || 'N/A'

                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => router.push(`/backoffice/${ticket.id}`)}
                                        className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm active:scale-[0.98] transition-all overflow-hidden group hover:border-[var(--primary-300)] hover:shadow-md cursor-pointer"
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider">
                                                            {ticket.uid}
                                                        </span>
                                                        {(() => {
                                                            const codes = (ticket.diagnostics && ticket.diagnostics.length > 0)
                                                                ? ticket.diagnostics.filter((d: any) => !d.is_cancelled && d.label_code).map((d: any) => d.label_code)
                                                                : ticket.label_code ? [ticket.label_code] : []
                                                            return codes.length > 0 ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight">
                                                                    {codes.join(', ')}
                                                                </span>
                                                            ) : null
                                                        })()}
                                                    </div>
                                                    <h3 className="font-bold text-[var(--text-primary)] text-lg leading-tight">
                                                        {displayPatientName}
                                                    </h3>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border flex-shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                                                    {ticket.current_stage?.name}
                                                </span>
                                            </div>

                                            <div className="space-y-2.5 my-4">
                                                {/* Location */}
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0 mt-0.5">
                                                        <MapPin size={12} className="text-[var(--primary-600)]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-bold text-[var(--text-primary)] leading-tight">{locationName}</p>
                                                        {ticket.hospital?.city && (
                                                            <p className="text-xs text-[var(--text-muted)] mt-0.5" style={{ fontSize: '11px' }}>{ticket.hospital.city}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Doctor - only if exists */}
                                                {ticket.doctor?.name && (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                            <Stethoscope size={12} className="text-[var(--primary-600)]" />
                                                        </div>
                                                        <span className="text-base font-bold text-[var(--text-primary)]">Dr. {ticket.doctor.name}</span>
                                                    </div>
                                                )}

                                                {/* Service Type & Label Codes */}
                                                {(() => {
                                                    if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                                                        const active = ticket.diagnostics.filter((d: any) => !d.is_cancelled)
                                                        const names = active.map((d: any) => d.service_type?.name).filter(Boolean)
                                                        const codes = active.filter((d: any) => d.label_code).map((d: any) => ({ name: d.service_type?.name || 'Unknown', code: d.label_code }))
                                                        return (
                                                            <>
                                                                {names.length > 0 && (
                                                                    <div className="flex items-start gap-2.5">
                                                                        <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0 mt-0.5">
                                                                            <FlaskConical size={12} className="text-[var(--primary-600)]" />
                                                                        </div>
                                                                        <span className="text-xs text-[var(--text-secondary)]" style={{ fontSize: '11px' }}>{names.join(', ')}</span>
                                                                    </div>
                                                                )}
                                                                {codes.length > 0 && (
                                                                    <div className="flex items-start gap-2.5">
                                                                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                                                            <Package size={12} className="text-blue-600" />
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {codes.map((c: any, i: number) => (
                                                                                <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                                                    {c.code}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )
                                                    }
                                                    return (
                                                        <>
                                                            {ticket.service_type?.name && (
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0">
                                                                        <FlaskConical size={12} className="text-[var(--primary-600)]" />
                                                                    </div>
                                                                    <span className="text-xs text-[var(--text-secondary)]" style={{ fontSize: '11px' }}>{ticket.service_type.name}</span>
                                                                </div>
                                                            )}
                                                            {ticket.label_code && (
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                                        <Package size={12} className="text-blue-600" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-blue-600" style={{ fontSize: '11px' }}>{ticket.label_code}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )
                                                })()}

                                            </div>
                                        </div>

                                        <div className="bg-[var(--gray-50)] px-4 py-3 border-t border-[var(--border-light)] flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs font-medium">
                                                <Clock size={14} />
                                                <span>{formatDate(ticket.created_at)} • {formatTime(ticket.created_at)}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-600)]">
                                                {ticket.type === 'query' && ticket.query_category ? (
                                                    <>
                                                        {ticket.query_category === 'report_related' && '📄 Report Query'}
                                                        {ticket.query_category === 'scientific' && '🔬 Scientific Query'}
                                                        {ticket.query_category === 'billing_related' && '💰 Billing Query'}
                                                        {ticket.query_category === 'others' && '📋 Query'}
                                                    </>
                                                ) : ticket.type === 'action' ? (
                                                    'Action'
                                                ) : ticket.type === 'info' ? (
                                                    'Info'
                                                ) : (
                                                    ticket.type
                                                )} <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}

                        {/* Pagination */}
                        {totalCount > PAGE_SIZE && (
                            <Pagination
                                currentPage={currentPage}
                                totalCount={totalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={(page) => fetchPendingTasks(page)}
                                className="mt-4"
                            />
                        )}
                    </>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <>
                        {historyLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw size={32} className="animate-spin text-[var(--primary-600)]" />
                            </div>
                        ) : historyItems.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center px-8 bg-white rounded-2xl border border-dashed border-[var(--border-light)]">
                                <div className="w-16 h-16 bg-[var(--gray-50)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                                    <History size={32} />
                                </div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">No history yet</h3>
                                <p className="text-[var(--text-muted)] text-sm mt-1">
                                    Your completed status updates will appear here.
                                </p>
                            </div>
                        ) : (
                            historyItems.map((item) => {
                                const ticket = item.ticket
                                if (!ticket) return null

                                const patientNames = [ticket.patient_name, ticket.patient_name_2].filter(Boolean)
                                const displayPatientName = patientNames.length > 0 ? patientNames.join(' & ') : 'Anonymous Patient'

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => router.push(`/backoffice/${ticket.id}`)}
                                        className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm active:scale-[0.98] transition-all overflow-hidden group hover:border-green-300 hover:shadow-md cursor-pointer"
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
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <CheckCircle2 size={14} className="text-green-600" />
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border bg-green-50 text-green-700 border-green-200">
                                                        Completed
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5 my-4">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-5 h-5 rounded-full bg-[var(--primary-50)] flex items-center justify-center shrink-0 mt-0.5">
                                                        <MapPin size={12} className="text-[var(--primary-600)]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-bold text-[var(--text-primary)] leading-tight">
                                                            {ticket.hospital?.name || ticket.collection_address || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[var(--gray-50)] px-4 py-3 border-t border-[var(--border-light)] flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs font-medium">
                                                <Clock size={14} />
                                                <span>{formatDate(item.created_at)} • {formatTime(item.created_at)}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-600">
                                                View <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
