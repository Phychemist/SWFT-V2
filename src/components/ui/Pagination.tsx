'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number       // 1-based
    totalCount: number
    pageSize: number
    onPageChange: (page: number) => void
    className?: string
}

export function Pagination({ currentPage, totalCount, pageSize, onPageChange, className = '' }: PaginationProps) {
    const totalPages = Math.ceil(totalCount / pageSize)
    if (totalPages <= 1) return null

    const from = (currentPage - 1) * pageSize + 1
    const to = Math.min(currentPage * pageSize, totalCount)

    // Build visible page numbers: always show first, last, current ±2, with ellipsis
    const getPageNumbers = (): (number | '...')[] => {
        const pages: (number | '...')[] = []
        const delta = 2

        const left = Math.max(2, currentPage - delta)
        const right = Math.min(totalPages - 1, currentPage + delta)

        pages.push(1)
        if (left > 2) pages.push('...')
        for (let i = left; i <= right; i++) pages.push(i)
        if (right < totalPages - 1) pages.push('...')
        if (totalPages > 1) pages.push(totalPages)

        return pages
    }

    const pageNumbers = getPageNumbers()

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 ${className}`}>
            {/* Record count */}
            <p className="text-sm text-[var(--text-muted)] whitespace-nowrap">
                Showing <span className="font-semibold text-[var(--text-primary)]">{from}–{to}</span> of{' '}
                <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span> records
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
                {/* First page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                >
                    <ChevronsLeft size={15} />
                </button>

                {/* Previous page */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                >
                    <ChevronLeft size={15} />
                </button>

                {/* Page numbers */}
                {pageNumbers.map((page, idx) =>
                    page === '...' ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex items-center justify-center w-8 h-8 text-sm text-[var(--text-muted)]"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-colors border
                                ${currentPage === page
                                    ? 'bg-[var(--primary-600)] text-white border-[var(--primary-600)] shadow-sm'
                                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {page}
                        </button>
                    )
                )}

                {/* Next page */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                >
                    <ChevronRight size={15} />
                </button>

                {/* Last page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                >
                    <ChevronsRight size={15} />
                </button>
            </div>
        </div>
    )
}
