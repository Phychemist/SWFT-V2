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
                        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Master Inventory Logs</h1>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Read-only warehouse assets, holds, and procedure consumptions</p>
                    </div>
                    <button
                        onClick={fetchInventory}
                        disabled={loading}
                        className="text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100/50 p-2.5 rounded-full transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
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

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Card 1: Warehouse Asset Valuation */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-pink-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Warehouse Asset Valuation</span>
                            <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg"><DollarSign size={16} /></div>
                        </div>
                        <div className="text-2xl font-extrabold text-pink-600">
                            {loading ? <Loader2 className="animate-spin text-pink-500" size={24} /> : `₹${grandAssetValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Sum value of all stock currently in warehouse</p>
                    </div>

                    {/* Card 2: Allocated */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-indigo-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Allocated Units</span>
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={16} /></div>
                        </div>
                        <div className="text-2xl font-extrabold text-gray-800">
                            {loading ? <Loader2 className="animate-spin text-indigo-500" size={24} /> : totalAllocatedItems.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Total items disbursed to Field Executives</p>
                    </div>

                    {/* Card 3: Consumed */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-green-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Consumed Units</span>
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Boxes size={16} /></div>
                        </div>
                        <div className="text-2xl font-extrabold text-gray-800">
                            {loading ? <Loader2 className="animate-spin text-green-500" size={24} /> : totalConsumedItems.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Total items consumed in completed tasks</p>
                    </div>

                    {/* Card 4: Low Stock Warnings */}
                    <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Low Stock items</span>
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><BadgeAlert size={16} /></div>
                        </div>
                        <div className="text-2xl font-extrabold text-amber-600">
                            {loading ? <Loader2 className="animate-spin text-amber-500" size={24} /> : lowStockCount}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Items currently falling below safe thresholds</p>
                    </div>
                </div>

                {/* Filter and search bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--border-light)] shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search inventory items by name..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-[var(--border-light)] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterLowStock(!filterLowStock)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filterLowStock 
                                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                : 'bg-white border-[var(--border-light)] text-gray-500 hover:bg-gray-50'}`}
                        >
                            {filterLowStock ? 'Showing Low Stock Only' : 'Filter Low Stock'}
                        </button>
                    </div>
                </div>

                {/* Master Inventory Table */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-light)] bg-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <Activity size={16} className="text-pink-600" />
                            MASTER WAREHOUSE ASSETS LOG
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-pink-600" /></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Boxes size={40} className="mx-auto mb-3 opacity-30" />
                                <h3 className="font-bold text-sm text-gray-600">No inventory items found</h3>
                                <p className="text-xs mt-1">Warehouse records are empty or match no search parameters.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-500">
                                        <th className="p-4">Item Name</th>
                                        <th className="p-4">Billing Unit</th>
                                        <th className="p-4 text-right">Unit Cost (₹)</th>
                                        <th className="p-4 text-right">Safe Threshold</th>
                                        <th className="p-4 text-right">Warehouse Holdings</th>
                                        <th className="p-4 text-right">Allocated to FEs</th>
                                        <th className="p-4 text-right">Consumed in Tasks</th>
                                        <th className="p-4 text-right font-bold text-pink-600">Holding Asset Value (₹)</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item) => {
                                        const assetValue = item.warehouse_stock * item.cost_per_unit
                                        return (
                                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{item.name}</td>
                                                <td className="p-4">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                                                        {item.unit}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-semibold text-gray-600">₹{item.cost_per_unit.toFixed(2)}</td>
                                                <td className="p-4 text-right text-gray-500 font-medium">{item.minimum_threshold} units</td>
                                                <td className="p-4 text-right font-bold text-gray-700">{item.warehouse_stock} units</td>
                                                <td className="p-4 text-right text-gray-500">{item.total_allocated} units</td>
                                                <td className="p-4 text-right text-gray-500">{item.total_consumed} units</td>
                                                <td className="p-4 text-right font-extrabold text-pink-600 text-sm">₹{assetValue.toFixed(2)}</td>
                                                <td className="p-4">
                                                    {item.below_threshold ? (
                                                        <span className="bg-red-50 border border-red-200 text-red-600 px-2.5 py-1 rounded-full uppercase font-bold text-[9px] flex items-center gap-1 w-max">
                                                            <AlertTriangle size={10} /> Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-50 border border-green-200 text-green-600 px-2.5 py-1 rounded-full uppercase font-bold text-[9px] flex items-center gap-1 w-max">
                                                            <CheckCircle2 size={10} /> Optimal
                                                        </span>
                                                    )}
                                                </td>
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
