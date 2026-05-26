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
            {/* Header section with Premium rose accents */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
                            <Coins size={20} />
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900">Fund Management</h1>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        Track central liquidity pools, disburse advance balances, and monitor approved expense timelines.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        onClick={() => {
                            setReceiveError('')
                            setIsReceiveModalOpen(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors duration-200"
                        leftIcon={<Plus size={16} />}
                    >
                        Receive Funds
                    </Button>
                    <Button 
                        onClick={() => {
                            setAllocationEntries([{ user_id: '', amount: '', remarks: '' }])
                            setAllocateError('')
                            setIsAllocateModalOpen(true)
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-colors duration-200"
                        leftIcon={<Plus size={16} />}
                    >
                        Allocate Funds
                    </Button>
                </div>
            </div>

            {/* Stats Cards Section - Rose Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border border-rose-50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-pink-500" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Seragen Funds Pool</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                    {loadingStats ? '...' : formatCurrency(stats.total_fund)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-rose-50 text-pink-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                <Wallet size={20} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4 text-xs text-gray-500">
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <TrendingUp size={12} />
                                Direct pool
                            </span>
                            <span>capital deposits</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-rose-50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Allocated Capital</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                    {loadingStats ? '...' : formatCurrency(stats.funds_used)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                <Receipt size={20} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4 text-xs text-gray-500">
                            <span className="text-pink-600 font-semibold">{staff.length} Active</span>
                            <span>staff member advances</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Available Balance: ROSE-PINK highlighted for key focus */}
                <Card className="border-2 border-pink-100 bg-pink-50/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[4px] bg-pink-600" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-pink-800 text-xs font-bold uppercase tracking-wider">Available Seragen Account Balance</p>
                                <h3 className="text-3xl font-extrabold text-pink-700 mt-2">
                                    {loadingStats ? '...' : formatCurrency(stats.available_seragen_account_balance)}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                <Boxes size={22} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-3 text-xs text-pink-900/70">
                            <span className="font-semibold text-pink-600">Immediate liquid capacity</span>
                            <span>for future dispersals</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Custom Tab Navigation with rose-pink active highlights */}
            <div className="bg-white border border-rose-100/60 rounded-xl p-1 shadow-sm flex flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'activity'
                            ? 'bg-pink-600 text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                >
                    <Receipt size={16} />
                    Activity Log
                </button>
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'balances'
                            ? 'bg-pink-600 text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                >
                    <Users size={16} />
                    User Balances
                </button>
                <button
                    onClick={() => setActiveTab('entries')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'entries'
                            ? 'bg-pink-600 text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                >
                    <Wallet size={16} />
                    Fund Entries
                </button>
                <button
                    onClick={() => setActiveTab('allocations')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'allocations'
                            ? 'bg-pink-600 text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                >
                    <Boxes size={16} />
                    Allocations Log
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-white border border-rose-100/60 rounded-2xl shadow-sm p-6 min-h-[400px]">
                
                {/* 1. ACTIVITY LOG TAB */}
                {activeTab === 'activity' && (
                    <div className="space-y-6">
                        {/* TOOLBAR: Export lives inside the toolbar! */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">
                                        <Search size={16} />
                                    </span>
                                    <Input 
                                        placeholder="Search claimant..." 
                                        className="pl-9 h-10 text-sm border-gray-200"
                                        value={activitySearch}
                                        onChange={(e) => setActivitySearch(e.target.value)}
                                    />
                                </div>
                                
                                <Select 
                                    value={activityType}
                                    onChange={(e) => setActivityType(e.target.value)}
                                    className="h-10 text-sm border-gray-200"
                                >
                                    <option value="all">All Transactions</option>
                                    <option value="allocation">Allocations Only</option>
                                    <option value="expense">Expenses Only</option>
                                </Select>

                                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-10">
                                    <Calendar size={14} className="text-gray-400 shrink-0" />
                                    <input 
                                        type="date" 
                                        className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                        value={activityFrom}
                                        onChange={(e) => setActivityFrom(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-10">
                                    <Calendar size={14} className="text-gray-400 shrink-0" />
                                    <input 
                                        type="date" 
                                        className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                        value={activityTo}
                                        onChange={(e) => setActivityTo(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Export lives strictly inside the Activity Log Toolbar */}
                            <Button
                                onClick={handleExcelExport}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm h-10 shadow-sm shrink-0 duration-150 transition-colors"
                                leftIcon={<Download size={15} />}
                            >
                                Export Log
                            </Button>
                        </div>

                        {/* List/Table */}
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-right">Snapshot Balance</th>
                                        <th className="px-6 py-4">Reference/Remarks</th>
                                        <th className="px-6 py-4">Logged By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activityLoading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading financial activity...</p>
                                            </td>
                                        </tr>
                                    ) : activityLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                                                No activity records found matching filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        activityLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                    {formatDate(log.date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {log.type === 'allocation' ? (
                                                        <Badge className="bg-pink-50 border border-pink-200 text-pink-600 flex items-center gap-1 w-fit">
                                                            <ArrowUpRight size={12} />
                                                            Allocation
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-50 border border-amber-200 text-amber-600 flex items-center gap-1 w-fit">
                                                            <ArrowDownLeft size={12} />
                                                            Expense Claim
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{log.user_name}</div>
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                                                            {log.user_role.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {log.type === 'allocation' ? (
                                                        <span className="text-pink-600">+ {formatCurrency(log.amount)}</span>
                                                    ) : (
                                                        <span className="text-amber-600">- {formatCurrency(log.amount)}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-700 whitespace-nowrap">
                                                    {log.balance_at_moment !== null ? formatCurrency(log.balance_at_moment) : '-'}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={log.reference || ''}>
                                                    {log.reference || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-gray-600">
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
                                    Previous
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
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. USER BALANCES TAB */}
                {activeTab === 'balances' && (
                    <div className="space-y-6">
                        {/* Balances search toolbar */}
                        <div className="flex items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 max-w-sm">
                            <span className="text-gray-400">
                                <Search size={16} />
                            </span>
                            <Input 
                                placeholder="Search by name or role..." 
                                className="h-9 border-gray-200 text-sm"
                                value={balancesSearch}
                                onChange={(e) => setBalancesSearch(e.target.value)}
                            />
                        </div>

                        {/* Balances table */}
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-right">Total Disbursed (Received)</th>
                                        <th className="px-6 py-4 text-right">Approved Expenses</th>
                                        <th className="px-6 py-4 text-right">Outstanding Balance</th>
                                        <th className="px-6 py-4 text-center">Quick Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {balancesLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Computing team balances...</p>
                                            </td>
                                        </tr>
                                    ) : filteredBalances.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                                                No staff members found matching search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBalances.map((b) => (
                                            <tr key={b.user_id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {b.full_name}
                                                </td>
                                                <td className="px-6 py-4 uppercase text-[10px] font-bold tracking-wider">
                                                    {b.role === 'manager' ? (
                                                        <Badge className="bg-blue-50 border border-blue-200 text-blue-600">Manager</Badge>
                                                    ) : (
                                                        <Badge className="bg-purple-50 border border-purple-200 text-purple-600">Field Exec</Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                    {formatCurrency(b.total_received)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600">
                                                    {formatCurrency(b.total_expenses)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold">
                                                    {b.current_balance > 0 ? (
                                                        <span className="text-emerald-600">{formatCurrency(b.current_balance)}</span>
                                                    ) : b.current_balance < 0 ? (
                                                        <span className="text-rose-600">{formatCurrency(b.current_balance)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">{formatCurrency(b.current_balance)}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Button
                                                        onClick={() => handleQuickAllocate(b.user_id)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-pink-200 text-pink-600 hover:bg-pink-50 h-8"
                                                    >
                                                        Disburse
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. DIRECT FUND ENTRIES TAB */}
                {activeTab === 'entries' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 max-w-lg">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-9 flex-1">
                                <Calendar size={14} className="text-gray-400 shrink-0" />
                                <input 
                                    type="date" 
                                    className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                    value={entriesFrom}
                                    onChange={(e) => setEntriesFrom(e.target.value)}
                                />
                            </div>

                            <span className="text-gray-400 text-xs">to</span>

                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-9 flex-1">
                                <Calendar size={14} className="text-gray-400 shrink-0" />
                                <input 
                                    type="date" 
                                    className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                    value={entriesTo}
                                    onChange={(e) => setEntriesTo(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Direct pool entries table */}
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Entry Date</th>
                                        <th className="px-6 py-4 text-right">Amount Added</th>
                                        <th className="px-6 py-4">Remarks</th>
                                        <th className="px-6 py-4">Recorded By</th>
                                        <th className="px-6 py-4">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
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
                                                    + {formatCurrency(entry.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 max-w-sm truncate" title={entry.remarks || ''}>
                                                    {entry.remarks || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    {entry.entered_by_name}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                                                    {new Date(entry.created_at).toLocaleString()}
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
                                    Previous
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
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. ALLOCATIONS LOG TAB */}
                {activeTab === 'allocations' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <Select
                                value={allocationsUserFilter}
                                onChange={(e) => setAllocationsUserFilter(e.target.value)}
                                className="h-9 border-gray-200 text-sm max-w-xs"
                            >
                                <option value="">All Staff Members</option>
                                {staff.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role.replace('_', ' ')})
                                    </option>
                                ))}
                            </Select>

                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-9 max-w-xs flex-1">
                                <Calendar size={14} className="text-gray-400 shrink-0" />
                                <input 
                                    type="date" 
                                    className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                    value={allocationsFrom}
                                    onChange={(e) => setAllocationsFrom(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 h-9 max-w-xs flex-1">
                                <Calendar size={14} className="text-gray-400 shrink-0" />
                                <input 
                                    type="date" 
                                    className="text-xs focus:outline-none w-full bg-transparent text-gray-700" 
                                    value={allocationsTo}
                                    onChange={(e) => setAllocationsTo(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Allocations Table */}
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Allocation Date</th>
                                        <th className="px-6 py-4">Recipient</th>
                                        <th className="px-6 py-4 text-right">Amount Disbursed</th>
                                        <th className="px-6 py-4 text-right">Recipient Balance After</th>
                                        <th className="px-6 py-4 text-right">Total Approved Expenses At Allocation</th>
                                        <th className="px-6 py-4">Authorized By</th>
                                        <th className="px-6 py-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allocationsLoading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-pink-600 mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading allocations archive...</p>
                                            </td>
                                        </tr>
                                    ) : allocations.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                                                No dynamic allocations recorded matching criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        allocations.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    {formatDate(row.entry_date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{row.recipient_name}</div>
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                                                            {row.recipient_role.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-pink-600">
                                                    + {formatCurrency(row.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                                                    {formatCurrency(row.recipient_balance_after_alloc)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600 whitespace-nowrap">
                                                    {formatCurrency(row.recipient_total_expenses_at_alloc)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    {row.allocator_name}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-gray-500" title={row.remarks || ''}>
                                                    {row.remarks || '-'}
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
                                    Previous
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
                                    Next
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
                title="Vault Capital Increase"
                description="Inject additional capital deposits into the main Seragen liquidity account balance."
                size="md"
            >
                <form onSubmit={handleReceiveFunds} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deposit Amount (₹) *</label>
                        <Input 
                            type="number" 
                            placeholder="Enter amount (e.g. 500000)" 
                            required
                            step="0.01"
                            min="0.01"
                            value={receiveAmount}
                            onChange={(e) => setReceiveAmount(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deposit Entry Date *</label>
                        <Input 
                            type="date" 
                            required
                            value={receiveDate}
                            onChange={(e) => setReceiveDate(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deposit Comments / Reference</label>
                        <Textarea 
                            placeholder="Bank transaction reference, check ID, notes..." 
                            value={receiveRemarks}
                            onChange={(e) => setReceiveRemarks(e.target.value)}
                            className="border-gray-200 min-h-[80px]"
                            maxLength={500}
                        />
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
                            variant="ghost" 
                            onClick={() => setIsReceiveModalOpen(false)}
                        >
                            Discard
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors duration-200"
                            isLoading={submittingReceive}
                        >
                            Record Deposit
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* BATCH ALLOCATE FUNDS MODAL */}
            <Modal
                isOpen={isAllocateModalOpen}
                onClose={() => setIsAllocateModalOpen(false)}
                title="Disburse Staff Advances"
                description="Allocate funds to field executives or managers. Enforces strict Seragen balance verification."
                size="xl"
            >
                <form onSubmit={handleAllocateFunds} className="space-y-4">
                    {/* Display Point-In-Time available Seragen balance */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-pink-50 border border-pink-100 text-pink-900 text-sm mb-4">
                        <div className="flex items-center gap-2">
                            <Boxes size={18} className="text-pink-600 shrink-0" />
                            <span className="font-semibold text-pink-800">Available Seragen Account Balance:</span>
                        </div>
                        <span className="font-extrabold text-pink-700 text-lg">
                            {formatCurrency(stats.available_seragen_account_balance)}
                        </span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                        {allocationEntries.map((entry, index) => (
                            <div key={index} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 relative space-y-3">
                                
                                {allocationEntries.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeAllocationRow(index)}
                                        className="absolute top-2 right-2 p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-rose-600 transition-colors"
                                        title="Remove Recipient"
                                    >
                                        <X size={16} />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Staff Member *</label>
                                        <Select
                                            value={entry.user_id}
                                            onChange={(e) => updateAllocationRow(index, 'user_id', e.target.value)}
                                            className="h-9 text-xs border-gray-200 bg-white"
                                            required
                                        >
                                            <option value="">-- Choose Recipient --</option>
                                            {staff.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.full_name} ({u.role.replace('_', ' ')})
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Allocation Amount (₹) *</label>
                                        <Input
                                            type="number"
                                            placeholder="Enter disburse amount"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={entry.amount}
                                            onChange={(e) => updateAllocationRow(index, 'amount', e.target.value)}
                                            className="h-9 text-xs border-gray-200 bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Disbursement Remarks / Comments</label>
                                    <Input
                                        placeholder="Reason for advance allocation..."
                                        value={entry.remarks}
                                        onChange={(e) => updateAllocationRow(index, 'remarks', e.target.value)}
                                        className="h-9 text-xs border-gray-200 bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <button
                            type="button"
                            onClick={addAllocationRow}
                            className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 p-1 hover:bg-pink-50 rounded-lg transition-colors"
                        >
                            <Plus size={14} />
                            Add Another Recipient
                        </button>

                        <div className="text-right">
                            <span className="text-xs text-gray-500">Total Disbursements:</span>
                            <span className={`text-base font-extrabold ml-1.5 ${
                                totalAllocationToDistribute > stats.available_seragen_account_balance ? 'text-rose-600 animate-pulse' : 'text-gray-900'
                            }`}>
                                {formatCurrency(totalAllocationToDistribute)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Disbursement Effective Date *</label>
                            <Input 
                                type="date" 
                                required
                                value={allocationDate}
                                onChange={(e) => setAllocationDate(e.target.value)}
                                className="border-gray-200 h-9"
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
                            variant="ghost" 
                            onClick={() => setIsAllocateModalOpen(false)}
                        >
                            Discard
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-colors duration-200"
                            disabled={totalAllocationToDistribute > stats.available_seragen_account_balance}
                            isLoading={submittingAllocate}
                        >
                            Authorize Allocations
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
