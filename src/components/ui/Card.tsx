'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'elevated'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            children,
            variant = 'default',
            padding = 'md',
            hover = false,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = 'rounded-xl bg-white'

        const variants = {
            default: 'shadow-[var(--shadow-sm)] border border-[var(--border-light)]',
            bordered: 'border border-[var(--border-default)]',
            elevated: 'shadow-[var(--shadow-md)]',
        }

        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        }

        const hoverStyles = hover
            ? 'transition-all duration-200 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 cursor-pointer'
            : ''

        const Component = hover ? motion.div : 'div'

        return (
            <Component
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
                {...(hover ? { whileHover: { y: -2 } } : {})}
                {...(props as any)}
            >
                {children}
            </Component>
        )
    }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> { }

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ children, className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`flex items-center justify-between mb-4 ${className}`}
            {...props}
        >
            {children}
        </div>
    )
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> { }

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ children, className = '', ...props }, ref) => (
        <h3
            ref={ref}
            className={`text-lg font-semibold text-[var(--text-primary)] ${className}`}
            {...props}
        >
            {children}
        </h3>
    )
)

CardTitle.displayName = 'CardTitle'

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> { }

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ children, className = '', ...props }, ref) => (
        <p
            ref={ref}
            className={`text-sm text-[var(--text-secondary)] ${className}`}
            {...props}
        >
            {children}
        </p>
    )
)

CardDescription.displayName = 'CardDescription'

interface CardContentProps extends HTMLAttributes<HTMLDivElement> { }

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
    ({ children, className = '', ...props }, ref) => (
        <div ref={ref} className={className} {...props}>
            {children}
        </div>
    )
)

CardContent.displayName = 'CardContent'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> { }

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
    ({ children, className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-light)] ${className}`}
            {...props}
        >
            {children}
        </div>
    )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export type { CardProps }
