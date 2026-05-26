'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button, Input, Select, Card, Table, Badge, Pagination } from '@/components/ui'
import type { Ticket, WorkflowStage, CustomColumn, User, SessionUser, ServiceType, Doctor, Hospital } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { RotateCcw, Search, Eye, Copy, Check, Filter, X, Activity, Stethoscope, Ban, MapPin, User as UserIcon } from 'lucide-react'

const PAGE_SIZE = 10

const ticketTypeLabels = {
    action: { label: 'Action', color: '#8b5cf6' },
    query: { label: 'Query', color: '#3b82f6' },
    info: { label: 'Info', color: '#6b7280' },
}

export default function CancelledTicketsPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({})
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [actionSubtypeFilter, setActionSubtypeFilter] = useState('')
    const [serviceTypeFilter, setServiceTypeFilter] = useState('')
    const [serviceSearch, setServiceSearch] = useState('')
    const [doctorFilter, setDoctorFilter] = useState('')
    const [hospitalFilter, setHospitalFilter] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [fieldExecutiveFilter, setFieldExecutiveFilter] = useState('')
    const [fieldExecutives, setFieldExecutives] = useState<User[]>([])
    const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('/api/auth/me')
            const result = await response.json()
            if (result.success) {
                setCurrentUser(result.data)
            }
        } catch (error) {
            console.error('Error fetching current user:', error)
        }
    }

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchFieldVisibility = async () => {
        try {
            const response = await fetch('/api/field-visibility')
            const result = await response.json()
            if (result.success) {
                const visibility: Record<string, boolean> = {}
                result.data.forEach((item: { field_id: string; is_visible: boolean }) => {
                    visibility[item.field_id] = item.is_visible
                })
                setFieldVisibility(visibility)
            }
        } catch (error) {
            console.error('Error fetching field visibility:', error)
        }
    }

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users')
            const result = await response.json()
            if (result.success) {
                setUsers(result.data)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const fetchServiceTypes = async () => {
        try {
            const response = await fetch('/api/service-types')
            const result = await response.json()
            if (result.success) {
                setServiceTypes(result.data.filter((st: ServiceType) => st.is_active))
            }
        } catch (error) {
            console.error('Error fetching service types:', error)
        }
    }

    const fetchDoctors = async () => {
        try {
            const response = await fetch('/api/doctors')
            const result = await response.json()
            if (result.success) {
                setDoctors(result.data)
            }
        } catch (error) {
            console.error('Error fetching doctors:', error)
        }
    }

    const fetchHospitals = async () => {
        try {
            const response = await fetch('/api/hospitals')
            const result = await response.json()
            if (result.success) {
                setHospitals(result.data)
            }
        } catch (error) {
            console.error('Error fetching hospitals:', error)
        }
    }

    const fetchFieldExecutives = async () => {
        try {
            const response = await fetch('/api/assignable-users?role=field_executive')
            const result = await response.json()
            if (result.success) setFieldExecutives(result.data)
        } catch (error) {
            console.error('Error fetching field executives:', error)
        }
    }

    const fetchTickets = useCallback(async (page = 1) => {
        try {
            const params = new URLSearchParams()
            params.set('only_cancelled', 'true')
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (typeFilter) params.set('type', typeFilter)
            if (actionSubtypeFilter) params.set('action_subtype', actionSubtypeFilter)
            if (serviceTypeFilter) params.set('service_type_id', serviceTypeFilter)
            if (doctorFilter) params.set('doctor_id', doctorFilter)
            if (hospitalFilter) params.set('hospital_id', hospitalFilter)
            if (cityFilter) params.set('city', cityFilter)
            if (fieldExecutiveFilter) params.set('assigned_to', fieldExecutiveFilter)
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String((page - 1) * PAGE_SIZE))

            const response = await fetch(`/api/tickets?${params.toString()}`)
            const result = await response.json()
            if (result.success) {
                setTickets(result.data)
                setTotalCount(result.total ?? 0)
                setCurrentPage(page)
            }
        } catch (error) {
            console.error('Error fetching tickets:', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, typeFilter, actionSubtypeFilter, serviceTypeFilter, doctorFilter, hospitalFilter, cityFilter, fieldExecutiveFilter])

    const fetchStages = async () => {
        try {
            const response = await fetch('/api/workflow-stages')
            const result = await response.json()
            if (result.success) {
                setStages(result.data.filter((s: WorkflowStage) => s.is_active))
            }
        } catch (error) {
            console.error('Error fetching stages:', error)
        }
    }

    const fetchCustomColumns = async () => {
        try {
            const response = await fetch('/api/custom-columns')
            const result = await response.json()
            if (result.success) {
                setCustomColumns(result.data.filter((c: CustomColumn) => c.is_active))
            }
        } catch (error) {
            console.error('Error fetching custom columns:', error)
        }
    }

    useEffect(() => {
        fetchCurrentUser()
        fetchTickets()
        fetchStages()
        fetchCustomColumns()
        fetchUsers()
        fetchServiceTypes()
        fetchDoctors()
        fetchHospitals()
        fetchFieldExecutives()
        fetchFieldVisibility()
    }, [fetchTickets])

    // Subscribe to real-time changes
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('cancelled-tickets-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets'
                },
                (payload) => {
                    fetchTickets()
                }
            )
            .subscribe()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchTickets()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [fetchTickets])

    const uniqueCities = useMemo(() => {
        return [...new Set(hospitals.map(h => h.city).filter(Boolean))].sort()
    }, [hospitals])

    const isFieldVisible = (fieldId: string) => {
        if (fieldId === 'patient_name' && fieldVisibility[fieldId] === undefined) return true
        return fieldVisibility[fieldId] !== false
    }

    const copyTicketId = (ticketId: string) => {
        navigator.clipboard.writeText(ticketId)
        setCopiedTicketId(ticketId)
        setTimeout(() => setCopiedTicketId(null), 2000)
    }

    const filteredServiceTypes = useMemo(() => {
        if (!serviceSearch) return serviceTypes
        return serviceTypes.filter(st =>
            st.name.toLowerCase().includes(serviceSearch.toLowerCase())
        )
    }, [serviceTypes, serviceSearch])

    const tableColumns = useMemo(() => {
        const cols: any[] = []

        // Ticket ID
        cols.push({
            key: 'uid',
            header: 'Ticket ID',
            width: '140px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-[var(--primary-600)]">{ticket.uid}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            copyTicketId(ticket.uid)
                        }}
                        className="p-1 hover:bg-[var(--gray-100)] rounded transition-colors"
                        title="Copy Ticket ID"
                    >
                        {copiedTicketId === ticket.uid ? (
                            <Check size={14} className="text-[var(--success-600)]" />
                        ) : (
                            <Copy size={14} className="text-[var(--text-muted)]" />
                        )}
                    </button>
                </div>
            ),
        })

        // Patient Name
        if (isFieldVisible('patient_name')) {
            cols.push({
                key: 'patient_name',
                header: 'Patient Name',
                width: '180px',
                render: (ticket: Ticket) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-[var(--text-primary)]">
                            {ticket.patient_name || <span className="text-[var(--text-muted)] italic">N/A</span>}
                        </span>
                        {ticket.patient_name_2 && (
                            <span className="text-xs text-[var(--text-secondary)]">& {ticket.patient_name_2}</span>
                        )}
                    </div>
                )
            })
        }

        // Type
        cols.push({
            key: 'type',
            header: 'Type',
            width: '180px',
            render: (ticket: Ticket) => {
                if (ticket.type === 'action' && ticket.action_subtype) {
                    const isDiagnostics = ticket.action_subtype === 'diagnostics'
                    return (
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isDiagnostics ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'}`}>
                                {isDiagnostics ? <Activity size={14} /> : <Stethoscope size={14} />}
                            </div>
                            <span className={`text-sm font-medium ${isDiagnostics ? 'text-purple-700' : 'text-teal-700'}`}>
                                {isDiagnostics ? 'Diagnostics' : 'Therapeutics'}
                            </span>
                        </div>
                    )
                }
                if (ticket.type === 'query') {
                    const queryCategoryLabels: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
                        report_related: { label: 'Report Related', icon: '📄', color: 'text-blue-700', bgColor: 'bg-blue-50' },
                        scientific: { label: 'Scientific', icon: '🔬', color: 'text-purple-700', bgColor: 'bg-purple-50' },
                        billing_related: { label: 'Billing Related', icon: '💰', color: 'text-green-700', bgColor: 'bg-green-50' },
                        others: { label: 'Others', icon: '📋', color: 'text-gray-700', bgColor: 'bg-gray-50' },
                    }
                    const category = ticket.query_category || 'others'
                    const categoryInfo = queryCategoryLabels[category] || queryCategoryLabels.others

                    return (
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${categoryInfo.bgColor}`}>
                                <span className="text-sm">{categoryInfo.icon}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium ${categoryInfo.color}`}>
                                    {categoryInfo.label}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                                    Query
                                </span>
                            </div>
                        </div>
                    )
                }
                return (
                    <Badge color={ticketTypeLabels[ticket.type as keyof typeof ticketTypeLabels]?.color || '#6b7280'}>
                        {ticketTypeLabels[ticket.type as keyof typeof ticketTypeLabels]?.label || ticket.type}
                    </Badge>
                )
            },
        })

        // Status
        cols.push({
            key: 'current_stage',
            header: 'Status',
            width: '160px',
            render: (ticket: Ticket) => (
                ticket.current_stage ? (
                    <Badge color={ticket.current_stage.color}>
                        {ticket.current_stage.name}
                    </Badge>
                ) : '-'
            ),
        })

        // Hospital
        cols.push({
            key: 'hospital',
            header: 'Hospital',
            width: '180px',
            render: (ticket: Ticket) => (
                <span className="text-sm font-medium">{ticket.hospital?.name || '-'}</span>
            ),
        })

        // Service
        cols.push({
            key: 'service_type',
            header: 'Service',
            width: '180px',
            render: (ticket: Ticket) => (
                <span className="text-sm">{ticket.service_type?.name || '-'}</span>
            ),
        })

        // Created
        cols.push({
            key: 'created_at',
            header: 'Created',
            width: '120px',
            render: (ticket: Ticket) => (
                <span className="text-sm text-[var(--text-secondary)]">{formatDate(ticket.created_at)}</span>
            ),
        })

        // Custom Columns
        customColumns
            .filter(col => col.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .forEach(col => {
                cols.push({
                    key: `custom_${col.id}`,
                    header: col.display_name,
                    width: '140px',
                    render: (ticket: Ticket) => (
                        <span className="text-sm">{getCustomValue(ticket, col.id)}</span>
                    )
                })
            })

        // Actions
        cols.push({
            key: 'actions',
            header: '',
            width: '80px',
            render: (ticket: Ticket) => (
                <Link href={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                        <Eye size={16} />
                    </Button>
                </Link>
            ),
        })

        return cols
    }, [customColumns, fieldVisibility, copiedTicketId])

    const getCustomValue = (ticket: Ticket, columnId: string) => {
        const customValue = ticket.custom_values?.find(
            cv => cv.column?.id === columnId
        )
        return customValue?.value || '-'
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="spinner spinner-lg" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cancelled Tickets</h1>
                    <p className="text-[var(--text-secondary)]">View all tickets that have been cancelled</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchTickets()}
                        disabled={loading}
                        leftIcon={<RotateCcw size={16} className={loading ? 'animate-spin' : ''} />}
                        className="text-[var(--text-secondary)] hover:text-[var(--primary-600)]"
                    >
                        Refresh
                    </Button>
                    <Link href="/tickets">
                        <Button variant="secondary">View All Tickets</Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                </div>
            )}

            <Card>
                <Card className="mb-4">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                                <Input
                                    placeholder="Search tickets..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setShowFilters(!showFilters)}
                                leftIcon={<Filter size={18} />}
                            >
                                Filters
                            </Button>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-light)]"
                                >
                                    <Select
                                        label="Type"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Types' },
                                            { value: 'action', label: 'Action' },
                                            { value: 'query', label: 'Query' },
                                            { value: 'info', label: 'Info' },
                                        ]}
                                    />
                                    {typeFilter === 'action' && (
                                        <Select
                                            label="Action Subtype"
                                            value={actionSubtypeFilter}
                                            onChange={(e) => setActionSubtypeFilter(e.target.value)}
                                            options={[
                                                { value: '', label: 'All Subtypes' },
                                                { value: 'diagnostics', label: 'Diagnostics' },
                                                { value: 'therapeutics', label: 'Therapeutics' },
                                            ]}
                                        />
                                    )}
                                    <div className="relative">
                                        <Input
                                            label="Service Type"
                                            placeholder="Search services..."
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
                                        />
                                        {serviceSearch && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--border-default)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredServiceTypes.length > 0 ? (
                                                    filteredServiceTypes.map(st => (
                                                        <button
                                                            key={st.id}
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 hover:bg-[var(--gray-50)]"
                                                            onClick={() => {
                                                                setServiceTypeFilter(st.id)
                                                                setServiceSearch('')
                                                            }}
                                                        >
                                                            {st.name}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-2 text-[var(--text-muted)]">No services found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Select
                                        label="Doctor"
                                        value={doctorFilter}
                                        onChange={(e) => setDoctorFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Doctors' },
                                            ...doctors.map(d => ({ value: d.id, label: d.name })),
                                        ]}
                                    />
                                    <Select
                                        label="Hospital"
                                        value={hospitalFilter}
                                        onChange={(e) => setHospitalFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Hospitals' },
                                            ...hospitals.map(h => ({ value: h.id, label: h.name })),
                                        ]}
                                    />
                                    <Select
                                        label="City"
                                        value={cityFilter}
                                        onChange={(e) => setCityFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Cities' },
                                            ...uniqueCities.map(c => ({ value: c, label: c })),
                                        ]}
                                        leftIcon={<MapPin size={16} />}
                                    />
                                    <Select
                                        label="Field Executive"
                                        value={fieldExecutiveFilter}
                                        onChange={(e) => setFieldExecutiveFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Field Executives' },
                                            ...fieldExecutives.map(fe => ({ value: fe.id, label: fe.full_name })),
                                        ]}
                                        leftIcon={<UserIcon size={16} />}
                                    />
                                    {(typeFilter || actionSubtypeFilter || serviceTypeFilter || doctorFilter || hospitalFilter || cityFilter || fieldExecutiveFilter) && (
                                        <div className="flex items-end">
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setTypeFilter('')
                                                    setActionSubtypeFilter('')
                                                    setServiceTypeFilter('')
                                                    setServiceSearch('')
                                                    setDoctorFilter('')
                                                    setHospitalFilter('')
                                                    setCityFilter('')
                                                    setFieldExecutiveFilter('')
                                                }}
                                                leftIcon={<X size={16} />}
                                            >
                                                Clear Filters
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Card>

                <Table
                    columns={tableColumns}
                    data={tickets}
                    loading={loading}
                    emptyMessage="No cancelled tickets found"
                    onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
                    getRowKey={(ticket) => ticket.id}
                />
                <Pagination
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchTickets(page)}
                    className="mt-4"
                />
            </Card>
        </div>
    )
}
