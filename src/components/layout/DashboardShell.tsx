'use client'

import { useState } from 'react'
import { Sidebar, Header } from '@/components/layout'
import type { SessionUser } from '@/lib/types'

interface DashboardShellProps {
    children: React.ReactNode
    user: SessionUser
}

export function DashboardShell({ children, user }: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Sidebar
                userRole={user.role}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <Header
                user={user}
                onMenuClick={() => setSidebarOpen(true)}
            />

            {/* Main Content */}
            <main className={`
                pt-[var(--header-height)] 
                transition-all duration-300 ease-in-out
                md:ml-[var(--sidebar-width)]
                $ {sidebarOpen ? 'ml-[var(--sidebar-width)]' : 'ml-0'} 
            `}>
                <div className="p-4 md:p-6">
                    {children}
                </div>
            </main>

            {/* Overlay for mobile when sidebar is open */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    )
}
