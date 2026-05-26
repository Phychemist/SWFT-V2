'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    FlaskConical,
    ChevronRight,
    User,
    Building2,
    Stethoscope,
    RefreshCw,
    History,
    Clock,
    FileText,
    Download,
    Search,
    CheckCircle2,
    Calendar,
    TestTube,
} from 'lucide-react'
import { Card, CardContent, Badge, Button, Input, Table, Pagination } from '@/components/ui'
import type { Ticket, WorkflowStage, SessionUser } from '@/lib/types'

const PAGE_SIZE = 10

// Stages that scientist can see
const SCIENTIST_VISIBLE_STAGES = ['report received', 'final report generated']

type TabType = 'pending' | 'history'

export default function ScientistDashboard() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabType>('pending')
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [viewedTickets, setViewedTickets] = useState<Set<string>>(new Set())
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter state — creation date
    const [searchQuery, setSearchQuery] = useState('')
    const [stageFilter, setStageFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Filter state — raw report received date
    const [rawReportStart, setRawReportStart] = useState('')
    const [rawReportEnd, setRawReportEnd] = useState('')

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    const hasActiveFilters = !!(searchQuery || stageFilter || startDate || endDate || rawReportStart || rawReportEnd)

    const clearAllFilters = () => {
        setSearchQuery('')
        setStageFilter('')
        setStartDate('')
        setEndDate('')
        setRawReportStart('')
        setRawReportEnd('')
    }

    const fetchPendingTasks = async (page = 1) => {
        setLoading(true)
        try {
            // Fetch current user
            const meRes = await fetch('/api/auth/me')
            const meData = await meRes.json()
            if (meData.success) setCurrentUser(meData.data)

            // Fetch workflow stages first
            const stagesRes = await fetch('/api/workflow-stages')
            const stagesData = await stagesRes.json()
            let allStages: any[] = []
            if (stagesData.success) {
                allStages = stagesData.data
                setStages(allStages)
            }

            // Resolve scientist-visible stage IDs for server-side filtering
            const visibleStageIds = allStages
                .filter((s: any) => SCIENTIST_VISIBLE_STAGES.includes(s.name.toLowerCase().trim()))
                .map((s: any) => s.id)

            const params = new URLSearchParams()
            if (startDate) params.set('start_date', startDate)
            if (endDate) params.set('end_date', endDate)
            if (rawReportStart) params.set('raw_report_start', rawReportStart)
            if (rawReportEnd) params.set('raw_report_end', rawReportEnd)
            if (searchQuery) params.set('search', searchQuery)
            if (stageFilter) {
                params.set('stage_id', stageFilter)
            } else if (visibleStageIds.length > 0) {
                params.set('stage_ids', visibleStageIds.join(','))
            }
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String((page - 1) * PAGE_SIZE))

            const ticketsRes = await fetch(`/api/tickets?${params.toString()}`)
            const ticketsData = await ticketsRes.json()

            if (ticketsData.success) {
                // Further filter: also include tickets where any diagnostic has a raw report
                const scientistTickets = ticketsData.data.filter((ticket: Ticket) => {
                    const stageName = ticket.current_stage?.name?.toLowerCase() || ''
                    if (SCIENTIST_VISIBLE_STAGES.includes(stageName)) return true
                    if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                        return ticket.diagnostics.some((d: any) =>
                            !d.is_cancelled && d.raw_report_url
                        )
                    }
                    return false
                })
                setTickets(scientistTickets)
                setTotalCount(ticketsData.total ?? scientistTickets.length)
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

    useEffect(() => {
        fetchPendingTasks(1)
    }, [startDate, endDate, rawReportStart, rawReportEnd, searchQuery, stageFilter])

    const handleRefresh = () => {
        fetchPendingTasks()
    }

    const handleViewTicket = (ticketId: string) => {
        const newViewed = new Set(viewedTickets)
        newViewed.add(ticketId)
        setViewedTickets(newViewed)
        router.push(`/scientist/${ticketId}`)
    }

    const getStageColor = (stageName: string): string => {
        const stage = stages.find(s => s.name.toLowerCase() === stageName.toLowerCase())
        return stage?.color || '#6b7280'
    }

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    // Helper: earliest raw_report_url date across active diagnostics
    const getRawReportDate = (ticket: Ticket): string | null => {
        if (ticket.status_report_received_at) return ticket.status_report_received_at
        // Multi-diagnostic fallback: no dedicated field, use ticket updated_at as proxy
        return null
    }

    // Pending: Tickets that need scientist action
    const pendingTickets = useMemo(() => {
        return tickets.filter(t => {
            if (t.diagnostics && t.diagnostics.length > 0) {
                return t.diagnostics.some((d: any) =>
                    !d.is_cancelled && d.raw_report_url && !d.final_report_url
                )
            }
            return t.current_stage?.name?.toLowerCase() === 'report received'
        })
    }, [tickets])

    // History: Completed tickets
    const historyTickets = useMemo(() => {
        return tickets.filter(t => {
            if (t.diagnostics && t.diagnostics.length > 0) {
                const active = t.diagnostics.filter((d: any) => !d.is_cancelled)
                if (active.length === 0) return false
                return active.every((d: any) => d.final_report_url)
            }
            return t.current_stage?.name?.toLowerCase() === 'final report generated'
        })
    }, [tickets])

    const filteredPendingTickets = pendingTickets
    const filteredHistoryTickets = historyTickets

    // Build table columns for pending tasks
    const buildPendingColumns = () => [
        {
            key: 'uid',
            header: 'Ticket ID',
            width: '110px',
            render: (ticket: Ticket) => (
                <span className="font-mono text-sm font-medium text-[var(--primary-600)]">
                    {ticket.uid}
                </span>
            ),
        },
        {
            key: 'patient',
            header: 'Patient',
            width: '160px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {ticket.patient_name || 'N/A'}
                        </p>
                        {ticket.patient_name_2 && (
                            <p className="text-xs text-[var(--text-muted)] truncate">
                                & {ticket.patient_name_2}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'hospital',
            header: 'Hospital',
            width: '150px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)] truncate">
                        {ticket.hospital?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            key: 'doctor',
            header: 'Doctor',
            width: '130px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">
                        {ticket.doctor?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            key: 'service_type',
            header: 'Tests',
            width: '150px',
            render: (ticket: Ticket) => {
                if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                    const active = ticket.diagnostics.filter((d: any) => !d.is_cancelled)
                    const withRaw = active.filter((d: any) => d.raw_report_url).length
                    const total = active.length
                    return (
                        <div className="flex items-start gap-2">
                            <TestTube size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-xs text-[var(--text-secondary)] truncate">
                                    {active.map((d: any) => d.service_type?.name).filter(Boolean).join(', ') || 'N/A'}
                                </p>
                                <p className="text-xs text-[var(--primary-600)] font-medium mt-0.5">
                                    {withRaw}/{total} raw reports
                                </p>
                            </div>
                        </div>
                    )
                }
                return (
                    <div className="flex items-center gap-2">
                        <FlaskConical size={14} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-sm text-[var(--text-secondary)] truncate">
                            {ticket.service_type?.name || 'N/A'}
                        </span>
                    </div>
                )
            },
        },
        {
            key: 'report',
            header: 'Progress',
            width: '100px',
            render: (ticket: Ticket) => {
                if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                    const active = ticket.diagnostics.filter((d: any) => !d.is_cancelled)
                    const withFinal = active.filter((d: any) => d.final_report_url).length
                    const total = active.length
                    const allDone = withFinal === total
                    return (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${allDone ? 'bg-[var(--success-100)] text-[var(--success-700)]' : 'bg-[var(--warning-100)] text-[var(--warning-700)]'}`}>
                            {withFinal}/{total} done
                        </span>
                    )
                }
                return ticket.raw_report_url ? (
                    <Badge color="#10b981" size="sm">
                        <Download size={12} className="mr-1" />
                        Available
                    </Badge>
                ) : (
                    <span className="text-[var(--text-muted)] text-sm">—</span>
                )
            },
        },
        {
            key: 'raw_report_date',
            header: 'Report Received',
            width: '120px',
            render: (ticket: Ticket) => {
                const date = getRawReportDate(ticket)
                return (
                    <div className="flex items-center gap-1 text-sm">
                        {date ? (
                            <>
                                <Calendar size={12} className="text-[var(--warning-600)] shrink-0" />
                                <span className="text-[var(--text-secondary)]">{formatDate(date)}</span>
                            </>
                        ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'actions',
            header: '',
            width: '50px',
            render: () => (
                <ChevronRight size={18} className="text-[var(--text-muted)]" />
            ),
        },
    ]

    // Build table columns for history
    const buildHistoryColumns = () => [
        {
            key: 'uid',
            header: 'Ticket ID',
            width: '110px',
            render: (ticket: Ticket) => (
                <span className="font-mono text-sm font-medium text-[var(--primary-600)]">
                    {ticket.uid}
                </span>
            ),
        },
        {
            key: 'patient',
            header: 'Patient',
            width: '160px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {ticket.patient_name || 'N/A'}
                        </p>
                        {ticket.patient_name_2 && (
                            <p className="text-xs text-[var(--text-muted)] truncate">
                                & {ticket.patient_name_2}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'hospital',
            header: 'Hospital',
            width: '150px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)] truncate">
                        {ticket.hospital?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            key: 'doctor',
            header: 'Doctor',
            width: '130px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">
                        {ticket.doctor?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            key: 'service_type',
            header: 'Tests',
            width: '150px',
            render: (ticket: Ticket) => {
                if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                    const names = ticket.diagnostics
                        .filter((d: any) => !d.is_cancelled)
                        .map((d: any) => d.service_type?.name)
                        .filter(Boolean)
                    return (
                        <div className="flex items-center gap-2">
                            <FlaskConical size={14} className="text-[var(--text-muted)] shrink-0" />
                            <span className="text-sm text-[var(--text-secondary)] truncate">
                                {names.join(', ') || 'N/A'}
                            </span>
                        </div>
                    )
                }
                return (
                    <div className="flex items-center gap-2">
                        <FlaskConical size={14} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-sm text-[var(--text-secondary)] truncate">
                            {ticket.service_type?.name || 'N/A'}
                        </span>
                    </div>
                )
            },
        },
        {
            key: 'status',
            header: 'Status',
            width: '160px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[var(--success-600)]" />
                    <Badge color={getStageColor(ticket.current_stage?.name || '')} size="sm">
                        {ticket.current_stage?.name}
                    </Badge>
                </div>
            ),
        },
        {
            key: 'raw_report_date',
            header: 'Report Received',
            width: '120px',
            render: (ticket: Ticket) => {
                const date = getRawReportDate(ticket)
                return (
                    <div className="flex items-center gap-1 text-sm">
                        {date ? (
                            <>
                                <Calendar size={12} className="text-[var(--warning-600)] shrink-0" />
                                <span className="text-[var(--text-secondary)]">{formatDate(date)}</span>
                            </>
                        ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'completed_at',
            header: 'Completed',
            width: '110px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                    <Clock size={12} />
                    {formatDate(ticket.status_final_report_generated_at || ticket.updated_at)}
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '50px',
            render: () => (
                <ChevronRight size={18} className="text-[var(--text-muted)]" />
            ),
        },
    ]

    const FilterBar = () => (
        <Card padding="md" className="mb-6 shadow-sm border-[var(--border-light)]">
            <div className="space-y-3">
                {/* Row 1: Search */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                        <Input
                            placeholder="Search by ID, Patient, Hospital..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search size={16} className="text-[var(--text-muted)]" />}
                            className="bg-[var(--gray-50)]/50"
                        />
                    </div>
                </div>

                {/* Row 2: Created date range */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-muted)] w-[90px] shrink-0">Created Date</span>
                    <div className="w-[155px]">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            leftIcon={<Calendar size={13} />}
                            className="bg-white h-9 text-sm"
                        />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">to</span>
                    <div className="w-[155px]">
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            leftIcon={<Calendar size={13} />}
                            className="bg-white h-9 text-sm"
                        />
                    </div>
                </div>

                {/* Row 3: Raw report date range */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-muted)] w-[90px] shrink-0">Report Date</span>
                    <div className="w-[155px]">
                        <Input
                            type="date"
                            value={rawReportStart}
                            onChange={(e) => setRawReportStart(e.target.value)}
                            leftIcon={<Calendar size={13} />}
                            className="bg-white h-9 text-sm"
                        />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">to</span>
                    <div className="w-[155px]">
                        <Input
                            type="date"
                            value={rawReportEnd}
                            onChange={(e) => setRawReportEnd(e.target.value)}
                            leftIcon={<Calendar size={13} />}
                            className="bg-white h-9 text-sm"
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                        >
                            Clear all
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FlaskConical className="text-[var(--primary-600)]" size={28} />
                        Scientist Dashboard
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {activeTab === 'pending' ? 'Reports ready for analysis' : 'Previously completed reports'}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={handleRefresh}
                    leftIcon={<RefreshCw size={16} />}
                >
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-[var(--border-default)]">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`
                        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'pending'
                            ? 'border-[var(--primary-600)] text-[var(--primary-700)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }
                    `}
                >
                    <FileText size={18} />
                    New Reports
                    {pendingTickets.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary-100)] text-[var(--primary-700)]">
                            {pendingTickets.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`
                        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'history'
                            ? 'border-[var(--primary-600)] text-[var(--primary-700)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }
                    `}
                >
                    <History size={18} />
                    My History
                </button>
            </div>

            {/* Error State */}
            {error && (
                <Card className="mb-6 border-[var(--error-500)]">
                    <CardContent className="py-4">
                        <p className="text-[var(--error-600)]">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Pending Tab */}
            {activeTab === 'pending' && (
                <>
                    <FilterBar />

                    {filteredPendingTickets.length > 0 && (
                        <div className="mb-4">
                            <Badge color="#0ea5e9" size="md">
                                {filteredPendingTickets.length} pending {filteredPendingTickets.length === 1 ? 'report' : 'reports'}
                            </Badge>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <Table
                            columns={buildPendingColumns()}
                            data={filteredPendingTickets}
                            loading={loading}
                            emptyMessage="No new reports. Reports will appear here when backoffice marks tickets as 'Report Received'."
                            onRowClick={(ticket) => handleViewTicket(ticket.id)}
                            getRowKey={(ticket) => ticket.id}
                        />
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalCount={totalCount}
                        pageSize={PAGE_SIZE}
                        onPageChange={(page) => fetchPendingTasks(page)}
                        className="mt-4"
                    />
                </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <>
                    <FilterBar />

                    {historyTickets.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <History size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                                    No completed reports yet
                                </h3>
                                <p className="text-[var(--text-secondary)]">
                                    Reports you complete will appear here for reference.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table
                                columns={buildHistoryColumns()}
                                data={filteredHistoryTickets}
                                loading={false}
                                emptyMessage="No history found matching your search."
                                onRowClick={(ticket) => router.push(`/scientist/${ticket.id}`)}
                                getRowKey={(ticket) => ticket.id}
                            />
                        </div>
                    )}
                    <Pagination
                        currentPage={currentPage}
                        totalCount={totalCount}
                        pageSize={PAGE_SIZE}
                        onPageChange={(page) => fetchPendingTasks(page)}
                        className="mt-4"
                    />
                </>
            )}
        </div>
    )
}
