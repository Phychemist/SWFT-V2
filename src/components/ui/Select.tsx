'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
    value: string
    label: string
    disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string
    error?: string
    hint?: string
    options: SelectOption[]
    placeholder?: string
    leftIcon?: React.ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (props, ref) => {
        const {
            label,
            error,
            hint,
            options,
            placeholder = 'Select an option',
            className = '',
            leftIcon,
            ...rest
        } = props

        const baseSelectStyles = `
      w-full px-4 py-2.5 pr-10
      bg-white border rounded-lg
      text-[var(--text-primary)]
      appearance-none cursor-pointer
      group-focus-within:border-[var(--primary-500)]
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent
      disabled:bg-[var(--gray-50)] disabled:cursor-not-allowed disabled:text-[var(--gray-400)]
    `

        const borderStyles = error
            ? 'border-[var(--error-500)] focus:ring-[var(--error-500)]'
            : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'

        const paddingStyles = leftIcon ? 'pl-11' : 'px-4'

        return (
            <div className="w-full">
                {label && (
                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-primary)]">
                        {label}
                        {rest.required && <span className="text-[var(--error-500)] ml-1">*</span>}
                    </label>
                )}

                <div className="relative group">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary-500)] transition-colors pointer-events-none">
                            {leftIcon}
                        </div>
                    )}
                    <select
                        ref={ref}
                        className={`${baseSelectStyles} ${borderStyles} ${paddingStyles} ${className}`}
                        {...rest}
                    >
                        <option value="" disabled>
                            {placeholder}
                        </option>
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                        <ChevronDown size={18} />
                    </div>
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

Select.displayName = 'Select'

export { Select }
export type { SelectProps, SelectOption }
