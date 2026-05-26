'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Column<T> {
    key: string
    header: string
    width?: string
    render?: (item: T, index: number) => ReactNode
}

interface TableProps<T> {
    columns: Column<T>[]
    data: T[]
    loading?: boolean
    emptyMessage?: string
    onRowClick?: (item: T) => void
    getRowKey?: (item: T) => string
}

function Table<T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    getRowKey,
}: TableProps<T>) {
    const rowAnimation = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    }

    if (loading) {
        return (
            <div className="w-full bg-white border border-[var(--border-light)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-center py-16">
                    <div className="spinner spinner-lg" />
                </div>
            </div>
        )
    }

    return (
        <div className="w-full bg-white border border-[var(--border-light)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[var(--gray-50)] border-b border-[var(--border-light)]">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                                    style={{ width: column.width }}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-12 text-center text-[var(--text-muted)]"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <motion.tr
                                    key={getRowKey ? getRowKey(item) : index}
                                    {...rowAnimation}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => onRowClick?.(item)}
                                    className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-[var(--gray-50)]' : ''}
                    transition-colors duration-150
                  `}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-4 py-3.5 text-sm text-[var(--text-primary)]"
                                        >
                                            {column.render
                                                ? column.render(item, index)
                                                : (item[column.key] as ReactNode) ?? '-'}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export { Table }
export type { TableProps, Column }
