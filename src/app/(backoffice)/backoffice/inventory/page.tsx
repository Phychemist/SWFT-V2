'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
    Boxes, 
    Plus, 
    Search, 
    ArrowUpRight, 
    ArrowDownLeft, 
    AlertCircle, 
    Users, 
    History, 
    Send, 
    Layers,
    RefreshCw,
    Edit2,
    CheckCircle2,
    ShieldAlert
} from 'lucide-react'
import { Card, CardContent, Modal, ModalFooter, Button, Input, Select, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

interface InventoryItem {
    id: string
    name: string
    unit: string
    cost_per_unit: number
    minimum_threshold: number
    warehouse_stock: number
    total_allocated: number
    total_consumed: number
    below_threshold: boolean
}

interface StaffMember {
    id: string
    full_name: string
    role: string
}

interface FEStockRow {
    item_id: string
    item_name: string
    unit: string
    total_allocated: number
    total_consumed: number
    current_holding: number
}

interface AllocationLogRow {
    id: string
    item_name: string
    item_unit: string
    recipient_name: string
    quantity: number
    allocator_name: string
    created_at: string
}

interface ConsumptionLogRow {
    id: string
    item_name: string
    item_unit: string
    fe_name: string
    ticket_uid: string
    patient_name: string
    quantity_used: number
    overridden: boolean
    override_reason: string | null
    created_at: string
}

export default function BackofficeInventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loadingItems, setLoadingItems] = useState(true)
    const [activeTab, setActiveTab] = useState<'warehouse' | 'fe_holdings' | 'movement' | 'allocate' | 'add_stock'>('warehouse')

    // FE Holdings Tab States
    const [selectedFE, setSelectedFE] = useState('')
    const [feStock, setFeStock] = useState<FEStockRow[]>([])
    const [loadingFEStock, setLoadingFEStock] = useState(false)

    // Movement Log Tab States
    const [allocationsLog, setAllocationsLog] = useState<AllocationLogRow[]>([])
    const [consumptionsLog, setConsumptionsLog] = useState<ConsumptionLogRow[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)

    // Edit Item Settings Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [editCost, setEditCost] = useState('')
    const [editThreshold, setEditThreshold] = useState('')
    const [editError, setEditError] = useState('')
    const [submittingEdit, setSubmittingEdit] = useState(false)

    // Add Stock Form States
    const [addStockItemId, setAddStockItemId] = useState('')
    const [addStockQuantity, setAddStockQuantity] = useState('')
    const [addStockNotes, setAddStockNotes] = useState('')
    const [addStockError, setAddStockError] = useState('')
    const [submittingAddStock, setSubmittingAddStock] = useState(false)

    // Allocate to FE Form States
    const [allocateItemId, setAllocateItemId] = useState('')
    const [allocateFEId, setAllocateFEId] = useState('')
    const [allocateQuantity, setAllocateQuantity] = useState('')
    const [allocateError, setAllocateError] = useState('')
    const [submittingAllocate, setSubmittingAllocate] = useState(false)

    // Fetch lists
    const fetchItems = async () => {
        setLoadingItems(true)
        try {
            const res = await fetch('/api/inventory')
            const result = await res.json()
            if (result.success) {
                setItems(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch inventory:', err)
        } finally {
            setLoadingItems(false)
        }
    }

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/assignable-users')
            const result = await res.json()
            if (result.success) {
                const FEs = result.data.filter((u: StaffMember) => u.role === 'field_executive')
                setStaff(FEs)
            }
        } catch (err) {
            console.error('Failed to fetch staff list:', err)
        }
    }

    // Load logs for Tab 3
    const fetchMovementLogs = async () => {
        setLoadingLogs(true)
        try {
            // 1. Fetch allocations
            const resAllocs = await fetch('/api/inventory/allocations')
            const dataAllocs = await resAllocs.json()
            
            // 2. Fetch consumptions
            const resCons = await fetch('/api/inventory/consumptions')
            const dataCons = await resCons.json()

            if (dataAllocs.success) setAllocationsLog(dataAllocs.data)
            if (dataCons.success) setConsumptionsLog(dataCons.data)
        } catch (err) {
            console.error('Failed to fetch logs:', err)
        } finally {
            setLoadingLogs(false)
        }
    }

    // Load stock holdings for Tab 2
    const fetchFEHoldings = useCallback(async (feId: string) => {
        if (!feId) {
            setFeStock([])
            return
        }
        setLoadingFEStock(true)
        try {
            // Get allocations for this FE
            const resAllocs = await fetch(`/api/inventory/allocations?to_user_id=${feId}`)
            const dataAllocs = await resAllocs.json()

            // Get consumptions by this FE
            const resCons = await fetch(`/api/inventory/consumptions?fe_id=${feId}`)
            const dataCons = await resCons.json()

            if (dataAllocs.success && dataCons.success) {
                const allocations = dataAllocs.data
                const consumptions = dataCons.data

                // Group in memory
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

                const computed = items.map(item => {
                    const stats = holdingsMap.get(item.id) || { total_alloc: 0, total_cons: 0 }
                    return {
                        item_id: item.id,
                        item_name: item.name,
                        unit: item.unit,
                        total_allocated: stats.total_alloc,
                        total_consumed: stats.total_cons,
                        current_holding: stats.total_alloc - stats.total_cons
                    }
                })

                setFeStock(computed)
            }
        } catch (err) {
            console.error('Failed to calculate FE holdings:', err)
        } finally {
            setLoadingFEStock(false)
        }
    }, [items])

    // Mount hooks
    useEffect(() => {
        fetchItems()
        fetchStaff()
    }, [])

    useEffect(() => {
        if (activeTab === 'warehouse') {
            fetchItems()
        } else if (activeTab === 'fe_holdings') {
            fetchFEHoldings(selectedFE)
        } else if (activeTab === 'movement') {
            fetchMovementLogs()
        }
    }, [activeTab, selectedFE, fetchFEHoldings])

    // Edit item parameters
    const handleOpenEdit = (item: InventoryItem) => {
        setEditingItem(item)
        setEditCost(item.cost_per_unit.toString())
        setEditThreshold(item.minimum_threshold.toString())
        setEditError('')
        setIsEditModalOpen(true)
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingItem) return
        setEditError('')

        const parsedCost = parseFloat(editCost)
        const parsedThreshold = parseInt(editThreshold)

        if (isNaN(parsedCost) || parsedCost < 0) {
            setEditError('Please enter a valid cost.')
            return
        }
        if (isNaN(parsedThreshold) || parsedThreshold < 0) {
            setEditError('Please enter a valid threshold.')
            return
        }

        setSubmittingEdit(true)
        try {
            const res = await fetch(`/api/inventory/items/${editingItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cost_per_unit: parsedCost,
                    minimum_threshold: parsedThreshold
                })
            })
            const result = await res.json()
            if (result.success) {
                setIsEditModalOpen(false)
                fetchItems()
            } else {
                setEditError(result.error || 'Failed to update settings.')
            }
        } catch (err) {
            setEditError('Network error. Failed to save.')
        } finally {
            setSubmittingEdit(false)
        }
    }

    // Add Stock
    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddStockError('')

        if (!addStockItemId) {
            setAddStockError('Please select an item.')
            return
        }

        const qty = parseInt(addStockQuantity)
        if (isNaN(qty) || qty <= 0) {
            setAddStockError('Please enter a positive stock quantity.')
            return
        }

        setSubmittingAddStock(true)
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: addStockItemId,
                    quantity: qty,
                    notes: addStockNotes || null
                })
            })
            const result = await res.json()
            if (result.success) {
                setAddStockItemId('')
                setAddStockQuantity('')
                setAddStockNotes('')
                fetchItems()
                setActiveTab('warehouse')
            } else {
                setAddStockError(result.error || 'Failed to log stock.')
            }
        } catch (err) {
            setAddStockError('Network error. Failed to save.')
        } finally {
            setSubmittingAddStock(false)
        }
    }

    // Disburse Stock to FE
    const handleAllocateStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setAllocateError('')

        if (!allocateItemId) {
            setAllocateError('Please select an item.')
            return
        }
        if (!allocateFEId) {
            setAllocateError('Please select a Field Executive.')
            return
        }

        const qty = parseInt(allocateQuantity)
        if (isNaN(qty) || qty <= 0) {
            setAllocateError('Please enter a positive allocation quantity.')
            return
        }

        // Validate stock local check
        const matchedItem = items.find(i => i.id === allocateItemId)
        if (matchedItem && qty > matchedItem.warehouse_stock) {
            setAllocateError(`Insufficient stock in warehouse. Available: ${matchedItem.warehouse_stock} units.`)
            return
        }

        setSubmittingAllocate(true)
        try {
            const res = await fetch('/api/inventory/allocations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: allocateItemId,
                    to_user_id: allocateFEId,
                    quantity: qty
                })
            })
            const result = await res.json()
            if (result.success) {
                setAllocateItemId('')
                setAllocateFEId('')
                setAllocateQuantity('')
                fetchItems()
                setActiveTab('warehouse')
            } else {
                setAllocateError(result.error || 'Failed to allocate stock.')
            }
        } catch (err) {
            setAllocateError('Network error. Failed to save.')
        } finally {
            setSubmittingAllocate(false)
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <Boxes size={20} />
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900">Inventory Management & Stockings</h1>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        Maintain warehouse asset thresholds, disburse kit items to field executives, and audit consumption trails.
                    </p>
                </div>
            </div>

            {/* Custom Tab Selector */}
            <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('warehouse')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'warehouse'
                            ? 'bg-[var(--primary-600)] text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--primary-600)]'
                    }`}
                >
                    <Layers size={16} />
                    Warehouse stock
                </button>
                <button
                    onClick={() => setActiveTab('fe_holdings')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'fe_holdings'
                            ? 'bg-[var(--primary-600)] text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--primary-600)]'
                    }`}
                >
                    <Users size={16} />
                    FE holdings
                </button>
                <button
                    onClick={() => setActiveTab('movement')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'movement'
                            ? 'bg-[var(--primary-600)] text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--primary-600)]'
                    }`}
                >
                    <History size={16} />
                    Movement Log
                </button>
                <button
                    onClick={() => setActiveTab('allocate')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'allocate'
                            ? 'bg-[var(--primary-600)] text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--primary-600)]'
                    }`}
                >
                    <Send size={16} />
                    Allocate Stock to FE
                </button>
                <button
                    onClick={() => setActiveTab('add_stock')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === 'add_stock'
                            ? 'bg-[var(--primary-600)] text-white shadow-sm font-bold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--primary-600)]'
                    }`}
                >
                    <Plus size={16} />
                    Add Stock to Warehouse
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 min-h-[400px]">

                {/* 1. WAREHOUSE STOCK TAB */}
                {activeTab === 'warehouse' && (
                    <div className="space-y-6">
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Item Name</th>
                                        <th className="px-6 py-4">Unit</th>
                                        <th className="px-6 py-4 text-right">Cost Per Unit</th>
                                        <th className="px-6 py-4 text-right">Min Threshold</th>
                                        <th className="px-6 py-4 text-right">Warehouse stock</th>
                                        <th className="px-6 py-4 text-right">Total Allocated</th>
                                        <th className="px-6 py-4 text-right">Total Consumed</th>
                                        <th className="px-6 py-4">Safety Status</th>
                                        <th className="px-6 py-4 text-center">Settings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingItems ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-[var(--primary-600)] mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Loading warehouse inventory...</p>
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-gray-400 text-xs">
                                                No inventory items recorded in SWFT.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 uppercase font-semibold text-xs">
                                                    {item.unit}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-700 font-medium">
                                                    {formatCurrency(item.cost_per_unit)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600">
                                                    {item.minimum_threshold}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-gray-900">
                                                    {item.warehouse_stock}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-500">
                                                    {item.total_allocated}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-500">
                                                    {item.total_consumed}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.below_threshold ? (
                                                        <Badge className="bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-1 w-fit font-bold">
                                                            <ShieldAlert size={12} />
                                                            Low Stock
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center gap-1 w-fit">
                                                            <CheckCircle2 size={12} />
                                                            Healthy
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[var(--primary-600)] transition-colors"
                                                        title="Edit Cost & Threshold"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. FE HOLDINGS TAB */}
                {activeTab === 'fe_holdings' && (
                    <div className="space-y-6">
                        {/* Selector toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 max-w-lg">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 mt-2 sm:mt-0">Select Field Executive:</label>
                            <Select
                                value={selectedFE}
                                onChange={(e) => {
                                    setSelectedFE(e.target.value)
                                    fetchFEHoldings(e.target.value)
                                }}
                                className="h-9 border-gray-200 bg-white text-xs flex-1"
                            >
                                <option value="">-- Choose Field Executive --</option>
                                {staff.map(fe => (
                                    <option key={fe.id} value={fe.id}>{fe.full_name}</option>
                                ))}
                            </Select>
                        </div>

                        {/* Holdings Table */}
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Item Name</th>
                                        <th className="px-6 py-4">Unit</th>
                                        <th className="px-6 py-4 text-right">Total Allocated (Disbursed)</th>
                                        <th className="px-6 py-4 text-right">Total Consumed (Completed Tickets)</th>
                                        <th className="px-6 py-4 text-right">Current outstanding Holdings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {!selectedFE ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                                                Please select a Field Executive from the dropdown to check inventory holdings.
                                            </td>
                                        </tr>
                                    ) : loadingFEStock ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12">
                                                <RefreshCw size={24} className="animate-spin text-[var(--primary-600)] mx-auto" />
                                                <p className="text-xs text-gray-400 mt-2">Calculating personal stock holdings...</p>
                                            </td>
                                        </tr>
                                    ) : feStock.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                                                No holdings recorded for this executive.
                                            </td>
                                        </tr>
                                    ) : (
                                        feStock.map((row) => (
                                            <tr key={row.item_id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {row.item_name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 uppercase font-semibold text-xs">
                                                    {row.unit}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600">
                                                    {row.total_allocated}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600">
                                                    {row.total_consumed}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-extrabold ${
                                                    row.current_holding > 0 ? 'text-emerald-600' : 'text-gray-400'
                                                }`}>
                                                    {row.current_holding}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. STOCK MOVEMENT LOG TAB */}
                {activeTab === 'movement' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Allocations (Warehouse -> FE) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <ArrowUpRight size={16} className="text-emerald-600" />
                                Disbursal History (Warehouse → FE)
                            </h3>

                            <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-xs text-gray-500">
                                    <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3">Recipient</th>
                                            <th className="px-4 py-3 text-right">Quantity</th>
                                            <th className="px-4 py-3">By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingLogs ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-6 text-gray-400">Loading disbursals...</td>
                                            </tr>
                                        ) : allocationsLog.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-6 text-gray-400">No disbursements recorded.</td>
                                            </tr>
                                        ) : (
                                            allocationsLog.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-2.5 font-medium text-gray-700">
                                                        {formatDate(row.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-bold text-gray-900">
                                                        {row.item_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-800">
                                                        {row.recipient_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">
                                                        + {row.quantity}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-500">
                                                        {row.allocator_name}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Consumptions (FE -> Ticket) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <ArrowDownLeft size={16} className="text-amber-600" />
                                Consumption History (FE → Patient Tickets)
                            </h3>

                            <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-xs text-gray-500">
                                    <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3">Executive</th>
                                            <th className="px-4 py-3">Ticket ID</th>
                                            <th className="px-4 py-3 text-right">Quantity</th>
                                            <th className="px-4 py-3">Override?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingLogs ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-6 text-gray-400">Loading consumptions...</td>
                                            </tr>
                                        ) : consumptionsLog.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-6 text-gray-400">No consumptions recorded.</td>
                                            </tr>
                                        ) : (
                                            consumptionsLog.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-2.5 font-medium text-gray-700">
                                                        {formatDate(row.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-bold text-gray-900">
                                                        {row.item_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-800">
                                                        {row.fe_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-gray-700 font-semibold">
                                                        {row.ticket_uid}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-extrabold text-amber-600">
                                                        - {row.quantity_used}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {row.overridden ? (
                                                            <Badge className="bg-amber-50 border border-amber-200 text-amber-600 text-[9px] scale-90" title={row.override_reason || ''}>
                                                                Overridden
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. ALLOCATE STOCK TO FE TAB */}
                {activeTab === 'allocate' && (
                    <div className="max-w-xl mx-auto p-4 border border-gray-100 rounded-2xl bg-gray-50/20">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                            <Send size={18} className="text-[var(--primary-600)]" />
                            Disburse Inventory Stock
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Transfer items out of central warehouse inventory directly into the Field Executive&apos;s active holdings.
                        </p>

                        <form onSubmit={handleAllocateStock} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Inventory Item *</label>
                                <Select
                                    required
                                    value={allocateItemId}
                                    onChange={(e) => setAllocateItemId(e.target.value)}
                                    className="border-gray-200 bg-white h-10 text-sm"
                                >
                                    <option value="">-- Choose Item --</option>
                                    {items.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} (Warehouse: {item.warehouse_stock} {item.unit}s available)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Recipient Field Executive *</label>
                                <Select
                                    required
                                    value={allocateFEId}
                                    onChange={(e) => setAllocateFEId(e.target.value)}
                                    className="border-gray-200 bg-white h-10 text-sm"
                                >
                                    <option value="">-- Choose Field Executive --</option>
                                    {staff.map(fe => (
                                        <option key={fe.id} value={fe.id}>{fe.full_name}</option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Transfer Quantity *</label>
                                <Input
                                    type="number"
                                    placeholder="Enter quantity"
                                    required
                                    min="1"
                                    value={allocateQuantity}
                                    onChange={(e) => setAllocateQuantity(e.target.value)}
                                    className="border-gray-200 h-10"
                                />
                            </div>

                            {allocateError && (
                                <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{allocateError}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-semibold h-10 mt-2 shadow-sm transition-colors duration-200"
                                isLoading={submittingAllocate}
                            >
                                Dispatch Disbursal
                            </Button>
                        </form>
                    </div>
                )}

                {/* 5. ADD STOCK TO WAREHOUSE TAB */}
                {activeTab === 'add_stock' && (
                    <div className="max-w-xl mx-auto p-4 border border-gray-100 rounded-2xl bg-gray-50/20">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                            <Plus size={18} className="text-emerald-600" />
                            Log Central Stock Addition
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Record newly received vendor stock arrivals into the main central warehouse holdings.
                        </p>

                        <form onSubmit={handleAddStock} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Inventory Item *</label>
                                <Select
                                    required
                                    value={addStockItemId}
                                    onChange={(e) => setAddStockItemId(e.target.value)}
                                    className="border-gray-200 bg-white h-10 text-sm"
                                >
                                    <option value="">-- Choose Item --</option>
                                    {items.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.unit})
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Received Quantity *</label>
                                <Input
                                    type="number"
                                    placeholder="Enter units quantity"
                                    required
                                    min="1"
                                    value={addStockQuantity}
                                    onChange={(e) => setAddStockQuantity(e.target.value)}
                                    className="border-gray-200 h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Warehouse Notes / Comments</label>
                                <Input
                                    placeholder="Batch code, vendor details, invoices..."
                                    value={addStockNotes}
                                    onChange={(e) => setAddStockNotes(e.target.value)}
                                    className="border-gray-200 h-10"
                                />
                            </div>

                            {addStockError && (
                                <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{addStockError}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 mt-2 shadow-sm transition-colors duration-200"
                                isLoading={submittingAddStock}
                            >
                                Check-in Central Stock
                            </Button>
                        </form>
                    </div>
                )}
            </div>

            {/* EDIT ITEM CONFIG MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Configure Thresholds: ${editingItem?.name || ''}`}
                description="Update minimum warning threshold counts and standard billing cost per unit parameters."
                size="md"
            >
                <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unit Standard Cost (₹) *</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Minimum Warehouse threshold Warning *</label>
                        <Input
                            type="number"
                            min="0"
                            required
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(e.target.value)}
                            className="border-gray-200 h-10"
                        />
                    </div>

                    {editError && (
                        <div className="flex items-center gap-1.5 p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-semibold">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{editError}</span>
                        </div>
                    )}

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Discard
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-medium shadow-sm transition-colors duration-200"
                            isLoading={submittingEdit}
                        >
                            Save Settings
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
