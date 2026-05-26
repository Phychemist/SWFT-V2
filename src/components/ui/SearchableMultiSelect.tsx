'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

interface SearchableMultiSelectOption {
    value: string
    label: string
    description?: string
    disabled?: boolean
}

interface SearchableMultiSelectProps {
    label?: string
    error?: string
    hint?: string
    options: SearchableMultiSelectOption[]
    placeholder?: string
    required?: boolean
    value: string[]
    onChange: (value: string[]) => void
    disabled?: boolean
    className?: string
}

function SearchableMultiSelect({
    label,
    error,
    hint,
    options,
    placeholder = 'Select...',
    required = false,
    value,
    onChange,
    disabled = false,
    className = '',
}: SearchableMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOptions = options.filter((opt) => value.includes(opt.value))

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleToggle = (optionValue: string) => {
        const next = value.includes(optionValue)
            ? value.filter((v) => v !== optionValue)
            : [...value, optionValue]
        onChange(next)
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(value.filter((v) => v !== optionValue))
    }

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
                    {value.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-[var(--primary-600)]">
                            ({value.length} selected)
                        </span>
                    )}
                </label>
            )}

            <div className="relative" ref={dropdownRef}>
                {/* Trigger */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
                        w-full min-h-[42px] px-3 py-2 pr-10
                        bg-white border rounded-lg
                        text-left
                        transition-all duration-200
                        focus:outline-none focus:ring-2
                        disabled:bg-[var(--gray-50)] disabled:cursor-not-allowed disabled:text-[var(--gray-400)]
                        ${borderStyles}
                    `}
                >
                    {selectedOptions.length === 0 ? (
                        <span className="text-[var(--text-muted)]">{placeholder}</span>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedOptions.map((opt) => (
                                <span
                                    key={opt.value}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--primary-50)] text-[var(--primary-700)] text-sm border border-[var(--primary-200)]"
                                >
                                    {opt.label}
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemove(opt.value, e)}
                                        className="hover:bg-[var(--primary-100)] rounded-full p-0.5 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </button>

                {/* Chevron */}
                <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronDown
                        size={18}
                        className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-[var(--border-default)] rounded-lg shadow-lg max-h-80 overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-[var(--border-light)]">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tests..."
                                    className="w-full pl-9 pr-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="overflow-y-auto max-h-60">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                                    No tests found
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = value.includes(option.value)
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleToggle(option.value)}
                                            disabled={option.disabled}
                                            className={`
                                                w-full px-4 py-2.5 text-left text-sm flex items-center gap-3
                                                transition-colors
                                                ${isSelected
                                                    ? 'bg-[var(--primary-50)]'
                                                    : 'hover:bg-[var(--gray-50)]'
                                                }
                                                ${option.disabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'cursor-pointer'
                                                }
                                            `}
                                        >
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-[var(--primary-600)] border-[var(--primary-600)]'
                                                    : 'border-[var(--border-default)]'
                                            }`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`${isSelected ? 'text-[var(--primary-700)] font-medium' : 'text-[var(--text-primary)]'}`}>
                                                    {option.label}
                                                </span>
                                                {option.description && (
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{option.description}</p>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })
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

export { SearchableMultiSelect }
export type { SearchableMultiSelectProps, SearchableMultiSelectOption }
