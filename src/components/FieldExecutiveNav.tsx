'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, LogOut } from 'lucide-react'

export function FieldExecutiveNav() {
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/login'
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border-light)] px-6 py-3 flex justify-around items-center z-500 safe-area-bottom">
            <Link href="/field-executive" className="flex flex-col items-center gap-1 text-[var(--primary-600)]">
                <div className="p-1 rounded-lg bg-[var(--primary-50)]">
                    <LayoutDashboard size={20} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Dashboard</span>
            </Link>
            <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 text-[var(--text-muted)]"
            >
                <div className="p-1">
                    <LogOut size={20} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Logout</span>
            </button>
        </nav>
    )
}
