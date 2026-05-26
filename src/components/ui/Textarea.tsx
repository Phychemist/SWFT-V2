'use client'

import { forwardRef, TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className = '', ...props }, ref) => {
        const baseStyles = `
      w-full px-4 py-3
      bg-white border rounded-lg
      text-[var(--text-primary)]
      placeholder:text-[var(--text-muted)]
      transition-all duration-200
      resize-y min-h-[100px]
      focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent
      disabled:bg-[var(--gray-50)] disabled:cursor-not-allowed disabled:text-[var(--gray-400)]
    `

        const borderStyles = error
            ? 'border-[var(--error-500)] focus:ring-[var(--error-500)]'
            : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'

        return (
            <div className="w-full">
                {label && (
                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-primary)]">
                        {label}
                        {props.required && <span className="text-[var(--error-500)] ml-1">*</span>}
                    </label>
                )}

                <textarea
                    ref={ref}
                    className={`${baseStyles} ${borderStyles} ${className}`}
                    {...props}
                />

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

Textarea.displayName = 'Textarea'

export { Textarea }
export type { TextareaProps }
