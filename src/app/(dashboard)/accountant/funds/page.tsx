'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
    Wallet, 
    Receipt, 
    Boxes, 
    Plus, 
    Search, 
    Download, 
    Users, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownLeft, 
    AlertCircle, 
    Calendar,
    RefreshCw,
    X,
    Coins
} from 'lucide-react'
import { Card, CardContent, Modal, ModalFooter, Button, Input, Select, Textarea, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

interface FundStats {
    total_fund: number
    funds_used: number
    available_seragen_account_balance: number
    last_entry_date?: string | null
}

interface UserBalance {
    user_id: string
    full_name: string
    role: 'manager' | 'field_executive'
    total_received: number
    total_expenses: number
    current_balance: number
}

interface ActivityLogRow {
    id: string
    type: 'allocation' | 'expense'
    date: string
    user_id: string
    user_name: string
    user_role: string
    amount: number
    balance_at_moment: number | null
    total_expenses_at_moment: number | null
    reference: string | null
    performed_by_name: string
}

interface FundEntry {
    id: string
    amount: number
    entry_date: string
    remarks: string | null
    entered_by_name: string
    created_at: string
}

interface AllocationRow {
    id: string
    user_id: string
    recipient_name: string
    recipient_role: string
    amount: number
    entry_date: string
    remarks: string | null
    allocator_name: string
    recipient_balance_after_alloc: number
    recipient_total_expenses_at_alloc: number
}

interface StaffMember {
    id: string
    full_name: string
    role: string
    is_active: boolean
}

interface AllocationEntryInput {
    user_id: string
    amount: string
    remarks: string
}

export default function FundManagementPage() {
    // Basic States
    const [stats, setStats] = useState<FundStats>({ total_fund: 0, funds_used: 0, available_seragen_account_balance: 0 })
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loadingStats, setLoadingStats] = useState(true)
    const [activeTab, setActiveTab] = useState<'activity' | 'balances' | 'entries' | 'allocations'>('activity')

    // Modals
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false)

    // Receive Funds Form
    const [receiveAmount, setReceiveAmount] = useState('')
    const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0])
    const [receiveRemarks, setReceiveRemarks] = useState('')
    const [receiveError, setReceiveError] = useState('')
    const [submittingReceive, setSubmittingReceive] = useState(false)

    // Allocate Funds Form
    const [allocationEntries, setAllocationEntries] = useState<AllocationEntryInput[]>([
        { user_id: '', amount: '', remarks: '' }
    ])
    const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split('T')[0])
    const [allocateError, setAllocateError] = useState('')
    const [submittingAllocate, setSubmittingAllocate] = useState(false)

    // Activity Log State
    const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([])
    const [activityType, setActivityType] = useState<string>('all')
    const [activityFrom, setActivityFrom] = useState<string>('')
    const [activityTo, setActivityTo] = useState<string>('')
    const [activitySearch, setActivitySearch] = useState<string>('')
    const [activityPage, setActivityPage] = useState(1)
    const [activityTotalPages, setActivityTotalPages] = useState(1)
    const [activityLoading, setActivityLoading] = useState(false)

    // User Balances State
    const [balances, setBalances] = useState<UserBalance[]>([])
    const [balancesSearch, setBalancesSearch] = useState('')
    const [balancesLoading, setBalancesLoading] = useState(false)

    // Fund Entries State
    const [entries, setEntries] = useState<FundEntry[]>([])
    const [entriesFrom, setEntriesFrom] = useState('')
    const [entriesTo, setEntriesTo] = useState('')
    const [entriesPage, setEntriesPage] = useState(1)
    const [entriesTotalPages, setEntriesTotalPages] = useState(1)
    const [entriesLoading, setEntriesLoading] = useState(false)

    // Allocations Log State
    const [allocations, setAllocations] = useState<AllocationRow[]>([])
    const [allocationsFrom, setAllocationsFrom] = useState('')
    const [allocationsTo, setAllocationsTo] = useState('')
    const [allocationsUserFilter, setAllocationsUserFilter] = useState('')
    const [allocationsPage, setAllocationsPage] = useState(1)
    const [allocationsTotalPages, setAllocationsTotalPages] = useState(1)
    const [allocationsLoading, setAllocationsLoading] = useState(false)

    // ─────────────────────────────────────────────────────────────
    // API FETCHER HELPERS
    // ─────────────────────────────────────────────────────────────

    const fetchStats = async () => {
        setLoadingStats(true)
        try {
            const res = await fetch('/api/funds/stats')
            const result = await res.json()
            if (result.success) {
                setStats(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        } finally {
            setLoadingStats(false)
        }
    }

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/assignable-users')
            const result = await res.json()
            if (result.success) {
                // Filter staff members to keep managers and field executives
                const filtered = result.data.filter((u: StaffMember) => 
                    u.role === 'manager' || u.role === 'field_executive'
                )
                setStaff(filtered)
            }
        } catch (err) {
            console.error('Failed to fetch staff:', err)
        }
    }

    const fetchActivityLogs = useCallback(async () => {
        setActivityLoading(true)
        try {
            let url = `/api/funds/activity-log?page=${activityPage}&pageSize=10&type=${activityType}`
            if (activityFrom) url += `&from=${activityFrom}`
            if (activityTo) url += `&to=${activityTo}`
            if (activitySearch) {
                // Find matching user ID
                const matchedUser = staff.find(s => 
                    s.full_name.toLowerCase().includes(activitySearch.toLowerCase())
                )
                if (matchedUser) {
                    url += `&user_id=${matchedUser.id}`
                } else if (activitySearch.trim() !== '') {
                    // Send dummy UUID if search entered but nothing matched
                    url += `&user_id=00000000-0000-0000-0000-000000000000`
                }
            }
            const res = await fetch(url)
            const result = await res.json()
            if (result.success && result.data) {
                setActivityLogs(result.data.data)
                setActivityTotalPages(result.data.totalPages || 1)
            }
        } catch (err) {
            console.error('Failed to fetch activity logs:', err)
        } finally {
            setActivityLoading(false)
        }
    }, [activityPage, activityType, activityFrom, activityTo, activitySearch, staff])

    const fetchBalances = async () => {
        setBalancesLoading(true)
        try {
            const res = await fetch('/api/fund-allocations/user-balances')
            const result = await res.json()
            if (result.success) {
                setBalances(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch user balances:', err)
        } finally {
            setBalancesLoading(false)
        }
    }

    const fetchFundEntries = useCallback(async () => {
        setEntriesLoading(true)
        try {
            let url = `/api/funds/entries?page=${entriesPage}&pageSize=10`
            if (entriesFrom) url += `&from=${entriesFrom}`
            if (entriesTo) url += `&to=${entriesTo}`
            const res = await fetch(url)
            const result = await res.json()
            if (result.success && result.data) {
                setEntries(result.data.data)
                setEntriesTotalPages(result.data.totalPages || 1)
            }
        } catch (err) {
            console.error('Failed to fetch fund entries:', err)
        } finally {
            setEntriesLoading(false)
        }
    }, [entriesPage, entriesFrom, entriesTo])

    const fetchAllocations = useCallback(async () => {
        setAllocationsLoading(true)
        try {
            let url = `/api/fund-allocations?page=${allocationsPage}&pageSize=10`
            if (allocationsFrom) url += `&from=${allocationsFrom}`
            if (allocationsTo) url += `&to=${allocationsTo}`
            if (allocationsUserFilter) url += `&user_id=${allocationsUserFilter}`
            const res = await fetch(url)
            const result = await res.json()
            if (result.success && result.data) {
                setAllocations(result.data.data)
                setAllocationsTotalPages(result.data.totalPages || 1)
            }
        } catch (err) {
            console.error('Failed to fetch allocations:', err)
        } finally {
            setAllocationsLoading(false)
        }
    }, [allocationsPage, allocationsFrom, allocationsTo, allocationsUserFilter])

    // Fetch on Mount & Tab change
    useEffect(() => {
        fetchStats()
        fetchStaff()
    }, [])

    useEffect(() => {
        if (activeTab === 'activity') {
            fetchActivityLogs()
        } else if (activeTab === 'balances') {
            fetchBalances()
        } else if (activeTab === 'entries') {
            fetchFundEntries()
        } else if (activeTab === 'allocations') {
            fetchAllocations()
        }
    }, [activeTab, fetchActivityLogs, fetchFundEntries, fetchAllocations])

    // Trigger searches
    useEffect(() => {
        if (activeTab === 'activity') {
            setActivityPage(1)
            fetchActivityLogs()
        }
    }, [activityType, activityFrom, activityTo, activitySearch])

    useEffect(() => {
        if (activeTab === 'entries') {
            setEntriesPage(1)
            fetchFundEntries()
        }
    }, [entriesFrom, entriesTo])

    useEffect(() => {
        if (activeTab === 'allocations') {
            setAllocationsPage(1)
            fetchAllocations()
        }
    }, [allocationsFrom, allocationsTo, allocationsUserFilter])

    // ─────────────────────────────────────────────────────────────
    // TRANSACTION HANDLERS
    // ─────────────────────────────────────────────────────────────

    // Receive Funds Action
    const handleReceiveFunds = async (e: React.FormEvent) => {
        e.preventDefault()
        setReceiveError('')

        const parsedAmount = parseFloat(receiveAmount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setReceiveError('Please enter a valid positive amount.')
            return
        }

        // Validate date isn't > 30 days in the future
        const entryDate = new Date(receiveDate)
        const maxFuture = new Date()
        maxFuture.setDate(maxFuture.getDate() + 30)
        if (entryDate > maxFuture) {
            setReceiveError('Entry date cannot be more than 30 days in the future.')
            return
        }

        setSubmittingReceive(true)
        try {
            const res = await fetch('/api/funds/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parsedAmount,
                    entry_date: receiveDate,
                    remarks: receiveRemarks || null
                })
            })
            const result = await res.json()
            if (result.success) {
                setIsReceiveModalOpen(false)
                setReceiveAmount('')
                setReceiveRemarks('')
                setReceiveDate(new Date().toISOString().split('T')[0])
                fetchStats()
                if (activeTab === 'entries') fetchFundEntries()
                else if (activeTab === 'activity') fetchActivityLogs()
            } else {
                setReceiveError(result.error || 'Failed to record entry.')
            }
        } catch (err) {
            setReceiveError('Network error. Failed to save.')
        } finally {
            setSubmittingReceive(false)
        }
    }

    // Allocate Funds Multiple Rows Handler
    const addAllocationRow = () => {
        setAllocationEntries([...allocationEntries, { user_id: '', amount: '', remarks: '' }])
    }

    const removeAllocationRow = (index: number) => {
        if (allocationEntries.length <= 1) return
        const updated = [...allocationEntries]
        updated.splice(index, 1)
        setAllocationEntries(updated)
    }

    const updateAllocationRow = (index: number, field: keyof AllocationEntryInput, value: string) => {
        const updated = [...allocationEntries]
        updated[index][field] = value
        setAllocationEntries(updated)
    }

    const totalAllocationToDistribute = allocationEntries.reduce((sum, item) => {
        const amt = parseFloat(item.amount)
        return sum + (isNaN(amt) ? 0 : amt)
    }, 0)

    const handleAllocateFunds = async (e: React.FormEvent) => {
        e.preventDefault()
        setAllocateError('')

        // Validations
        if (allocationEntries.some(item => !item.user_id)) {
            setAllocateError('Please select a recipient for all rows.')
            return
        }

        if (allocationEntries.some(item => isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0)) {
            setAllocateError('Please enter positive amounts.')
            return
        }

        if (totalAllocationToDistribute > stats.available_seragen_account_balance) {
            setAllocateError('Insufficient Seragen account balance to distribute this total amount.')
            return
        }

        const entryDate = new Date(allocationDate)
        const maxFuture = new Date()
        maxFuture.setDate(maxFuture.getDate() + 30)
        if (entryDate > maxFuture) {
            setAllocateError('Allocation date cannot be more than 30 days in the future.')
            return
        }

        setSubmittingAllocate(true)
        try {
            const formattedEntries = allocationEntries.map(item => ({
                user_id: item.user_id,
                amount: parseFloat(item.amount),
                entry_date: allocationDate,
                remarks: item.remarks || null
            }))

            const res = await fetch('/api/fund-allocations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: formattedEntries })
            })
            const result = await res.json()
            if (result.success) {
                setIsAllocateModalOpen(false)
                setAllocationEntries([{ user_id: '', amount: '', remarks: '' }])
                setAllocationDate(new Date().toISOString().split('T')[0])
                fetchStats()
                if (activeTab === 'balances') fetchBalances()
                else if (activeTab === 'allocations') fetchAllocations()
                else if (activeTab === 'activity') fetchActivityLogs()
            } else {
                setAllocateError(result.error || 'Failed to allocate funds.')
            }
        } catch (err) {
            setAllocateError('Network error. Failed to save.')
        } finally {
            setSubmittingAllocate(false)
        }
    }

    // Quick allocation from Balances tab
    const handleQuickAllocate = (userId: string) => {
        setAllocationEntries([{ user_id: userId, amount: '', remarks: '' }])
        setAllocationDate(new Date().toISOString().split('T')[0])
        setAllocateError('')
        setIsAllocateModalOpen(true)
    }

    // Excel Export Trigger
    const handleExcelExport = () => {
        let exportUrl = `/api/funds/export?type=${activityType}`
        if (activityFrom) exportUrl += `&from=${activityFrom}`
        if (activityTo) exportUrl += `&to=${activityTo}`
        
        if (activitySearch) {
            const matchedUser = staff.find(s => 
                s.full_name.toLowerCase().includes(activitySearch.toLowerCase())
            )
            if (matchedUser) {
                exportUrl += `&user_id=${matchedUser.id}`
            } else {
                exportUrl += `&user_id=00000000-0000-0000-0000-000000000000`
            }
        }
        
        window.open(exportUrl, '_blank')
    }

    // Filter staff list based on balances tab search
    const filteredBalances = balances.filter(b => 
        b.full_name.toLowerCase().includes(balancesSearch.toLowerCase()) ||
        b.role.replace('_', ' ').toLowerCase().includes(balancesSearch.toLowerCase())
    )

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header section - Perfectly aligned with HTML mockup */}
            <div className="page-hdr flex items-start justify-between pb-5 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fund Management</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Track Seragen account funds, allocations and expense activity
                    </p>
                </div>

                <div className="hdr-actions flex gap-2.5 items-center shrink-0">
                    <button 
                        onClick={() => {
                            setReceiveError('')
                            setIsReceiveModalOpen(true)
                        }}
                        className="btn btn-outline border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
                    >
                        Receive Funds
                    </button>
                    <button 
                        onClick={() => {
                            setAllocationEntries([{ user_id: '', amount: '', remarks: '' }])
                            setAllocateError('')
                            setIsAllocateModalOpen(true)
                        }}
                        className="btn btn-primary bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 shadow-sm cursor-pointer"
                    >
                        Allocate Funds
                    </button>
                </div>
            </div>

            {/* Stats Grid - Aligned with Left Icon & Right Text Layout */}
            <div className="stats-grid-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="stat-card bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                    <div className="stat-icon w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-xl">
                        <Wallet size={20} />
                    </div>
                    <div className="stat-body">
                        <div className="stat-label text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Fund Received</div>
                        <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                            {loadingStats ? '...' : formatCurrency(stats.total_fund)}
                        </div>
                        <div className="stat-sub text-[11.5px] text-gray-400 mt-0.5">
                            {stats.last_entry_date ? `Last entry: ${formatDate(stats.last_entry_date)}` : 'No entries'}
                        </div>
                    </div>
                </div>

                <div className="stat-card bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                    <div className="stat-icon w-11 h-11 rounded-full bg-[var(--primary-50)] text-[var(--primary-500)] flex items-center justify-center shrink-0 text-xl">
                        <TrendingUp size={20} />
                    </div>
                    <div className="stat-body">
                        <div className="stat-label text-xs font-semibold text-gray-400 uppercase tracking-wider">Funds Allocated</div>
                        <div className="stat-value text-2xl font-bold text-gray-900 mt-1">
                            {loadingStats ? '...' : formatCurrency(stats.funds_used)}
                        </div>
                        <div className="stat-sub text-[11.5px] text-gray-400 mt-0.5">
                            Across {staff.length} team members
                        </div>
                    </div>
                </div>

                <div className="stat-card bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-3.5">
                    <div className="stat-icon w-11 h-11 rounded-full bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center shrink-0 text-xl">
                        <Boxes size={20} />
                    </div>
                    <div className="stat-body">
                        <div className="stat-label text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Seragen Account Balance</div>
                        <div className="stat-body-value text-2xl font-bold text-[var(--primary-600)] mt-1">
                            {loadingStats ? '...' : formatCurrency(stats.available_seragen_account_balance)}
                        </div>
                        <div className="stat-sub text-[11.5px] text-gray-400 mt-0.5">
                            Free to allocate
                        </div>
                    </div>
                </div>
            </div>

            {/* Pill Tabs - Aligned with Mockup */}
            <div className="tabs-pill bg-gray-100 p-1 rounded-lg flex gap-1 w-fit mb-5">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`tab-pill px-4.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                        activeTab === 'activity'
                            ? 'bg-white text-gray-900 shadow-sm font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Activity Log
                </button>
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`tab-pill px-4.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                        activeTab === 'balances'
                            ? 'bg-white text-gray-900 shadow-sm font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    User Balances
                </button>
                <button
                    onClick={() => setActiveTab('entries')}
                    className={`tab-pill px-4.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                        activeTab === 'entries'
                            ? 'bg-white text-gray-900 shadow-sm font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Fund Entries
                </button>
                <button
                    onClick={() => setActiveTab('allocations')}
                    className={`tab-pill px-4.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                        activeTab === 'allocations'
                            ? 'bg-white text-gray-900 shadow-sm font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Allocations
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[400px]">
                
                {/* 1. ACTIVITY LOG TAB */}
                {activeTab === 'activity' && (
                    <div className="space-y-6">
                        <div className="table-toolbar flex items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="toolbar-left flex items-center gap-2.5 flex-wrap flex-1">
                                <div style={{ display: 'flex', gap: '6px', background: 'var(--gray-100)', borderRadius: '8px', padding: '3px' }}>
                                    <button 
                                        onClick={() => setActivityType('all')} 
                                        className={`tab-pill px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                            activityType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                        }`}
                                    >
                                        All
                                    </button>
                                    <button 
                                        onClick={() => setActivityType('allocation')} 
                                        className={`tab-pill px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                            activityType === 'allocation' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                        }`}
                                    >
                                        Allocations
                                    </button>
                                    <button 
                                        onClick={() => setActivityType('expense')} 
                                        className={`tab-pill px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                            activityType === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                        }`}
                                    >
                                        Expenses
                                    </button>
                                </div>

                                <div className="date-pair flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--primary-400)]" 
                                        value={activityFrom}
                                        onChange={(e) => setActivityFrom(e.target.value)}
                                        style={{ width: '130px' }}
                                    />
                                    <span className="text-gray-400 text-xs">to</span>
                                    <input 
                                        type="date" 
                                        className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--primary-400)]" 
                                        value={activityTo}
                                        onChange={(e) => setActivityTo(e.target.value)}
                                        style={{ width: '130px' }}
                                    />
                                </div>

                                <Select 
                                    value={activitySearch}
                                    onChange={(e) => setActivitySearch(e.target.value)}
                                    className="h-9 text-xs border-gray-300 rounded-lg max-w-[180px]"
                                    placeholder="All Users"
                                >
                                    <option value="">All Users</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.full_name}>{s.full_name} ({s.role.replace('_', ' ')})</option>
                                    ))}
                                </Select>
                            </div>

                            <button
                                onClick={handleExcelExport}
                                className="btn btn-outline border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm h-9 px-4 py-2 rounded-lg font-medium shadow-sm shrink-0 duration-150 transition-colors flex items-center gap-1.5"
                            >
                                <Download size={14} />
                                Export
                            </button>
                        </div>

                        {/* List/Table */}
                        <div className="overflow-x-auto border border-gray-150 rounded-xl shadow-sm">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-right">Balance at Moment</th>
                                        <th className="px-6 py-4 text-right">Total Exp. Then</th>
                                        <th className="px-6 py-4">Reference / Remarks</th>
                                        <th className="px-6 py-4">Performed By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 bg-white">
                                    {activityLoading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading financial activity...</p>
                                            </td>
                                        </tr>
                                    ) : activityLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-gray-400 text-xs">
                                                No activity records found matching filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        activityLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900">{formatDate(log.date)}</div>
                                                    <div className="td-sm text-[11px] text-gray-400 mt-0.5">
                                                        {new Date(log.date + 'T' + (log.type === 'allocation' ? '12:00:00' : '12:00:00')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {log.type === 'allocation' ? (
                                                        <span className="badge badge-primary bg-[var(--primary-50)] border border-[var(--primary-200)] text-[var(--primary-600)] flex items-center gap-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                                            Allocation
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-red bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                                            Expense
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{log.user_name}</div>
                                                        <div className="td-sm text-[11px] text-gray-400 capitalize mt-0.5">
                                                            {log.user_role.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold whitespace-nowrap">
                                                    {log.type === 'allocation' ? (
                                                        <span className="amt-green text-emerald-600">+ {formatCurrency(log.amount)}</span>
                                                    ) : (
                                                        <span className="amt-red text-red-600">− {formatCurrency(log.amount)}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-700 whitespace-nowrap">
                                                    {log.balance_at_moment !== null && log.balance_at_moment !== undefined ? formatCurrency(log.balance_at_moment) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-700 whitespace-nowrap">
                                                    {log.total_expenses_at_moment !== null && log.total_expenses_at_moment !== undefined ? formatCurrency(log.total_expenses_at_moment) : '—'}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={log.reference || ''}>
                                                    {log.reference || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500">
                                                    {log.performed_by_name}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {activityTotalPages > 1 && (
                            <div className="flex justify-end gap-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={activityPage <= 1}
                                    onClick={() => setActivityPage(activityPage - 1)}
                                >
                                    ‹
                                </Button>
                                <div className="text-sm text-gray-500 flex items-center px-2">
                                    Page {activityPage} of {activityTotalPages}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={activityPage >= activityTotalPages}
                                    onClick={() => setActivityPage(activityPage + 1)}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. USER BALANCES TAB */}
                {activeTab === 'balances' && (
                    <div className="space-y-6">
                        <div className="table-toolbar flex items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="toolbar-left flex items-center gap-3">
                                <div className="search-box flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg w-[220px]">
                                    <Search size={14} className="text-gray-400 shrink-0" />
                                    <input 
                                        placeholder="Search by name..." 
                                        className="text-sm focus:outline-none w-full bg-transparent text-gray-700"
                                        value={balancesSearch}
                                        onChange={(e) => setBalancesSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Balances table */}
                        <div className="overflow-x-auto border border-gray-150 rounded-xl shadow-sm">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Name / Role</th>
                                        <th className="px-6 py-4 text-right">Total Funds Received</th>
                                        <th className="px-6 py-4 text-right">Total Expenses</th>
                                        <th className="px-6 py-4 text-right">Current Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 bg-white">
                                    {balancesLoading ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Computing team balances...</p>
                                            </td>
                                        </tr>
                                    ) : filteredBalances.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-12 text-gray-400 text-xs">
                                                No staff members found matching search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBalances.map((b) => {
                                            const isNegative = b.current_balance < 0;
                                            return (
                                                <tr 
                                                    key={b.user_id} 
                                                    className={`hover:bg-gray-50/50 ${isNegative ? 'border-l-[3px] border-red-500 bg-red-50/5' : ''}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>{b.full_name}</div>
                                                        <div className="td-sm text-[11px] text-gray-400 capitalize mt-1">
                                                            {b.role.replace('_', ' ')}
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-semibold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {formatCurrency(b.total_received)}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right ${isNegative ? 'text-red-600' : 'text-red-600 font-semibold'}`}>
                                                        {formatCurrency(b.total_expenses)}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-extrabold ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                                                        {isNegative ? '−' : ''}{formatCurrency(Math.abs(b.current_balance))}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. DIRECT FUND ENTRIES TAB */}
                {activeTab === 'entries' && (
                    <div className="space-y-6">
                        <div className="table-toolbar flex items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 max-w-lg">
                            <div className="toolbar-left date-pair flex items-center gap-2">
                                <input 
                                    type="date" 
                                    className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none" 
                                    value={entriesFrom}
                                    onChange={(e) => setEntriesFrom(e.target.value)}
                                    style={{ width: '130px' }}
                                />
                                <span className="text-gray-400 text-xs">to</span>
                                <input 
                                    type="date" 
                                    className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none" 
                                    value={entriesTo}
                                    onChange={(e) => setEntriesTo(e.target.value)}
                                    style={{ width: '130px' }}
                                />
                            </div>
                        </div>

                        {/* Direct pool entries table */}
                        <div className="overflow-x-auto border border-gray-150 rounded-xl shadow-sm">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Entry Date</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4">Remarks</th>
                                        <th className="px-6 py-4">Entered By</th>
                                        <th className="px-6 py-4">Created At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 bg-white">
                                    {entriesLoading ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading capital logs...</p>
                                            </td>
                                        </tr>
                                    ) : entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                                                No direct vault deposits recorded.
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    {formatDate(entry.entry_date)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                                                    {formatCurrency(entry.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 max-w-sm truncate" title={entry.remarks || ''}>
                                                    {entry.remarks || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    {entry.entered_by_name}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                                                    {formatDate(entry.created_at)}, {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {entriesTotalPages > 1 && (
                            <div className="flex justify-end gap-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={entriesPage <= 1}
                                    onClick={() => setEntriesPage(entriesPage - 1)}
                                >
                                    ‹
                                </Button>
                                <div className="text-sm text-gray-500 flex items-center px-2">
                                    Page {entriesPage} of {entriesTotalPages}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={entriesPage >= entriesTotalPages}
                                    onClick={() => setEntriesPage(entriesPage + 1)}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. ALLOCATIONS LOG TAB */}
                {activeTab === 'allocations' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="table-toolbar flex items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="toolbar-left flex items-center gap-3 flex-wrap">
                                <Select
                                    value={allocationsUserFilter}
                                    onChange={(e) => setAllocationsUserFilter(e.target.value)}
                                    className="h-9 border-gray-300 text-xs max-w-xs"
                                    placeholder="All Users"
                                >
                                    <option value="">All Users</option>
                                    {staff.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.role.replace('_', ' ')})
                                        </option>
                                    ))}
                                </Select>

                                <div className="date-pair flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white" 
                                        value={allocationsFrom}
                                        onChange={(e) => setAllocationsFrom(e.target.value)}
                                        style={{ width: '130px' }}
                                    />
                                    <span className="text-gray-400 text-xs">to</span>
                                    <input 
                                        type="date" 
                                        className="h-9 px-3 border border-gray-300 rounded-lg text-xs bg-white" 
                                        value={allocationsTo}
                                        onChange={(e) => setAllocationsTo(e.target.value)}
                                        style={{ width: '130px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Allocations Table */}
                        <div className="overflow-x-auto border border-gray-150 rounded-xl shadow-sm">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Entry Date</th>
                                        <th className="px-6 py-4">Recipient</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-right">Balance After</th>
                                        <th className="px-6 py-4 text-right">Expenses at Time</th>
                                        <th className="px-6 py-4">Remarks</th>
                                        <th className="px-6 py-4">Allocated By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 bg-white">
                                    {allocationsLoading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading allocations archive...</p>
                                            </td>
                                        </tr>
                                    ) : allocations.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-gray-400 text-xs">
                                                No dynamic allocations recorded matching criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        allocations.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    {formatDate(row.entry_date)}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-900">
                                                    {row.recipient_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {row.recipient_role === 'manager' ? (
                                                        <span className="badge badge-blue bg-blue-50 border border-blue-200 text-blue-600 rounded-full px-2 py-0.5 text-xs font-semibold">Manager</span>
                                                    ) : (
                                                        <span className="badge badge-gray bg-gray-100 border border-gray-200 text-gray-600 rounded-full px-2 py-0.5 text-xs font-semibold">Field Exec</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                                                    {formatCurrency(row.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                                                    {formatCurrency(row.recipient_balance_after_alloc)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600 whitespace-nowrap">
                                                    {formatCurrency(row.recipient_total_expenses_at_alloc)}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-gray-500" title={row.remarks || ''}>
                                                    {row.remarks || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    {row.allocator_name}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {allocationsTotalPages > 1 && (
                            <div className="flex justify-end gap-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={allocationsPage <= 1}
                                    onClick={() => setAllocationsPage(allocationsPage - 1)}
                                >
                                    ‹
                                </Button>
                                <div className="text-sm text-gray-500 flex items-center px-2">
                                    Page {allocationsPage} of {allocationsTotalPages}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={allocationsPage >= allocationsTotalPages}
                                    onClick={() => setAllocationsPage(allocationsPage + 1)}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RECEIVE VAULT FUNDS MODAL */}
            <Modal
                isOpen={isReceiveModalOpen}
                onClose={() => setIsReceiveModalOpen(false)}
                title="Receive Funds"
                size="md"
            >
                <form onSubmit={handleReceiveFunds} className="space-y-4">
                    <div>
                        <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                        <Input 
                            type="number" 
                            placeholder="e.g. 50000" 
                            required
                            step="0.01"
                            min="0.01"
                            value={receiveAmount}
                            onChange={(e) => setReceiveAmount(e.target.value)}
                            className="form-input border-gray-300 h-10"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Entry Date *</label>
                            <Input 
                                type="date" 
                                required
                                value={receiveDate}
                                onChange={(e) => setReceiveDate(e.target.value)}
                                className="form-input border-gray-300 h-10"
                            />
                            <div className="form-hint text-[11px] text-gray-400 mt-1">Max 30 days in future</div>
                        </div>

                        <div>
                            <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Remarks (optional)</label>
                            <Input 
                                placeholder="e.g. June operations fund" 
                                value={receiveRemarks}
                                onChange={(e) => setReceiveRemarks(e.target.value)}
                                className="form-input border-gray-300 h-10"
                            />
                        </div>
                    </div>

                    {receiveError && (
                        <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{receiveError}</span>
                        </div>
                    )}

                    <ModalFooter>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsReceiveModalOpen(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="btn btn-primary bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-medium"
                            isLoading={submittingReceive}
                        >
                            Record Entry
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* BATCH ALLOCATE FUNDS MODAL */}
            <Modal
                isOpen={isAllocateModalOpen}
                onClose={() => setIsAllocateModalOpen(false)}
                title="Allocate Funds"
                size="xl"
            >
                <form onSubmit={handleAllocateFunds} className="space-y-4">
                    {/* Display Point-In-Time available Seragen balance */}
                    <div className="balance-chip flex items-center justify-between p-3.5 rounded-xl bg-[var(--primary-50)] border border-[var(--primary-200)] text-[var(--primary-900)] text-sm mb-4">
                        <div className="flex items-center gap-2">
                            <Boxes size={18} className="text-[var(--primary-600)] shrink-0" />
                            <span className="font-semibold text-[var(--primary-800)]">Available Seragen Account Balance:</span>
                        </div>
                        <span className="font-extrabold text-[var(--primary-700)] text-lg">
                            {formatCurrency(stats.available_seragen_account_balance)}
                        </span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                        {allocationEntries.map((entry, index) => (
                            <div key={index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 relative space-y-3">
                                
                                {allocationEntries.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeAllocationRow(index)}
                                        className="absolute top-2 right-2 p-1 rounded-lg text-gray-400 hover:bg-gray-250 hover:text-rose-600 transition-colors"
                                        title="Remove Recipient"
                                    >
                                        <X size={16} />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient *</label>
                                        <Select
                                            value={entry.user_id}
                                            onChange={(e) => updateAllocationRow(index, 'user_id', e.target.value)}
                                            className="form-input h-9 text-xs border-gray-300 bg-white"
                                            required
                                            placeholder="- Select manager or field executive -"
                                        >
                                            <option value="">- Select manager or field executive -</option>
                                            {staff.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.full_name} ({u.role.replace('_', ' ')})
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount (₹) *</label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 20000"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={entry.amount}
                                            onChange={(e) => updateAllocationRow(index, 'amount', e.target.value)}
                                            className="form-input h-9 text-xs border-gray-300 bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Remarks (optional)</label>
                                    <Input
                                        placeholder="e.g. June field operations"
                                        value={entry.remarks}
                                        onChange={(e) => updateAllocationRow(index, 'remarks', e.target.value)}
                                        className="form-input h-9 text-xs border-gray-300 bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <button
                            type="button"
                            onClick={addAllocationRow}
                            className="text-xs font-semibold text-[var(--primary-600)] hover:text-[var(--primary-700)] flex items-center gap-1 p-1 hover:bg-[var(--primary-50)] rounded-lg transition-colors"
                        >
                            <Plus size={14} />
                            Add Another Recipient
                        </button>

                        <div className="text-right">
                            <span className="text-xs text-gray-500 font-semibold">Total Disbursements:</span>
                            <span className={`text-base font-extrabold ml-1.5 ${
                                totalAllocationToDistribute > stats.available_seragen_account_balance ? 'text-rose-600 animate-pulse' : 'text-[var(--primary-600)]'
                            }`}>
                                {formatCurrency(totalAllocationToDistribute)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-3">
                        <div>
                            <label className="form-label block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Entry Date *</label>
                            <Input 
                                type="date" 
                                required
                                value={allocationDate}
                                onChange={(e) => setAllocationDate(e.target.value)}
                                className="form-input border-gray-300 h-9"
                            />
                        </div>
                    </div>

                    {allocateError && (
                        <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{allocateError}</span>
                        </div>
                    )}

                    <ModalFooter>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsAllocateModalOpen(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="btn btn-primary bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-medium"
                            disabled={totalAllocationToDistribute > stats.available_seragen_account_balance}
                            isLoading={submittingAllocate}
                        >
                            Allocate Funds
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
