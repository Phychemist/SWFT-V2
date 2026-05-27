'use client'

import { useEffect, useState } from 'react'
import {
    Boxes,
    Loader2,
    Search,
    AlertTriangle,
    TrendingUp,
    BadgeAlert,
    RefreshCw,
    Activity,
    DollarSign,
    Package
} from 'lucide-react'

export default function AccountantInventoryPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterLowStock, setFilterLowStock] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchInventory = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/inventory')
            const data = await res.json()
            if (data.success) {
                setItems(data.data)
            } else {
                setError(data.error || 'Failed to retrieve inventory data.')
            }
        } catch (err) {
            console.error('Error fetching inventory counts:', err)
            setError('An error occurred while loading inventory data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInventory()
    }, [])

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLowStock = filterLowStock ? item.below_threshold : true
        return matchesSearch && matchesLowStock
    })

    // Calculations
    const grandAssetValuation = items.reduce((acc, item) => acc + (item.warehouse_stock * item.cost_per_unit), 0)
    const totalAllocatedItems = items.reduce((acc, item) => acc + item.total_allocated, 0)
    const totalConsumedItems = items.reduce((acc, item) => acc + item.total_consumed, 0)
    const lowStockCount = items.filter(item => item.below_threshold).length

    return (
        <div className="flex flex-col min-h-screen bg-[var(--gray-50)] pb-12 rose-theme">
            {/* Header */}
            <div className="bg-white border-b border-[var(--border-light)] sticky top-0 z-10 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Inventory Logs</h1>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Read-only master snapshot of all inventory items</p>
                    </div>
                </div>
            </div>

            <div className="px-6 mt-6 w-full space-y-6">
                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-sm flex items-center gap-2">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Master Inventory Table */}
                <div className="table-wrap bg-white border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-pink-600" /></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Boxes size={40} className="mx-auto mb-3 opacity-30" />
                                <h3 className="font-bold text-sm text-gray-600">No inventory items found</h3>
                                <p className="text-xs mt-1">Warehouse records are empty.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500">
                                        <th className="p-4">Item Name</th>
                                        <th className="p-4">Unit</th>
                                        <th className="p-4 text-right">Total Added</th>
                                        <th className="p-4 text-right">Total Allocated</th>
                                        <th className="p-4 text-right">Total Consumed</th>
                                        <th className="p-4 text-right">Warehouse Stock</th>
                                        <th className="p-4 text-right">Remaining</th>
                                        <th className="p-4 text-right">Cost per Qty (₹)</th>
                                        <th className="p-4 text-right font-bold">Total Cost (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item) => {
                                        const remaining = item.total_allocated - item.total_consumed
                                        const totalCost = remaining * item.cost_per_unit
                                        const isBelowThreshold = item.below_threshold
                                        
                                        return (
                                            <tr 
                                                key={item.id} 
                                                className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                                                    isBelowThreshold ? 'below-thresh bg-red-50/5' : ''
                                                }`}
                                            >
                                                <td className="p-4 font-bold text-gray-800">{item.name}</td>
                                                <td className="p-4 text-gray-400 font-semibold">{item.unit}</td>
                                                <td className="p-4 text-right font-semibold text-gray-600">{item.total_added}</td>
                                                <td className="p-4 text-right text-gray-500 font-medium">{item.total_allocated}</td>
                                                <td className="p-4 text-right text-gray-500 font-medium">{item.total_consumed}</td>
                                                <td className="p-4 text-right font-semibold text-gray-700">{item.warehouse_stock}</td>
                                                <td className={`p-4 text-right font-bold ${
                                                    isBelowThreshold ? 'text-red-600 font-extrabold' : 'text-gray-800'
                                                }`}>
                                                    {remaining}
                                                </td>
                                                <td className="p-4 text-right font-semibold text-gray-600">₹{item.cost_per_unit.toFixed(2)}</td>
                                                <td className="p-4 text-right font-extrabold text-gray-800 text-sm">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
