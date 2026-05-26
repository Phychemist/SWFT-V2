'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal } from '@/components/ui'
import { Badge } from '@/components/ui'
import { ChevronLeft, ChevronRight, X, Clock, MapPin, Building2, User as UserIcon } from 'lucide-react'
import type { CalendarTicket } from '@/app/api/calendar-tickets/route'

interface FECalendarModalProps {
    isOpen: boolean
    onClose: () => void
}

interface FilterOption {
    value: string
    label: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = []

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevMonthDays - i
        const m = month === 0 ? 11 : month - 1
        const y = month === 0 ? year - 1 : year
        days.push({ date: d, month: m, year: y, isCurrentMonth: false })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        days.push({ date: d, month, year, isCurrentMonth: true })
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
        const m = month === 11 ? 0 : month + 1
        const y = month === 11 ? year + 1 : year
        days.push({ date: d, month: m, year: y, isCurrentMonth: false })
    }

    return days
}

function dateKey(year: number, month: number, date: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

function formatTime(time: string | null): string {
    if (!time) return ''
    try {
        const [h, m] = time.split(':')
        const hour = parseInt(h)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${m} ${ampm}`
    } catch {
        return time
    }
}

// Generate a stable color for an FE user based on their ID
const FE_COLORS = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function feColor(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i)
        hash |= 0
    }
    return FE_COLORS[Math.abs(hash) % FE_COLORS.length]
}

export function FECalendarModal({ isOpen, onClose }: FECalendarModalProps) {
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [dayTab, setDayTab] = useState<'available' | 'scheduled'>('available')

    // Filter state
    const [feFilter, setFeFilter] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [stageFilter, setStageFilter] = useState('')

    // Data
    const [tickets, setTickets] = useState<CalendarTicket[]>([])
    const [feOptions, setFeOptions] = useState<FilterOption[]>([])
    const [cityOptions, setCityOptions] = useState<FilterOption[]>([])
    const [stageOptions, setStageOptions] = useState<FilterOption[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch filter options on open
    useEffect(() => {
        if (!isOpen) return

        const fetchOptions = async () => {
            const [feRes, hospRes, stageRes] = await Promise.all([
                fetch('/api/assignable-users?role=field_executive'),
                fetch('/api/hospitals'),
                fetch('/api/workflow-stages'),
            ])

            const [feData, hospData, stageData] = await Promise.all([
                feRes.json(),
                hospRes.json(),
                stageRes.json(),
            ])

            if (feData.success) {
                setFeOptions(feData.data.map((u: any) => ({ value: u.id, label: u.full_name })))
            }
            if (hospData.success) {
                const cities = [...new Set(hospData.data.map((h: any) => h.city).filter(Boolean))] as string[]
                setCityOptions(cities.sort().map(c => ({ value: c, label: c })))
            }
            if (stageData.success) {
                setStageOptions(
                    stageData.data
                        .filter((s: any) => s.is_active)
                        .map((s: any) => ({ value: s.id, label: s.name }))
                )
            }
        }

        fetchOptions()
    }, [isOpen])

    // Fetch tickets when month or filters change
    const fetchTickets = useCallback(async () => {
        if (!isOpen) return
        setLoading(true)

        const startDate = dateKey(currentYear, currentMonth, 1)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
        const endDate = dateKey(currentYear, currentMonth, daysInMonth)

        const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
        if (feFilter) params.set('assigned_to', feFilter)
        if (cityFilter) params.set('city', cityFilter)
        if (stageFilter) params.set('stage_id', stageFilter)

        try {
            const res = await fetch(`/api/calendar-tickets?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setTickets(data.data)
            }
        } catch (err) {
            console.error('Error fetching calendar tickets:', err)
        } finally {
            setLoading(false)
        }
    }, [isOpen, currentYear, currentMonth, feFilter, cityFilter, stageFilter])

    useEffect(() => {
        fetchTickets()
    }, [fetchTickets])

    // Derive ticketsByDate map
    const ticketsByDate = useMemo(() => {
        const map: Record<string, CalendarTicket[]> = {}
        for (const t of tickets) {
            if (!map[t.scheduled_date]) map[t.scheduled_date] = []
            map[t.scheduled_date].push(t)
        }
        return map
    }, [tickets])

    // Scheduled FEs: grouped by FE with city info
    const scheduledGroups = useMemo(() => {
        if (!selectedDate) return []
        const dayTickets = ticketsByDate[selectedDate] || []
        if (dayTickets.length === 0) return []

        const groups: Record<string, { name: string; id: string; tickets: CalendarTicket[]; cities: string[] }> = {}

        for (const t of dayTickets) {
            const key = t.assigned_user_id || 'unassigned'
            if (!groups[key]) {
                groups[key] = {
                    name: t.assigned_user_name || 'Unassigned',
                    id: key,
                    tickets: [],
                    cities: [],
                }
            }
            groups[key].tickets.push(t)
            const city = t.city || 'Unknown'
            if (!groups[key].cities.includes(city)) {
                groups[key].cities.push(city)
            }
        }

        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
    }, [selectedDate, ticketsByDate])

    // Available FEs: those with zero tickets on selected day
    const availableFEs = useMemo(() => {
        if (!selectedDate) return []
        const busyIds = new Set(scheduledGroups.map(g => g.id))
        return feOptions.filter(fe => !busyIds.has(fe.value))
    }, [selectedDate, scheduledGroups, feOptions])

    // Scheduled grouped by city (for the city-first view in scheduled tab)
    const scheduledByCity = useMemo(() => {
        const cityMap: Record<string, { name: string; id: string; tickets: CalendarTicket[] }[]> = {}

        for (const group of scheduledGroups) {
            const cities = group.cities.length > 0 ? group.cities : ['Unknown']
            for (const city of cities) {
                if (!cityMap[city]) cityMap[city] = []
                const cityTickets = group.tickets.filter(t => (t.city || 'Unknown') === city)
                if (cityTickets.length > 0) {
                    cityMap[city].push({ name: group.name, id: group.id, tickets: cityTickets })
                }
            }
        }

        return Object.entries(cityMap).sort(([a], [b]) => a.localeCompare(b))
    }, [scheduledGroups])

    // Reset tab when selecting a new date or changing FE filter
    useEffect(() => {
        if (selectedDate) {
            // When filtered to a specific FE, default to scheduled tab
            setDayTab(feFilter ? 'scheduled' : 'available')
        }
    }, [selectedDate, feFilter])

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(currentYear - 1)
        } else {
            setCurrentMonth(currentMonth - 1)
        }
        setSelectedDate(null)
    }

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(currentYear + 1)
        } else {
            setCurrentMonth(currentMonth + 1)
        }
        setSelectedDate(null)
    }

    const goToday = () => {
        setCurrentYear(today.getFullYear())
        setCurrentMonth(today.getMonth())
        setSelectedDate(dateKey(today.getFullYear(), today.getMonth(), today.getDate()))
    }

    const clearFilters = () => {
        setFeFilter('')
        setCityFilter('')
        setStageFilter('')
    }

    const hasFilters = feFilter || cityFilter || stageFilter

    const monthDays = getMonthDays(currentYear, currentMonth)
    const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())
    const monthLabel = new Date(currentYear, currentMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

    // Format the selected date for display
    const selectedDateLabel = selectedDate
        ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : ''

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="FE Calendar" size="full">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-[var(--border-light)]">
                <select
                    value={feFilter}
                    onChange={(e) => setFeFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] min-w-[180px]"
                >
                    <option value="">All Field Executives</option>
                    {feOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] min-w-[150px]"
                >
                    <option value="">All Cities</option>
                    {cityOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] min-w-[160px]"
                >
                    <option value="">All Stages</option>
                    {stageOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                    >
                        <X size={14} />
                        Clear
                    </button>
                )}

                {loading && (
                    <div className="ml-auto">
                        <div className="spinner spinner-sm" />
                    </div>
                )}
            </div>

            {/* Two-column layout */}
            <div className="flex gap-6 min-h-[500px]">
                {/* Left: Calendar Grid */}
                <div className="flex-1 min-w-0">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={prevMonth}
                            className="p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--text-secondary)] transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{monthLabel}</h3>
                            <button
                                onClick={goToday}
                                className="px-2 py-1 text-xs font-medium text-[var(--primary-600)] bg-[var(--primary-50)] rounded-md hover:bg-[var(--primary-100)] transition-colors"
                            >
                                Today
                            </button>
                        </div>
                        <button
                            onClick={nextMonth}
                            className="p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--text-secondary)] transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-[var(--text-muted)] py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((day, idx) => {
                            const key = dateKey(day.year, day.month, day.date)
                            const dayTickets = ticketsByDate[key] || []
                            const count = dayTickets.length
                            const isToday = key === todayKey
                            const isSelected = key === selectedDate
                            const uniqueFEs = [...new Set(dayTickets.map(t => t.assigned_user_id).filter(Boolean))] as string[]

                            return (
                                <button
                                    key={idx}
                                    onClick={() => day.isCurrentMonth && setSelectedDate(key)}
                                    className={`
                                        relative p-2 min-h-[72px] rounded-lg text-left transition-all
                                        ${day.isCurrentMonth
                                            ? 'hover:bg-[var(--gray-50)] cursor-pointer'
                                            : 'opacity-30 cursor-default'}
                                        ${isToday ? 'bg-[var(--primary-50)]' : ''}
                                        ${isSelected ? 'ring-2 ring-[var(--primary-500)] bg-[var(--primary-50)]' : ''}
                                    `}
                                    disabled={!day.isCurrentMonth}
                                >
                                    <span className={`
                                        text-sm font-medium
                                        ${isToday ? 'text-[var(--primary-700)] font-bold' : 'text-[var(--text-primary)]'}
                                    `}>
                                        {day.date}
                                    </span>

                                    {count > 0 && day.isCurrentMonth && (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--primary-100)] text-[var(--primary-700)]">
                                                {count}
                                            </span>
                                            {/* FE color dots */}
                                            {uniqueFEs.length > 0 && (
                                                <div className="flex gap-0.5 mt-1 flex-wrap">
                                                    {uniqueFEs.slice(0, 4).map(feId => (
                                                        <div
                                                            key={feId}
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: feColor(feId) }}
                                                        />
                                                    ))}
                                                    {uniqueFEs.length > 4 && (
                                                        <span className="text-[8px] text-[var(--text-muted)]">+{uniqueFEs.length - 4}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Day Detail Panel */}
                <div className="w-[380px] flex-shrink-0 border-l border-[var(--border-light)] pl-6 overflow-y-auto max-h-[600px]">
                    {!selectedDate ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-muted)]">
                            <CalendarIcon size={48} className="mb-3 opacity-30" />
                            <p className="text-sm">Click a day to view FE availability</p>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                                {selectedDateLabel}
                            </h3>

                            {/* Summary line */}
                            <p className="text-xs text-[var(--text-muted)] mb-4">
                                {feFilter
                                    ? `${scheduledGroups.reduce((sum, g) => sum + g.tickets.length, 0)} ticket${scheduledGroups.reduce((sum, g) => sum + g.tickets.length, 0) !== 1 ? 's' : ''} scheduled`
                                    : `${availableFEs.length} of ${feOptions.length} FEs available${scheduledGroups.length > 0 ? ` \u00b7 ${scheduledGroups.length} scheduled` : ''}`
                                }
                            </p>

                            {/* Tabs — hidden when filtered to specific FE */}
                            {!feFilter ? (
                                <div className="flex gap-1 mb-4 p-1 bg-[var(--gray-100)] rounded-lg">
                                    <button
                                        onClick={() => setDayTab('available')}
                                        className={`
                                            flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all
                                            ${dayTab === 'available'
                                                ? 'bg-white text-[var(--success-700)] shadow-sm'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
                                        `}
                                    >
                                        Available ({availableFEs.length})
                                    </button>
                                    <button
                                        onClick={() => setDayTab('scheduled')}
                                        className={`
                                            flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all
                                            ${dayTab === 'scheduled'
                                                ? 'bg-white text-[var(--primary-700)] shadow-sm'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
                                        `}
                                    >
                                        Scheduled ({scheduledGroups.length})
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                        Showing tickets for filtered FE
                                    </span>
                                </div>
                            )}

                            {/* Available Tab — only when no FE filter */}
                            {dayTab === 'available' && !feFilter && (
                                <div>
                                    {availableFEs.length === 0 ? (
                                        <div className="py-8 text-center text-[var(--text-muted)]">
                                            <p className="text-sm">All field executives have tickets on this day</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {availableFEs.map(fe => (
                                                <div
                                                    key={fe.value}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border-light)] bg-white hover:border-[var(--success-300)] transition-colors"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-[var(--success-500)] flex-shrink-0" />
                                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                                        {fe.label}
                                                    </span>
                                                    <span className="ml-auto text-[10px] font-medium text-[var(--success-600)] bg-[var(--success-50)] px-2 py-0.5 rounded-full">
                                                        Free
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Scheduled Tab — grouped by city */}
                            {(dayTab === 'scheduled' || feFilter) && (
                                <div>
                                    {scheduledByCity.length === 0 ? (
                                        <div className="py-8 text-center text-[var(--text-muted)]">
                                            <p className="text-sm">No scheduled tickets for this day</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {scheduledByCity.map(([city, feGroups]) => (
                                                <div key={city}>
                                                    {/* City Header */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MapPin size={14} className="text-[var(--text-muted)]" />
                                                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                                                            {city}
                                                        </span>
                                                        <div className="flex-1 border-t border-[var(--border-light)]" />
                                                    </div>

                                                    {/* FEs in this city */}
                                                    <div className="space-y-3 ml-1">
                                                        {feGroups.map(group => (
                                                            <div key={group.id}>
                                                                {/* FE Name + count */}
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div
                                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: group.id !== 'unassigned' ? feColor(group.id) : '#9ca3af' }}
                                                                    />
                                                                    <span className="text-sm font-bold text-[var(--text-primary)]">
                                                                        {group.name}
                                                                    </span>
                                                                    <span className="text-[10px] font-medium text-[var(--primary-600)] bg-[var(--primary-50)] px-1.5 py-0.5 rounded-full">
                                                                        {group.tickets.length} ticket{group.tickets.length !== 1 ? 's' : ''}
                                                                    </span>
                                                                </div>

                                                                {/* Ticket cards */}
                                                                <div className="space-y-2 ml-5">
                                                                    {group.tickets.map(ticket => (
                                                                        <div
                                                                            key={ticket.id}
                                                                            className="p-3 rounded-lg border border-[var(--border-light)] bg-white hover:border-[var(--primary-200)] transition-colors"
                                                                        >
                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                <span className="font-mono text-xs text-[var(--primary-600)] font-medium">
                                                                                    {ticket.uid}
                                                                                </span>
                                                                                {ticket.stage_name && (
                                                                                    <Badge color={ticket.stage_color || undefined} size="sm">
                                                                                        {ticket.stage_name}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>

                                                                            {ticket.scheduled_time && (
                                                                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
                                                                                    <Clock size={12} />
                                                                                    <span>{formatTime(ticket.scheduled_time)}</span>
                                                                                </div>
                                                                            )}

                                                                            {ticket.patient_name && (
                                                                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] mb-1">
                                                                                    <UserIcon size={12} className="text-[var(--text-muted)]" />
                                                                                    <span className="font-medium">{ticket.patient_name}</span>
                                                                                </div>
                                                                            )}

                                                                            {ticket.hospital_name && (
                                                                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
                                                                                    <Building2 size={12} />
                                                                                    <span>{ticket.hospital_name}</span>
                                                                                </div>
                                                                            )}

                                                                            {ticket.collection_location && (
                                                                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                                                                    <MapPin size={12} />
                                                                                    <span>
                                                                                        {ticket.collection_location === 'hospital' ? 'Hospital Pickup' : 'Home Pickup'}
                                                                                        {ticket.collection_location === 'home' && ticket.collection_address && (
                                                                                            <span className="ml-1">- {ticket.collection_address}</span>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {ticket.service_type_name && (
                                                                                <div className="mt-1.5 pt-1.5 border-t border-[var(--border-light)]">
                                                                                    <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
                                                                                        {ticket.service_type_name}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}

// Small calendar icon for the empty state
function CalendarIcon({ size, className }: { size: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}
