import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import '@/app/globals.css'
import { getSession } from '@/lib/auth'
import { DashboardShell } from '@/components/layout'
import { FieldExecutiveNav } from '@/components/FieldExecutiveNav'
import { SessionProvider } from '@/components/SessionProvider'

export const metadata: Metadata = {
    title: 'Seragen - Field Executive',
    description: 'Field Executive Portal',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default async function FieldExecutiveLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/login')
    }

    return (
        <SessionProvider user={session}>
            <div className="flex min-h-screen flex-col">
                <DashboardShell user={session}>
                    {children}
                </DashboardShell>
                {/* Mobile Bottom Navigation - Visible only on mobile */}
                <div className="md:hidden">
                    <FieldExecutiveNav />
                </div>
            </div>
        </SessionProvider>
    )
}
