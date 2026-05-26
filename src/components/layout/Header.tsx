'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User, ChevronDown, Menu } from 'lucide-react'
import type { SessionUser } from '@/lib/types'

interface HeaderProps {
    user: SessionUser
    onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
    const router = useRouter()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
            router.refresh()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            setIsLoggingOut(false)
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-700'
            case 'manager':
                return 'bg-blue-100 text-blue-700'
            case 'customer_success':
                return 'bg-green-100 text-green-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    return (
        <header className="fixed top-0 right-0 left-0 md:left-[var(--sidebar-width)] h-[var(--header-height)] bg-white border-b border-[var(--border-light)] flex items-center justify-between px-4 md:px-6 z-30 transition-all duration-300">
            {/* Left: Menu Toggle & Title */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 rounded-lg hover:bg-[var(--gray-50)] text-[var(--text-secondary)] md:hidden"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">Dashboard</h1>
            </div>

            {/* User Menu */}
            <div className="relative">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--gray-50)] transition-colors"
                    suppressHydrationWarning
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center">
                        <User size={18} className="text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{user.full_name}</p>
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {formatRole(user.role)}
                        </span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`text-[var(--text-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                    {isDropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsDropdownOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-[var(--border-light)] overflow-hidden z-50"
                            >
                                <div className="p-2">
                                    <div className="px-3 py-2 sm:hidden border-b border-[var(--border-light)] mb-2">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.full_name}</p>
                                        <p className="text-xs text-[var(--text-muted)] capitalize">{formatRole(user.role)}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--error-600)] hover:bg-[var(--error-50)] rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isLoggingOut ? (
                                            <span className="spinner spinner-sm" />
                                        ) : (
                                            <LogOut size={16} />
                                        )}
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </header>
    )
}
