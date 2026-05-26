'use client'

import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    (props, ref) => {
        const {
            label,
            error,
            hint,
            leftIcon,
            rightIcon,
            type = 'text',
            className = '',
            ...rest
        } = props

        const [showPassword, setShowPassword] = useState(false)
        const isPassword = type === 'password'
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

        const baseInputStyles = `
      w-full px-4 py-2.5
      bg-white border rounded-lg
      text-[var(--text-primary)]
      placeholder:text-[var(--text-muted)]
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent
      disabled:bg-[var(--gray-50)] disabled:cursor-not-allowed disabled:text-[var(--gray-400)]
    `

        const borderStyles = error
            ? 'border-[var(--error-500)] focus:ring-[var(--error-500)]'
            : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'

        const paddingStyles = `
      ${leftIcon ? 'pl-11' : ''}
      ${rightIcon || isPassword ? 'pr-11' : ''}
    `

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
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary-500)] transition-colors pointer-events-none">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        type={inputType}
                        className={`${baseInputStyles} ${borderStyles} ${paddingStyles} ${className}`}
                        {...rest}
                    />

                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}

                    {rightIcon && !isPassword && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {rightIcon}
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

Input.displayName = 'Input'

export { Input }
export type { InputProps }
