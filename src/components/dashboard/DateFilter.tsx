'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DateFilterProps {
    currentRange: string
    onRangeChange: (range: string) => void
    customStart: string
    setCustomStart: (date: string) => void
    customEnd: string
    setCustomEnd: (date: string) => void
    onApplyCustom: () => void
}

const RANGES = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom Range', value: 'custom' },
]

export function DateFilter({
    currentRange,
    onRangeChange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    onApplyCustom
}: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const activeLabel = RANGES.find(r => r.value === currentRange)?.label || 'Filter'

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:border-blue-200 transition-all duration-200 text-sm font-medium text-gray-700 w-[180px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-gray-100 rounded-md text-gray-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                        <Calendar size={16} />
                    </div>
                    <span>{activeLabel}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 overflow-hidden"
                    >
                        <div className="flex flex-col gap-1">
                            {RANGES.map((range) => (
                                <button
                                    key={range.value}
                                    onClick={() => {
                                        onRangeChange(range.value)
                                        if (range.value !== 'custom') setIsOpen(false)
                                    }}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${currentRange === range.value
                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {range.label}
                                    {currentRange === range.value && <Check size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* Custom Inputs Area */}
                        {currentRange === 'custom' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-2 pt-3 border-t border-gray-100 px-2 pb-2 space-y-3"
                            >
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">From</label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">To</label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        onApplyCustom()
                                        setIsOpen(false)
                                    }}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow"
                                >
                                    Apply Range
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
