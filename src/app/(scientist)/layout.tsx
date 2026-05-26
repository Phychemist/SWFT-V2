import { redirect } from 'next/navigation'
import { getSession, canAccessScientistDashboard } from '@/lib/auth'
import { Sidebar, Header } from '@/components/layout'
import { SessionProvider } from '@/components/SessionProvider'

export default async function ScientistLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/login')
    }

    // Only scientist can access this layout
    if (!canAccessScientistDashboard(session.role)) {
        redirect('/dashboard')
    }

    return (
        <SessionProvider user={session}>
            <div className="min-h-screen bg-[var(--background)]">
                <Sidebar userRole={session.role} />
                <Header user={session} />

                {/* Main Content */}
                <main className="ml-[var(--sidebar-width)] pt-[var(--header-height)]">
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </SessionProvider>
    )
}
