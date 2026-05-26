'use client'

import { forwardRef, useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface SearchableSelectOption {
    value: string
    label: string
    disabled?: boolean
}

interface SearchableSelectProps {
    label?: string
    error?: string
    hint?: string
    options: SearchableSelectOption[]
    placeholder?: string
    required?: boolean
    value?: string
    onChange?: (value: string) => void
    name?: string
    disabled?: boolean
    className?: string
}

const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
    (
        {
            label,
            error,
            hint,
            options,
            placeholder = 'Search and select...',
            required = false,
            value,
            onChange,
            name,
            disabled = false,
            className = '',
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false)
        const [searchQuery, setSearchQuery] = useState('')
        const [selectedOption, setSelectedOption] = useState<SearchableSelectOption | null>(null)
        const dropdownRef = useRef<HTMLDivElement>(null)
        const searchInputRef = useRef<HTMLInputElement>(null)

        // Find selected option based on value prop
        useEffect(() => {
            if (value) {
                const option = options.find((opt) => opt.value === value)
                setSelectedOption(option || null)
            } else {
                setSelectedOption(null)
            }
        }, [value, options])

        // Filter options based on search query
        const filteredOptions = options.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )

        // Handle option selection
        const handleSelect = (option: SearchableSelectOption) => {
            if (option.disabled) return
            setSelectedOption(option)
            onChange?.(option.value)
            setIsOpen(false)
            setSearchQuery('')
        }

        // Handle clear selection
        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation()
            setSelectedOption(null)
            onChange?.('')
            setSearchQuery('')
        }

        // Close dropdown when clicking outside
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                    setSearchQuery('')
                }
            }

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside)
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }, [isOpen])

        // Focus search input when dropdown opens
        useEffect(() => {
            if (isOpen && searchInputRef.current) {
                searchInputRef.current.focus()
            }
        }, [isOpen])

        const borderStyles = error
            ? 'border-[var(--error-500)] focus-within:ring-[var(--error-500)]'
            : 'border-[var(--border-default)] hover:border-[var(--gray-400)] focus-within:ring-[var(--primary-500)]'

        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-primary)]">
                        {label}
                        {required && <span className="text-[var(--error-500)] ml-1">*</span>}
                    </label>
                )}

                <div className="relative" ref={dropdownRef}>
                    {/* Hidden input for form integration */}
                    <input
                        ref={ref}
                        type="hidden"
                        name={name}
                        value={selectedOption?.value || ''}
                    />

                    {/* Trigger Button */}
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                        className={`
                            w-full px-4 py-2.5 pr-10
                            bg-white border rounded-lg
                            text-left
                            transition-all duration-200
                            focus:outline-none focus:ring-2
                            disabled:bg-[var(--gray-50)] disabled:cursor-not-allowed disabled:text-[var(--gray-400)]
                            ${borderStyles}
                        `}
                    >
                        <span className={selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </button>

                    {/* Icons */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {selectedOption && !disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-0.5 hover:bg-[var(--gray-100)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                        <ChevronDown
                            size={18}
                            className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                }`}
                        />
                    </div>

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-[var(--border-default)] rounded-lg shadow-lg max-h-80 overflow-hidden">
                            {/* Search Input */}
                            <div className="p-2 border-b border-[var(--border-light)]">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Options List */}
                            <div className="overflow-y-auto max-h-60">
                                {filteredOptions.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                                        No results found
                                    </div>
                                ) : (
                                    filteredOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleSelect(option)}
                                            disabled={option.disabled}
                                            className={`
                                                w-full px-4 py-2.5 text-left text-sm
                                                transition-colors
                                                ${option.value === selectedOption?.value
                                                    ? 'bg-[var(--primary-50)] text-[var(--primary-700)]'
                                                    : 'text-[var(--text-primary)] hover:bg-[var(--gray-50)]'
                                                }
                                                ${option.disabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'cursor-pointer'
                                                }
                                            `}
                                        >
                                            {option.label}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <p className="mt-1.5 text-sm text-[var(--error-600)]">{error}</p>
                )}

                {hint && !error && (
                    <p className="mt-1.5 text-sm text-[var(--text-muted)]">{hint}</p>
                )}
            </div>
        )
    }
)

SearchableSelect.displayName = 'SearchableSelect'

export { SearchableSelect }
export type { SearchableSelectProps, SearchableSelectOption }
