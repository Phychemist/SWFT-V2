'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Activity, Stethoscope, Copy, Check, Filter, X, Calendar, Clock, Building2, User as UserIcon, RotateCcw, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button, Input, Select, Card, Table, Badge, Pagination } from '@/components/ui'
import { StatusChangeModal, type StatusChangeData, type DownloadPdfData } from '@/components/StatusChangeModal'
import { FECalendarModal } from '@/components/FECalendarModal'
import { DownloadRequiredModal } from '@/components/DownloadRequiredModal'
import type { AssignmentPDFData } from '@/lib/pdf-utils'
import type { Ticket, WorkflowStage, CustomColumn, User, SessionUser, ServiceType, Doctor, Hospital } from '@/lib/types'
import { getAggregatePatientType } from '@/lib/diagnostic-helpers'
import { createClient } from '@/lib/supabase'

const PAGE_SIZE = 10

const ticketTypeLabels = {
    action: { label: 'Action', color: '#8b5cf6' },
    query: { label: 'Query', color: '#3b82f6' },
    info: { label: 'Info', color: '#6b7280' },
}

export default function TicketsPage() {
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
    const [stageFilter, setStageFilter] = useState('')
    const [doctorFilter, setDoctorFilter] = useState('')
    const [hospitalFilter, setHospitalFilter] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [fieldExecutiveFilter, setFieldExecutiveFilter] = useState('')
    const [fieldExecutives, setFieldExecutives] = useState<User[]>([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [updatingTicket, setUpdatingTicket] = useState<string | null>(null)
    const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // Calendar Modal State
    const [calendarOpen, setCalendarOpen] = useState(false)

    // Download Required Modal State
    const [downloadModalOpen, setDownloadModalOpen] = useState(false)
    const [downloadPdfData, setDownloadPdfData] = useState<AssignmentPDFData | null>(null)

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Status Change Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false)
    const [statusTargetStage, setStatusTargetStage] = useState<WorkflowStage | null>(null)
    const [statusTicketId, setStatusTicketId] = useState<string | null>(null)
    const [statusCurrentStageId, setStatusCurrentStageId] = useState<string | null>(null)

    // ===========================================
    // PERMISSION CHECKS (Granular)
    // ===========================================

    // Can edit ticket metadata (patient info, etc.) - admin, manager, customer_success
    const canEditMetadata =
        currentUser?.role === 'admin' ||
        currentUser?.role === 'manager' ||
        currentUser?.role === 'customer_success'

    // Can edit workflow fields (status, assignment) - admin, manager only
    const canEditWorkflow =
        currentUser?.role === 'admin' ||
        currentUser?.role === 'manager'

    // Legacy alias for places where any edit is sufficient
    const canEdit = canEditWorkflow

    // Check if a built-in field is visible
    const isFieldVisible = (fieldId: string) => {
        // Default patient_name to true if not explicitly hidden (it might not be in DB seeds yet)
        if (fieldId === 'patient_name' && fieldVisibility[fieldId] === undefined) return true
        return fieldVisibility[fieldId] !== false // Default to true
    }

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

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users')
            const result = await response.json()
            if (result.success) {
                setUsers(result.data.filter((u: User) => u.is_active))
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const fetchDoctors = async () => {
        try {
            const response = await fetch('/api/doctors')
            const result = await response.json()
            if (result.success) setDoctors(result.data)
        } catch (error) {
            console.error('Error fetching doctors:', error)
        }
    }

    const fetchHospitals = async () => {
        try {
            const response = await fetch('/api/hospitals')
            const result = await response.json()
            if (result.success) setHospitals(result.data)
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
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (typeFilter) params.set('type', typeFilter)
            if (actionSubtypeFilter) params.set('action_subtype', actionSubtypeFilter)
            if (serviceTypeFilter) params.set('service_type_id', serviceTypeFilter)
            if (stageFilter) params.set('stage_id', stageFilter)
            if (doctorFilter) params.set('doctor_id', doctorFilter)
            if (hospitalFilter) params.set('hospital_id', hospitalFilter)
            if (cityFilter) params.set('city', cityFilter)
            if (fieldExecutiveFilter) params.set('assigned_to', fieldExecutiveFilter)
            if (startDate) params.set('start_date', startDate)
            if (endDate) params.set('end_date', endDate)
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
    }, [debouncedSearch, typeFilter, actionSubtypeFilter, serviceTypeFilter, stageFilter, doctorFilter, hospitalFilter, cityFilter, fieldExecutiveFilter, startDate, endDate])

    const fetchStages = async () => {
        try {
            const response = await fetch('/api/workflow-stages')
            const result = await response.json()
            if (result.success) {
                const filteredStages = result.data
                    .filter((s: WorkflowStage) =>
                        s.is_active &&
                        s.name.toLowerCase().trim() !== 'cancelled' &&
                        s.name.toLowerCase().trim() !== 'cancelleed'
                    )
                setStages(filteredStages)
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

    const fetchServiceTypes = async () => {
        try {
            const response = await fetch('/api/service-types')
            const result = await response.json()
            if (result.success) {
                setServiceTypes(result.data.filter((s: ServiceType) => s.is_active))
            }
        } catch (error) {
            console.error('Error fetching service types:', error)
        }
    }

    useEffect(() => {
        fetchCurrentUser()
        fetchFieldVisibility()
        fetchStages()
        fetchCustomColumns()
        fetchUsers()
        fetchServiceTypes()
        fetchDoctors()
        fetchHospitals()
        fetchFieldExecutives()
    }, [])

    useEffect(() => {
        fetchTickets()
    }, [fetchTickets])

    // Subscribe to real-time changes
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('tickets-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets'
                },
                (payload) => {
                    // Refresh tickets when any change occurs
                    fetchTickets()
                }
            )
            .subscribe()

        // Robustness: Refresh data when tab becomes visible again
        // (Browsers often throttle/pause background tabs)
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

    // Filtered service types based on category and search
    const filteredServices = useMemo(() => {
        return serviceTypes.filter(s =>
            s.category === actionSubtypeFilter &&
            (serviceSearch === '' || s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
        )
    }, [serviceTypes, actionSubtypeFilter, serviceSearch])

    // Unique cities derived from hospitals list
    const uniqueCities = useMemo(() => {
        return [...new Set(hospitals.map(h => h.city).filter(Boolean))].sort()
    }, [hospitals])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    // Get custom value for a ticket and column
    const getCustomValue = (ticket: Ticket, columnId: string) => {
        const cv = ticket.custom_values?.find((v) => v.column_id === columnId)
        return cv?.value || ''
    }

    // Get label for a custom value (for tag/dropdown types)
    const getCustomValueLabel = (column: CustomColumn, value: string) => {
        if (!value) return '-'
        if (column.column_type === 'tag' || column.column_type === 'dropdown') {
            const option = column.options?.find((o) => o.value === value)
            return option?.label || value
        }
        return value
    }

    // Update ticket field (status, assignment, or custom value)
    const updateTicket = async (ticketId: string, updates: Record<string, any>) => {
        if (!canEdit) return

        setUpdatingTicket(ticketId)
        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })
            const result = await response.json()
            if (result.success) {
                setTickets((prev) => prev.map((t) => (t.id === ticketId ? result.data : t)))
            }
        } catch (error) {
            console.error('Error updating ticket:', error)
        } finally {
            setUpdatingTicket(null)
        }
    }

    const handleStatusChange = (ticketId: string, stageId: string) => {
        const ticket = tickets.find(t => t.id === ticketId)
        const stage = stages.find(s => s.id === stageId)

        if (!ticket || !stage) return

        // Always trigger modal for all status changes to record date/time
        setStatusTicketId(ticketId)
        setStatusTargetStage(stage)
        setStatusCurrentStageId(ticket.current_stage_id)
        setStatusModalOpen(true)
    }

    const handleConfirmStatusChange = async (data: StatusChangeData) => {
        try {
            const response = await fetch('/api/status-transitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (result.success) {
                // Refresh tickets to show updated status/assigned user
                await fetchTickets()
                router.refresh()
                // Close modal and reset state
                setStatusModalOpen(false)
                setStatusTicketId(null)
                setStatusTargetStage(null)
            } else {
                const errMsg = result.error || 'Failed to update status'
                setError(errMsg)
                throw new Error(errMsg)
            }
        } catch (err: any) {
            console.error(err)
            if (!err.message?.includes('Failed to update status')) {
                setError('An error occurred while updating status')
            }
            throw err
        }
    }

    // Handler for when download is required (triggered by StatusChangeModal on Assigned status)
    const handleDownloadRequired = (pdfData: DownloadPdfData) => {
        // Close the status change modal
        setStatusModalOpen(false)
        setStatusTicketId(null)
        setStatusTargetStage(null)

        // Open the download required modal
        setDownloadPdfData(pdfData)
        setDownloadModalOpen(true)
    }

    // Handler for when download is complete
    const handleDownloadComplete = () => {
        setDownloadModalOpen(false)
        setDownloadPdfData(null)
        fetchTickets() // Refresh list
    }

    const handleAssignmentChange = (ticketId: string, userId: string) => {
        updateTicket(ticketId, { assigned_to: userId })
    }

    const handleCustomValueChange = (ticketId: string, columnId: string, value: string) => {
        updateTicket(ticketId, { custom_values: { [columnId]: value } })
    }

    // Copy ticket details to clipboard for WhatsApp sharing
    const copyTicketDetails = async (ticket: Ticket, e: React.MouseEvent) => {
        e.stopPropagation()

        // Format the ticket details
        const lines: string[] = []

        // Service type and action
        if (ticket.type === 'action' && ticket.action_subtype) {
            const actionType = ticket.action_subtype === 'diagnostics' ? 'Diagnostics' : 'Therapeutics'
            if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                const activeTests = ticket.diagnostics
                    .filter((d: any) => !d.is_cancelled)
                    .map((d: any) => d.service_type?.name)
                    .filter(Boolean)
                const serviceName = activeTests.length > 0 ? activeTests.join(', ') : 'Not specified'
                lines.push(`📋 *${actionType}*: ${serviceName}`)
            } else {
                const serviceName = ticket.service_type?.name || 'Not specified'
                lines.push(`📋 *${actionType}*: ${serviceName}`)
            }
        } else {
            lines.push(`📋 *Type*: ${ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}`)
        }

        // Ticket number
        lines.push(`🎫 *Ticket*: ${ticket.uid}`)

        // Patients with ages
        const patient1 = ticket.patient_name
            ? `${ticket.patient_name}${ticket.patient_age_1 ? ` (${ticket.patient_age_1} yrs)` : ''}`
            : null
        const patient2 = ticket.patient_name_2
            ? `${ticket.patient_name_2}${ticket.patient_age_2 ? ` (${ticket.patient_age_2} yrs)` : ''}`
            : null

        const isAction = ticket.type === 'action'

        // Compute patient field visibility from diagnostics or single service type
        let showMale: boolean
        let showFemale: boolean
        if (isAction && ticket.diagnostics && ticket.diagnostics.length > 0) {
            const agg = getAggregatePatientType(ticket.diagnostics)
            showMale = agg.showMale
            showFemale = agg.showFemale
        } else if (isAction) {
            const pType = ticket.service_type?.patient_type || 'couple'
            showMale = pType === 'couple' || pType === 'male_only'
            showFemale = pType === 'couple' || pType === 'female_only'
        } else {
            showMale = true
            showFemale = true
        }

        if (isAction && showMale && showFemale) {
            lines.push(`👥 *Patients*:`)
            if (patient1) lines.push(`   ♂️ *Husband*: ${patient1}`)
            if (patient2) lines.push(`   ♀️ *Wife*: ${patient2}`)
            if (!patient1 && !patient2) lines.push(`👤 *Patient*: Not specified`)
        } else if (isAction && showMale && !showFemale) {
            lines.push(`♂️ *Husband*: ${patient1 || 'Not specified'}`)
        } else if (isAction && !showMale && showFemale) {
            lines.push(`♀️ *Wife*: ${patient2 || 'Not specified'}`)
        } else {
            // Default/Fallback for non-action or unspecified
            if (patient1 && patient2) {
                lines.push(`👥 *Patients*:`)
                lines.push(`   ♂️ ${patient1}`)
                lines.push(`   ♀️ ${patient2}`)
            } else if (patient1) {
                lines.push(`👤 *Patient*: ${patient1}`)
            } else if (patient2) {
                lines.push(`👤 *Patient*: ${patient2}`)
            } else {
                lines.push(`👤 *Patient*: Not specified`)
            }
        }

        // Field Officer
        if (ticket.assigned_user?.full_name) {
            lines.push(`👮 *Field Officer*: ${ticket.assigned_user.full_name}`)
        }

        // Hospital name
        if (isFieldVisible('hospital')) {
            lines.push(`🏥 *Hospital*: ${ticket.hospital?.name || 'Not specified'}`)
        }
        if (isFieldVisible('hospital_city') && ticket.hospital?.city) {
            lines.push(`🌆 *City*: ${ticket.hospital.city}`)
        }
        if (isFieldVisible('hospital_address') && ticket.hospital?.address) {
            lines.push(`📫 *Hospital Address*: ${ticket.hospital.address}`)
        }
        if (isFieldVisible('hospital_location') && ticket.hospital?.location) {
            lines.push(`📍 *Location*: ${ticket.hospital.location}`)
        }
        if (isFieldVisible('hospital_contact') && ticket.hospital?.contact) {
            lines.push(`📞 *Hospital Contact*: ${ticket.hospital.contact}`)
        }

        // Pickup location
        if (ticket.collection_location === 'hospital') {
            lines.push(`📍 *Pickup*: Hospital`)
        } else if (ticket.collection_location === 'home') {
            lines.push(`📍 *Pickup*: Patient Home`)
            if (ticket.collection_address) {
                lines.push(`📫 *Address*: ${ticket.collection_address}`)
            }
        } else {
            lines.push(`📍 *Pickup*: Not specified`)
        }

        // Date
        if (ticket.scheduled_date) {
            let dateStr = ticket.scheduled_date
            try {
                const [y, m, d] = ticket.scheduled_date.split('-')
                dateStr = `${d}/${m}/${y}`
            } catch (e) { }

            let timeStr = ''
            if (ticket.scheduled_time) {
                try {
                    const [h, m] = ticket.scheduled_time.split(':')
                    const hour = parseInt(h)
                    const ampm = hour >= 12 ? 'PM' : 'AM'
                    const hour12 = hour % 12 || 12
                    timeStr = ` at ${hour12}:${m} ${ampm}`
                } catch (e) { }
            }
            lines.push(`📅 *Scheduled Pickup*: ${dateStr}${timeStr}`)
        } else {
            lines.push(`📅 *Date*: ${formatDate(ticket.created_at)}`)
        }

        // Service type details (Kit, Requirements, Protocol)
        if (ticket.diagnostics && ticket.diagnostics.length > 0) {
            const activeDiagnostics = ticket.diagnostics.filter((d: any) => !d.is_cancelled)
            for (const diag of activeDiagnostics) {
                const st = diag.service_type
                if (st && (st.kit || st.requirements || st.protocol)) {
                    lines.push('') // Empty line for separation
                    lines.push('─────────────────')
                    if (activeDiagnostics.length > 1 && st.name) {
                        lines.push(`🔬 *${st.name}*:`)
                    }
                    if (st.kit) {
                        lines.push(`🧰 *Kit to Carry*:`)
                        lines.push(st.kit)
                    }
                    if (st.requirements) {
                        lines.push(`📝 *Requirements*:`)
                        lines.push(st.requirements)
                    }
                    if (st.protocol) {
                        lines.push(`📖 *Protocol*:`)
                        lines.push(st.protocol)
                    }
                }
            }
        } else if (ticket.service_type) {
            lines.push('') // Empty line for separation
            lines.push('─────────────────')

            if (ticket.service_type.kit) {
                lines.push(`🧰 *Kit to Carry*:`)
                lines.push(ticket.service_type.kit)
            }

            if (ticket.service_type.requirements) {
                lines.push(`📝 *Requirements*:`)
                lines.push(ticket.service_type.requirements)
            }

            if (ticket.service_type.protocol) {
                lines.push(`📖 *Protocol*:`)
                lines.push(ticket.service_type.protocol)
            }
        }

        const text = lines.join('\n')

        try {
            await navigator.clipboard.writeText(text)
            setCopiedTicketId(ticket.id)
            setTimeout(() => setCopiedTicketId(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    // Build dynamic columns based on visibility settings
    const buildColumns = () => {
        const allColumns: any[] = []

        // Always show Ticket ID (not configurable)
        allColumns.push({
            key: 'uid',
            header: 'Ticket ID',
            width: '120px',
            render: (ticket: Ticket) => (
                <span className="font-mono text-sm font-medium text-[var(--primary-600)]">
                    {ticket.uid}
                </span>
            ),
        })

        // Type column - REDESIGNED
        if (isFieldVisible('type')) {
            allColumns.push({
                key: 'type',
                header: 'Type',
                width: '160px',
                render: (ticket: Ticket) => {
                    // Action Types (Diagnostics / Therapeutics)
                    if (ticket.type === 'action' && ticket.action_subtype) {
                        const isDiagnostics = ticket.action_subtype === 'diagnostics'
                        return (
                            <div className="flex items-center gap-2">
                                <div className={`
                                    flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm flex-shrink-0
                                    ${isDiagnostics
                                        ? 'bg-purple-50 border-purple-100 text-purple-600'
                                        : 'bg-teal-50 border-teal-100 text-teal-600'
                                    }
                                `}>
                                    {isDiagnostics ? <Activity size={16} /> : <Stethoscope size={16} />}
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${isDiagnostics ? 'text-purple-700' : 'text-teal-700'}`}>
                                        {isDiagnostics ? 'Diagnostics' : 'Therapeutics'}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)] leading-none uppercase tracking-wide">
                                        Action
                                    </p>
                                </div>
                            </div>
                        )
                    }

                    // Fallback for Action without subtype (legacy/error case)
                    if (ticket.type === 'action') {
                        return (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 text-violet-600 shadow-sm flex-shrink-0">
                                    <Activity size={16} />
                                </div>
                                <span className="font-medium text-sm text-violet-700">Action</span>
                            </div>
                        )
                    }

                    // Query Type - Show category
                    if (ticket.type === 'query') {
                        const queryCategoryLabels: Record<string, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
                            report_related: { label: 'Report Related', icon: '📄', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
                            scientific: { label: 'Scientific', icon: '🔬', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
                            billing_related: { label: 'Billing Related', icon: '💰', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-100' },
                            others: { label: 'Others', icon: '📋', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-100' },
                        }
                        const category = ticket.query_category || 'others'
                        const categoryInfo = queryCategoryLabels[category] || queryCategoryLabels.others

                        return (
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${categoryInfo.bgColor} border ${categoryInfo.borderColor} text-[var(--text-primary)] shadow-sm flex-shrink-0`}>
                                    <span className="text-sm">{categoryInfo.icon}</span>
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${categoryInfo.color}`}>
                                        {categoryInfo.label}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)] leading-none uppercase tracking-wide">
                                        Query
                                    </p>
                                </div>
                            </div>
                        )
                    }

                    // Info Type
                    return (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 shadow-sm flex-shrink-0">
                                <Eye size={16} />
                            </div>
                            <span className="font-medium text-sm text-gray-700">Info</span>
                        </div>
                    )
                },
            })
        }

        // Patient Name column (REDESIGNED)
        if (isFieldVisible('patient_name')) {
            allColumns.push({
                key: 'patient_name',
                header: 'Patient Information',
                width: '180px',
                render: (ticket: Ticket) => {
                    const isAction = ticket.type === 'action'

                    // Determine what to show based on diagnostics or single service type
                    let showHusband: boolean
                    let showWife: boolean
                    if (isAction && ticket.diagnostics && ticket.diagnostics.length > 0) {
                        const agg = getAggregatePatientType(ticket.diagnostics)
                        showHusband = agg.showMale
                        showWife = agg.showFemale
                    } else if (isAction) {
                        const pType = ticket.service_type?.patient_type || 'couple'
                        showHusband = pType === 'couple' || pType === 'male_only'
                        showWife = pType === 'couple' || pType === 'female_only'
                    } else {
                        showHusband = true
                        showWife = false
                    }

                    return (
                        <div className="flex flex-col gap-1 py-1">
                            {/* Husband / Patient 1 */}
                            {showHusband && ticket.patient_name && (
                                <div className="flex items-center gap-2 group">
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex-shrink-0">
                                        <span className="text-xs font-bold leading-none">♂</span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                                            {ticket.patient_name}
                                        </span>
                                        {ticket.patient_age_1 && (
                                            <span className="text-[10px] text-[var(--text-muted)] leading-none italic">
                                                {ticket.patient_age_1} years
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Wife / Patient 2 */}
                            {showWife && ticket.patient_name_2 && (
                                <div className="flex items-center gap-2 group">
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-pink-50 text-pink-600 border border-pink-100 shadow-sm flex-shrink-0">
                                        <span className="text-xs font-bold leading-none">♀</span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                                            {ticket.patient_name_2}
                                        </span>
                                        {ticket.patient_age_2 && (
                                            <span className="text-[10px] text-[var(--text-muted)] leading-none italic">
                                                {ticket.patient_age_2} years
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fallback if no names yet */}
                            {!ticket.patient_name && !ticket.patient_name_2 && (
                                <span className="text-[var(--text-muted)] italic text-sm font-light">
                                    No patient info
                                </span>
                            )}

                            {/* Secondary: Doctor (shifted from Hospital column context) */}
                            {ticket.doctor?.name && (
                                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-1 font-medium bg-[var(--gray-50)] px-1.5 py-0.5 rounded border border-[var(--border-light)] w-fit">
                                    <Stethoscope size={10} className="text-[var(--primary-500)]" />
                                    Dr. {ticket.doctor.name}
                                </span>
                            )}
                        </div>
                    )
                },
            })
        }

        // Hospital column (Simplified - pure institution focus)
        if (isFieldVisible('hospital')) {
            allColumns.push({
                key: 'hospital',
                header: 'Hospital',
                width: '180px',
                render: (ticket: Ticket) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--primary-600)]">
                            {ticket.hospital?.name || <span className="text-[var(--text-muted)] italic font-normal">No Hospital</span>}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border-default)] px-1 rounded-sm bg-[var(--gray-50)]">
                                Inst
                            </span>
                        </div>
                    </div>
                ),
            })
        }

        // Status column
        if (isFieldVisible('status')) {
            allColumns.push({
                key: 'status',
                header: 'Status',
                width: '140px',
                render: (ticket: Ticket) => {
                    if (!canEdit) {
                        if (!ticket.current_stage) return <span className="text-[var(--text-muted)]">-</span>
                        return <Badge color={ticket.current_stage.color}>{ticket.current_stage.name}</Badge>
                    }
                    return (
                        <select
                            value={ticket.current_stage_id || ''}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            disabled={updatingTicket === ticket.id}
                            className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Select status</option>
                            {stages.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )
                },
            })
        }

        // Assigned To column
        if (isFieldVisible('assigned_to')) {
            allColumns.push({
                key: 'assigned',
                header: 'Assigned To',
                width: '140px',
                render: (ticket: Ticket) => {
                    if (!canEdit) {
                        return (
                            <span className="text-sm">
                                {ticket.assigned_user?.full_name || <span className="text-[var(--text-muted)]">Unassigned</span>}
                            </span>
                        )
                    }
                    return (
                        <select
                            value={ticket.assigned_to || ''}
                            onChange={(e) => handleAssignmentChange(ticket.id, e.target.value)}
                            disabled={updatingTicket === ticket.id}
                            className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    )
                },
            })
        }

        // Add custom columns dynamically
        customColumns.forEach((column) => {
            allColumns.push({
                key: `custom_${column.id}`,
                header: column.display_name,
                width: '130px',
                render: (ticket: Ticket) => {
                    const value = getCustomValue(ticket, column.id)

                    if (!canEdit) {
                        if (column.column_type === 'tag' && value) {
                            const option = column.options?.find((o) => o.value === value)
                            return <Badge color={option?.color}>{option?.label || value}</Badge>
                        }
                        return (
                            <span className="text-sm text-[var(--text-primary)]">
                                {getCustomValueLabel(column, value)}
                            </span>
                        )
                    }

                    if (column.column_type === 'tag' || column.column_type === 'dropdown') {
                        return (
                            <select
                                value={value}
                                onChange={(e) => handleCustomValueChange(ticket.id, column.id, e.target.value)}
                                disabled={updatingTicket === ticket.id}
                                className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="">-</option>
                                {column.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )
                    }

                    if (column.column_type === 'text') {
                        return (
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleCustomValueChange(ticket.id, column.id, e.target.value)}
                                disabled={updatingTicket === ticket.id}
                                className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                                placeholder="-"
                            />
                        )
                    }

                    if (column.column_type === 'number') {
                        return (
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => handleCustomValueChange(ticket.id, column.id, e.target.value)}
                                disabled={updatingTicket === ticket.id}
                                className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                                placeholder="-"
                            />
                        )
                    }

                    if (column.column_type === 'date') {
                        return (
                            <input
                                type="date"
                                value={value}
                                onChange={(e) => handleCustomValueChange(ticket.id, column.id, e.target.value)}
                                disabled={updatingTicket === ticket.id}
                                className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )
                    }

                    return <span className="text-[var(--text-muted)]">-</span>
                },
            })
        })

        // Created at column
        if (isFieldVisible('created_at')) {
            allColumns.push({
                key: 'created_at',
                header: 'Created',
                width: '100px',
                render: (ticket: Ticket) => (
                    <span className="text-sm text-[var(--text-secondary)]">
                        {formatDate(ticket.created_at)}
                    </span>
                ),
            })
        }

        // Actions column (always visible)
        allColumns.push({
            key: 'actions',
            header: '',
            width: canEdit ? '100px' : '60px',
            render: (ticket: Ticket) => (
                <div className="flex items-center gap-1">
                    {/* Copy button - Only for admin/manager */}
                    {canEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => copyTicketDetails(ticket, e)}
                            title="Copy ticket details for WhatsApp"
                            className={copiedTicketId === ticket.id ? 'text-[var(--success-600)]' : ''}
                        >
                            {copiedTicketId === ticket.id ? <Check size={16} /> : <Copy size={16} />}
                        </Button>
                    )}
                    <Link href={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                            <Eye size={16} />
                        </Button>
                    </Link>
                </div>
            ),
        })

        return allColumns
    }

    return (
        <div className="animate-fade-in">
            {statusTicketId && (
                <StatusChangeModal
                    isOpen={statusModalOpen}
                    onClose={() => setStatusModalOpen(false)}
                    onConfirm={handleConfirmStatusChange}
                    onDownloadRequired={handleDownloadRequired}
                    targetStage={statusTargetStage}
                    currentStageId={statusCurrentStageId}
                    ticketId={statusTicketId}
                    ticketData={tickets.find(t => t.id === statusTicketId)}
                    currentUserRole={currentUser?.role}
                />
            )}


            {/* Mandatory Download Modal - Cannot be dismissed until download is done */}
            <DownloadRequiredModal
                isOpen={downloadModalOpen}
                onComplete={handleDownloadComplete}
                onConfirmTransition={handleConfirmStatusChange}
                pdfData={downloadPdfData}
            />
            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-[var(--error-50)] border border-[var(--error-600)]/20 text-[var(--error-600)] flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm font-medium hover:underline">Dismiss</button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tickets</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {canEditWorkflow
                            ? 'Manage all WhatsApp-converted tickets'
                            : canEditMetadata
                                ? 'View and edit ticket details'
                                : 'View all WhatsApp-converted tickets'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canEditMetadata && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCalendarOpen(true)}
                            leftIcon={<Calendar size={16} />}
                            className="text-[var(--text-secondary)] hover:text-[var(--primary-600)]"
                        >
                            FE Calendar
                        </Button>
                    )}
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
                    {/* Create Ticket - visible to admin, manager, customer_success */}
                    {canEditMetadata && (
                        <Link href="/tickets/new">
                            <Button leftIcon={<Plus size={18} />}>Create Ticket</Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters Area */}
            <div className="space-y-4 mb-6">
                <Card padding="md" className="overflow-visible shadow-sm border-[var(--border-light)]">
                    <div className="flex flex-col gap-6">
                        {/* Top Row: Search and Status */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[300px]">
                                <Input
                                    placeholder="Search by ID, Patient, Doctor, Hospital..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    leftIcon={<Search size={18} className="text-[var(--text-muted)]" />}
                                    className="bg-[var(--gray-50)]/50 border-[var(--border-light)] hover:border-[var(--primary-300)] transition-all"
                                />
                            </div>

                            <div className="w-[200px]">
                                <Select
                                    value={stageFilter}
                                    onChange={(e) => setStageFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Statuses' },
                                        ...stages.map((s) => ({ value: s.id, label: s.name })),
                                    ]}
                                    leftIcon={<Filter size={16} />}
                                    placeholder="Stage"
                                />
                            </div>

                            {(typeFilter || actionSubtypeFilter || serviceTypeFilter || stageFilter || doctorFilter || hospitalFilter || cityFilter || fieldExecutiveFilter || searchQuery || startDate || endDate) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setTypeFilter('')
                                        setActionSubtypeFilter('')
                                        setServiceTypeFilter('')
                                        setStageFilter('')
                                        setDoctorFilter('')
                                        setHospitalFilter('')
                                        setCityFilter('')
                                        setFieldExecutiveFilter('')
                                        setSearchQuery('')
                                        setServiceSearch('')
                                        setStartDate('')
                                        setEndDate('')
                                    }}
                                    className="text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors whitespace-nowrap"
                                >
                                    <X size={14} className="mr-1.5" />
                                    Clear Filters
                                </Button>
                            )}
                        </div>

                        {/* Top Row Part 2: More Selectors */}
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="w-[180px]">
                                <Select
                                    value={doctorFilter}
                                    onChange={(e) => setDoctorFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Doctors' },
                                        ...doctors.map(d => ({ value: d.id, label: d.name }))
                                    ]}
                                    placeholder="Doctor"
                                    leftIcon={<Stethoscope size={16} />}
                                />
                            </div>

                            <div className="w-[180px]">
                                <Select
                                    value={hospitalFilter}
                                    onChange={(e) => setHospitalFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Hospitals' },
                                        ...hospitals.map(h => ({ value: h.id, label: h.name }))
                                    ]}
                                    placeholder="Hospital"
                                    leftIcon={<Filter size={16} />}
                                />
                            </div>

                            <div className="w-[180px]">
                                <Select
                                    value={cityFilter}
                                    onChange={(e) => setCityFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Cities' },
                                        ...uniqueCities.map(c => ({ value: c, label: c }))
                                    ]}
                                    placeholder="City"
                                    leftIcon={<MapPin size={16} />}
                                />
                            </div>

                            <div className="w-[200px]">
                                <Select
                                    value={fieldExecutiveFilter}
                                    onChange={(e) => setFieldExecutiveFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Field Executives' },
                                        ...fieldExecutives.map(fe => ({ value: fe.id, label: fe.full_name }))
                                    ]}
                                    placeholder="Field Executive"
                                    leftIcon={<UserIcon size={16} />}
                                />
                            </div>

                            <div className="w-[160px]">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    leftIcon={<Calendar size={14} />}
                                    className="bg-white h-10"
                                />
                            </div>

                            <div className="w-[160px]">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    leftIcon={<Calendar size={14} />}
                                    className="bg-white h-10"
                                />
                            </div>
                        </div>

                        {/* Middle Row: Tabs for Primary Categories */}
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-wrap items-center gap-2 p-1 bg-[var(--gray-100)] w-fit rounded-xl border border-[var(--border-light)] overflow-hidden">
                                {[
                                    { id: '', label: 'All Tickets', icon: null },
                                    { id: 'action', label: 'Actions', icon: <Activity size={14} /> },
                                    { id: 'query', label: 'Queries', icon: <Search size={14} /> },
                                    { id: 'info', label: 'Information', icon: <Eye size={14} /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setTypeFilter(tab.id)
                                            if (tab.id !== 'action') {
                                                setActionSubtypeFilter('')
                                                setServiceTypeFilter('')
                                            }
                                        }}
                                        className={`
                                            relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300
                                            ${typeFilter === tab.id
                                                ? 'text-[var(--primary-700)] z-10'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/40'
                                            }
                                        `}
                                    >
                                        {typeFilter === tab.id && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-white shadow-md border border-[var(--primary-100)]"
                                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            {tab.icon}
                                            {tab.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Sub-filters Layer 1: Sub-categories */}
                            <AnimatePresence mode="wait">
                                {typeFilter === 'action' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: -10 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                                        exit={{ opacity: 0, height: 0, marginTop: -10 }}
                                        className="flex flex-col gap-4 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-4 pl-1">
                                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Category</div>
                                            <div className="flex gap-2.5">
                                                {[
                                                    { id: '', label: 'Full Spectrum', icon: null },
                                                    { id: 'diagnostics', label: 'Diagnostics', icon: <Activity className="w-3.5 h-3.5" /> },
                                                    { id: 'therapeutics', label: 'Therapeutics', icon: <Stethoscope className="w-3.5 h-3.5" /> },
                                                ].map((sub) => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => {
                                                            setActionSubtypeFilter(sub.id)
                                                            setServiceTypeFilter('')
                                                        }}
                                                        className={`
                                                            group flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-300
                                                            ${actionSubtypeFilter === sub.id
                                                                ? sub.id === 'diagnostics' ? 'bg-purple-600 border-purple-600 text-white shadow-lg' :
                                                                    sub.id === 'therapeutics' ? 'bg-teal-600 border-teal-600 text-white shadow-lg' :
                                                                        'bg-[var(--primary-600)] border-[var(--primary-600)] text-white shadow-lg'
                                                                : 'bg-white border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--primary-400)] hover:text-[var(--primary-600)]'
                                                            }
                                                        `}
                                                    >
                                                        {sub.icon}
                                                        {sub.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sub-filters Layer 2: Specific Service Types */}
                                        <AnimatePresence>
                                            {actionSubtypeFilter && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="flex flex-col gap-3 bg-[var(--gray-50)]/50 p-3 rounded-2xl border border-[var(--border-light)]/50"
                                                >
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">
                                                            {actionSubtypeFilter} Types
                                                        </div>
                                                        <div className="relative flex items-center">
                                                            <Search size={14} className="absolute left-3 text-[var(--text-muted)]" />
                                                            <input
                                                                type="text"
                                                                placeholder={`Search ${actionSubtypeFilter}...`}
                                                                value={serviceSearch}
                                                                onChange={(e) => setServiceSearch(e.target.value)}
                                                                className="pl-9 pr-4 py-1.5 text-xs bg-white border border-[var(--border-light)] rounded-full w-[240px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar p-1">
                                                        <button
                                                            onClick={() => setServiceTypeFilter('')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${serviceTypeFilter === ''
                                                                ? 'bg-white border-[var(--primary-500)] text-[var(--primary-700)] shadow-sm'
                                                                : 'bg-white/50 border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--gray-400)]'
                                                                }`}
                                                        >
                                                            All {actionSubtypeFilter}
                                                        </button>
                                                        {filteredServices.map((service) => (
                                                            <button
                                                                key={service.id}
                                                                onClick={() => setServiceTypeFilter(service.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${serviceTypeFilter === service.id
                                                                    ? actionSubtypeFilter === 'diagnostics'
                                                                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                                                                        : 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                                                                    : 'bg-white border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--gray-400)]'
                                                                    }`}
                                                            >
                                                                {service.name}
                                                            </button>
                                                        ))}
                                                        {filteredServices.length === 0 && (
                                                            <span className="text-[var(--text-muted)] text-xs italic ml-2 mt-1">No services matched your search</span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Info about permissions */}
            {customColumns.length > 0 && (
                <p className="text-sm text-[var(--text-muted)] mb-3">
                    {canEdit
                        ? '💡 Edit status, assignment, and custom fields directly in the table below.'
                        : '👁️ You have view-only access to ticket data.'}
                </p>
            )}

            {/* Table / Mobile Cards */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="spinner spinner-lg" />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-[var(--border-light)] rounded-xl text-[var(--text-muted)]">
                        No tickets found.
                    </div>
                ) : (
                    tickets.map((ticket) => {
                        const isAction = ticket.type === 'action'
                        const isDiagnostics = ticket.action_subtype === 'diagnostics'
                        const typeLabel = isAction
                            ? isDiagnostics ? 'Diagnostics' : 'Therapeutics'
                            : ticket.type === 'query' ? 'Query' : 'Info'

                        return (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-xl border border-[var(--border-light)] shadow-sm hover:border-[var(--primary-300)] transition-all"
                                >
                                    {/* Header Row: ID + Status */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-sm font-bold text-[var(--primary-700)]">
                                                {ticket.uid}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatDate(ticket.created_at)}
                                            </span>
                                        </div>
                                        <Badge color={ticket.current_stage?.color || 'gray'} className="text-xs">
                                            {ticket.current_stage?.name || 'Unknown'}
                                        </Badge>
                                    </div>

                                    {/* Content Row: Type & Patient */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`
                                            flex items-center justify-center w-8 h-8 rounded-lg border flex-shrink-0
                                            ${isAction && isDiagnostics ? 'bg-purple-50 border-purple-100 text-purple-600' :
                                                isAction && !isDiagnostics ? 'bg-teal-50 border-teal-100 text-teal-600' :
                                                    ticket.type === 'query' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                        'bg-gray-50 border-gray-100 text-gray-600'
                                            }
                                        `}>
                                            {isAction ? <Activity size={16} /> : ticket.type === 'query' ? <Search size={16} /> : <Eye size={16} />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                                                {typeLabel}
                                            </span>
                                            {(ticket.patient_name || ticket.patient_name_2) ? (
                                                <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                                    {ticket.patient_name || ticket.patient_name_2}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-[var(--text-muted)] italic">No patient info</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Row: Assigned To or Hospital */}
                                    <div className="pt-3 mt-1 border-t border-[var(--border-light)] flex justify-between items-center text-xs text-[var(--text-secondary)]">
                                        <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                                            <Building2 size={12} />
                                            <span className="truncate">{ticket.hospital?.name || 'No Hospital'}</span>
                                        </div>
                                        {ticket.assigned_user && (
                                            <div className="flex items-center gap-1.5 bg-[var(--gray-50)] px-2 py-1 rounded-full border border-[var(--border-light)]">
                                                <UserIcon size={10} />
                                                <span className="font-medium">{ticket.assigned_user.full_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </Link>
                        )
                    })
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <Table
                    columns={buildColumns()}
                    data={tickets}
                    loading={loading}
                    emptyMessage="No tickets found. Create your first ticket to get started."
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
            </div>

            {/* Mobile Pagination */}
            <div className="md:hidden mt-4">
                <Pagination
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchTickets(page)}
                />
            </div>

            <FECalendarModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
        </div>
    )
}
