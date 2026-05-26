'use client'

import { HTMLAttributes, forwardRef } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
    size?: 'sm' | 'md'
    color?: string // Custom hex color
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    (
        {
            children,
            variant = 'default',
            size = 'md',
            color,
            className = '',
            style,
            ...props
        },
        ref
    ) => {
        const baseStyles = 'inline-flex items-center font-medium rounded-full'

        const variants = {
            default: 'bg-[var(--gray-100)] text-[var(--gray-700)]',
            primary: 'bg-[var(--primary-100)] text-[var(--primary-700)]',
            success: 'bg-[var(--success-50)] text-[var(--success-700)]',
            warning: 'bg-[var(--warning-50)] text-[var(--warning-600)]',
            error: 'bg-[var(--error-50)] text-[var(--error-700)]',
            info: 'bg-[var(--info-50)] text-[var(--info-600)]',
        }

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-xs',
        }

        // If custom color is provided, use it
        const customColorStyles = color
            ? {
                backgroundColor: `${color}20`, // 20 is hex for ~12% opacity
                color: color,
                ...style,
            }
            : style

        const variantClass = color ? '' : variants[variant]

        return (
            <span
                ref={ref}
                className={`${baseStyles} ${variantClass} ${sizes[size]} ${className}`}
                style={customColorStyles}
                {...props}
            >
                {children}
            </span>
        )
    }
)

Badge.displayName = 'Badge'

export { Badge }
export type { BadgeProps }
