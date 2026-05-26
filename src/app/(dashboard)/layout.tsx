import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DashboardShell } from '@/components/layout'
import { SessionProvider } from '@/components/SessionProvider'

export default async function DashboardLayout({
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
            <DashboardShell user={session}>
                {children}
            </DashboardShell>
        </SessionProvider>
    )
}
