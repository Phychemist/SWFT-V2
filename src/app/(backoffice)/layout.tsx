import { redirect } from 'next/navigation'
import { getSession, canAccessBackoffice } from '@/lib/auth'
import { DashboardShell } from '@/components/layout'
import { SessionProvider } from '@/components/SessionProvider'

export default async function BackofficeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/login')
    }

    // Only officer_backoffice can access this layout
    if (!canAccessBackoffice(session.role)) {
        redirect('/dashboard')
    }

    return (
        <SessionProvider user={session}>
            <DashboardShell user={session}>
                {children}
            </DashboardShell>
        </SessionProvider>
    )
}
