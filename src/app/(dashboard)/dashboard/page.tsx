'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Ticket, Clock, CheckCircle, RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { FECalendarModal } from '@/components/FECalendarModal'
import { createClient } from '@/lib/supabase'
import { AdminAnalytics } from '@/components/dashboard/AdminAnalytics'
import { CSAnalytics } from '@/components/dashboard/CSAnalytics'
import { DateFilter } from '@/components/dashboard/DateFilter'
import { TATDashboard } from '@/components/dashboard/TATDashboard'

interface Stats {
    total: number
    pending: number
    completed: number
    analytics?: any
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0 })
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState('')
    const [userRole, setUserRole] = useState('')

    const [calendarOpen, setCalendarOpen] = useState(false)

    // Filter State
    const [dateRange, setDateRange] = useState('7d')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const fetchStats = async (range: string = dateRange, start?: string, end?: string) => {
        try {
            let url = `/api/dashboard/stats?range=${range}`

            // Handle Custom Range params
            const s = start || customStart
            const e = end || customEnd

            if (range === 'custom' && s) {
                url += `&from=${s}`
                if (e) url += `&to=${e}`
            }

            const res = await fetch(url)
            const data = await res.json()
            if (data.success) {
                setStats(data.data)
            }

            // Get User Info if missing
            if (!userName || !userRole) {
                const meRes = await fetch('/api/auth/me')
                const meData = await meRes.json()
                if (meData.success) {
                    setUserName(meData.data.full_name)
                    setUserRole(meData.data.role)
                }
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        } finally {
            setLoading(false)
        }
    }

    // Effect: Fetch on Mount
    useEffect(() => {
        fetchStats()

        const supabase = createClient()
        const channel = supabase
            .channel('dashboard-stats')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                () => {
                    fetchStats()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Effect: Fetch on Filter Change (except custom, which waits for user?)
    // Actually, let's fetch immediately for standard ranges, but for custom maybe wait for valid dates?
    const handleRangeChange = (newRange: string) => {
        setDateRange(newRange)
        if (newRange !== 'custom') {
            setLoading(true)
            fetchStats(newRange)
        }
    }

    const handleCustomDateApply = () => {
        if (customStart) {
            setLoading(true)
            fetchStats('custom')
        }
    }

    const isAdminOrManager = userRole === 'admin' || userRole === 'manager'
    const isCustomerSuccess = userRole === 'customer_success'
    const showAdvancedDash = isAdminOrManager || isCustomerSuccess

    const statCards = [
        {
            label: 'Total Tickets',
            value: stats.total.toString(),
            icon: <Ticket size={24} />,
            color: 'var(--primary-500)',
            bgColor: 'var(--primary-50)',
        },
        {
            label: 'Pending',
            value: stats.pending.toString(),
            icon: <Clock size={24} />,
            color: 'var(--warning-500)',
            bgColor: 'var(--warning-50)',
        },
        {
            label: 'Completed',
            value: stats.completed.toString(),
            icon: <CheckCircle size={24} />,
            color: 'var(--success-500)',
            bgColor: 'var(--success-50)',
        },
    ]

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Welcome back, {userName || '...'}!
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Here&apos;s a real-time overview of your workflow system
                    </p>
                </div>

                {/* Filters */}
                {showAdvancedDash && (
                    <div className="flex flex-wrap items-center gap-2">
                        <DateFilter
                            currentRange={dateRange}
                            onRangeChange={handleRangeChange}
                            customStart={customStart}
                            setCustomStart={setCustomStart}
                            customEnd={customEnd}
                            setCustomEnd={setCustomEnd}
                            onApplyCustom={handleCustomDateApply}
                        />

                        <button
                            onClick={() => setCalendarOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-[var(--gray-50)] text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-colors shadow-sm text-sm font-medium"
                            title="FE Calendar"
                        >
                            <CalendarIcon size={16} />
                            <span className="hidden sm:inline">FE Calendar</span>
                        </button>

                        <button
                            onClick={() => {
                                setLoading(true)
                                fetchStats()
                            }}
                            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-[var(--gray-50)] text-[var(--text-muted)] transition-colors shadow-sm ml-2"
                            title="Refresh Stats"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                )}
            </div>

            {/* Dashboard Content */}
            {stats.analytics ? (
                <>
                    {/* Admin / Manager View */}
                    {isAdminOrManager && (
                        <>
                            <AdminAnalytics data={stats.analytics} />
                            <TATDashboard userRole={userRole} />
                        </>
                    )}

                    {/* Customer Success View */}
                    {isCustomerSuccess && <CSAnalytics data={stats.analytics} />}
                </>
            ) : (
                /* Standard Fallback View (Field Exec, etc) */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {statCards.map((stat, index) => (
                        <Card key={index} hover>
                            <CardContent className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: stat.bgColor, color: stat.color }}
                                >
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                                        {loading ? '...' : stat.value}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quick Navigation (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <a href="/tickets" className="group block p-6 rounded-2xl bg-white border border-[var(--border-light)] hover:border-[var(--primary-500)] hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Ticket size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">View All Tickets</h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Manage and track all ongoing diagnostic requests</p>
                </a>

                {/* Only show Create Ticket to relevant roles if needed, or everyone */}
                <a href="/tickets/new" className="group block p-6 rounded-2xl bg-white border border-[var(--border-light)] hover:border-[var(--success-500)] hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[var(--success-50)] text-[var(--success-600)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <RefreshCw size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">Create New Ticket</h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Convert a new WhatsApp message into a trackable ticket</p>
                </a>

                <a href="/tickets/closed" className="group block p-6 rounded-2xl bg-white border border-[var(--border-light)] hover:border-[var(--info-500)] hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[var(--info-50)] text-[var(--info-600)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <CheckCircle size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">Completed Tickets</h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Review history of all submitted and closed reports</p>
                </a>
            </div>

            <FECalendarModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
        </div>
    )
}
