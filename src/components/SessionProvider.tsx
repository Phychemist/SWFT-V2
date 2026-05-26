'use client'

import { ReactNode } from 'react'
import { useSessionValidator } from '@/hooks/useSessionValidator'
import type { SessionUser } from '@/lib/types'

interface SessionProviderProps {
    user: SessionUser
    children: ReactNode
}

/**
 * Client-side wrapper that validates the session hasn't changed.
 * If another user logs in from a different tab, this will detect it
 * and force a page refresh to show the correct session.
 */
export function SessionProvider({ user, children }: SessionProviderProps) {
    // This hook will monitor for session changes and refresh if needed
    useSessionValidator(user)

    return <>{children}</>
}
