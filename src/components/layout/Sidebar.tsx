'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Ticket,
    Plus,
    Settings,
    Users,
    Workflow,
    Columns3,
    Building2,
    Stethoscope,
    FlaskConical,
    ClipboardCheck,
    CheckCircle2,
    Upload,
    ClipboardList,
    Ban,
    Wallet,
    Receipt,
    Boxes,
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
    roles: UserRole[]
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard size={20} />,
        roles: ['admin', 'manager', 'customer_success'],
    },
    {
        label: 'All Tickets',
        href: '/tickets',
        icon: <Ticket size={20} />,
        roles: ['admin', 'manager', 'customer_success'],
    },
    {
        label: 'Closed',
        href: '/tickets/closed',
        icon: <CheckCircle2 size={20} />,
        roles: ['admin', 'manager', 'customer_success'],
    },
    {
        label: 'Cancelled',
        href: '/tickets/cancelled',
        icon: <Ban size={20} />,
        roles: ['admin', 'manager', 'customer_success'],
    },
    {
        label: 'Create Ticket',
        href: '/tickets/new',
        icon: <Plus size={20} />,
        roles: ['admin', 'manager', 'customer_success'],
    },
    {
        label: 'My Tasks',
        href: '/backoffice',
        icon: <ClipboardCheck size={20} />,
        roles: ['officer_backoffice'],
    },
    {
        label: 'Inventory',
        href: '/backoffice/inventory',
        icon: <Boxes size={20} />,
        roles: ['officer_backoffice'],
    },
    {
        label: 'Lab Reports',
        href: '/scientist',
        icon: <FlaskConical size={20} />,
        roles: ['scientist'],
    },
    {
        label: 'My Assignments',
        href: '/field-executive',
        icon: <ClipboardList size={20} />,
        roles: ['field_executive'],
    },
    {
        label: 'Completed',
        href: '/field-executive?tab=completed',
        icon: <CheckCircle2 size={20} />,
        roles: ['field_executive'],
    },
    {
        label: 'My Claims',
        href: '/field-executive/claims',
        icon: <Receipt size={20} />,
        roles: ['field_executive'],
    },
    {
        label: 'My Claims',
        href: '/manager/claims',
        icon: <Receipt size={20} />,
        roles: ['manager'],
    },
    // ── Accountant Slices A–F Navigation ──────────────────────────
    {
        label: 'Fund Management',
        href: '/accountant/funds',
        icon: <Wallet size={20} />,
        roles: ['accountant'],
    },
    {
        label: 'Expense Claims',
        href: '/accountant/claims',
        icon: <ClipboardList size={20} />,
        roles: ['accountant'],
    },
    {
        label: 'Hospital Charges',
        href: '/accountant/hospital-charges',
        icon: <Building2 size={20} />,
        roles: ['accountant'],
    },
    {
        label: 'Billing & Invoices',
        href: '/accountant/billing',
        icon: <Receipt size={20} />,
        roles: ['accountant'],
    },
    {
        label: 'Inventory Logs',
        href: '/accountant/inventory',
        icon: <Boxes size={20} />,
        roles: ['accountant'],
    },
]

const settingsItems: NavItem[] = [
    {
        label: 'Doctors',
        href: '/settings/doctors',
        icon: <Stethoscope size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Hospitals',
        href: '/settings/hospitals',
        icon: <Building2 size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Diagnostic Centers',
        href: '/settings/diagnostic-centers',
        icon: <FlaskConical size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Workflow Stages',
        href: '/settings/workflow-stages',
        icon: <Workflow size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Custom Columns',
        href: '/settings/custom-columns',
        icon: <Columns3 size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Service Types',
        href: '/settings/service-types',
        icon: <FlaskConical size={20} />,
        roles: ['admin', 'manager'],
    },
    {
        label: 'Users',
        href: '/settings/users',
        icon: <Users size={20} />,
        roles: ['admin', 'manager'],
    },
]

interface SidebarProps {
    userRole: UserRole
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ userRole, isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname()

    const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))
    const filteredSettingsItems = settingsItems.filter((item) => item.roles.includes(userRole))

    return (
        <aside className={`
            fixed left-0 top-0 h-full w-[var(--sidebar-width)] bg-white border-r border-[var(--border-light)] flex flex-col z-40
            transition-transform duration-300 ease-in-out
            md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {/* Logo */}
            <div className="h-[var(--header-height)] flex items-center justify-between px-6 border-b border-[var(--border-light)]">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
                    <img src="/seragen_logo.png" alt="Seragen" className="h-10 w-auto" />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {/* Main Navigation */}
                <div className="space-y-1">
                    {filteredNavItems.map((item) => {
                        // For exact match routes like /tickets, only match exactly (not subroutes)
                        const isExactMatchRoute = item.href === '/tickets' || item.href === '/field-executive'
                        const isActive = isExactMatchRoute
                            ? pathname === item.href
                            : pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link key={item.href} href={item.href} onClick={onClose}>
                                <motion.div
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors duration-150
                    ${isActive
                                            ? 'bg-[var(--primary-50)] text-[var(--primary-700)]'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)]'
                                        }
                  `}
                                >
                                    <span className={isActive ? 'text-[var(--primary-600)]' : ''}>{item.icon}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>

                {/* Settings Section */}
                {filteredSettingsItems.length > 0 && (
                    <>
                        <div className="mt-8 mb-3 px-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <Settings size={14} />
                                <span>Settings</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {filteredSettingsItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href} onClick={onClose}>
                                        <motion.div
                                            whileHover={{ x: 2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-colors duration-150
                        ${isActive
                                                    ? 'bg-[var(--primary-50)] text-[var(--primary-700)]'
                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--gray-50)] hover:text-[var(--text-primary)]'
                                                }
                      `}
                                        >
                                            <span className={isActive ? 'text-[var(--primary-600)]' : ''}>{item.icon}</span>
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </motion.div>
                                    </Link>
                                )
                            })}
                        </div>
                    </>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-light)]">
                <p className="text-xs text-[var(--text-muted)] text-center">
                    Workflow v1.0
                </p>
            </div>
        </aside>
    )
}
