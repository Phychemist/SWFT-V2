'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            className = '',
            disabled,
            ...rest
        },
        ref
    ) => {
        const { ...props } = rest as any // for now to keep it simple, but we should be clean
        const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `

        const variants = {
            primary: `
        bg-[var(--primary-600)] text-white
        hover:bg-[var(--primary-700)]
        active:bg-[var(--primary-800)]
        focus-visible:ring-[var(--primary-500)]
      `,
            secondary: `
        bg-[var(--gray-100)] text-[var(--gray-700)]
        hover:bg-[var(--gray-200)]
        active:bg-[var(--gray-300)]
        focus-visible:ring-[var(--gray-400)]
      `,
            danger: `
        bg-[var(--error-600)] text-white
        hover:bg-[var(--error-700)]
        active:bg-red-800
        focus-visible:ring-[var(--error-500)]
      `,
            ghost: `
        bg-transparent text-[var(--gray-600)]
        hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]
        focus-visible:ring-[var(--gray-400)]
      `,
            outline: `
        bg-transparent border border-[var(--border-default)]
        text-[var(--gray-700)]
        hover:bg-[var(--gray-50)] hover:border-[var(--gray-400)]
        focus-visible:ring-[var(--primary-500)]
      `,
        }

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        }

        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...(props as any)}
            >
                {isLoading ? (
                    <>
                        <span className="spinner spinner-sm" />
                        <span>Loading...</span>
                    </>
                ) : (
                    <>
                        {leftIcon}
                        {children}
                        {rightIcon}
                    </>
                )}
            </motion.button>
        )
    }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
