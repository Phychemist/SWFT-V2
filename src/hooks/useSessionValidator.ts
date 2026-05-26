'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SessionUser {
    id: string
    username: string
    full_name: string
    role: string
}

/**
 * Hook to validate session and detect when a different user logs in.
 * This prevents the issue where logging in as a different user in a new tab
 * affects all open tabs.
 */
export function useSessionValidator(currentUser: SessionUser | null) {
    const router = useRouter()
    const initialUserIdRef = useRef<string | null>(null)
    const isCheckingRef = useRef(false)

    // Store the initial user ID when the component mounts
    useEffect(() => {
        if (currentUser && !initialUserIdRef.current) {
            initialUserIdRef.current = currentUser.id
        }
    }, [currentUser])

    const checkSession = useCallback(async () => {
        // Prevent concurrent checks
        if (isCheckingRef.current) return
        isCheckingRef.current = true

        try {
            const response = await fetch('/api/auth/me')
            const result = await response.json()

            if (result.success && result.data) {
                const sessionUserId = result.data.id

                // If we had an initial user and the session user is different, reload
                if (initialUserIdRef.current && sessionUserId !== initialUserIdRef.current) {
                    console.warn('Session changed to a different user. Refreshing page...')
                    // Force a hard refresh to get the correct session data
                    window.location.reload()
                }
            } else if (!result.success || !result.data) {
                // Session expired or user logged out
                if (initialUserIdRef.current) {
                    console.warn('Session expired or logged out. Redirecting to login...')
                    router.push('/login')
                }
            }
        } catch (error) {
            console.error('Session check failed:', error)
        } finally {
            isCheckingRef.current = false
        }
    }, [router])

    useEffect(() => {
        // Check session when tab becomes visible (user switches back to this tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession()
            }
        }

        // Check session when window gains focus
        const handleFocus = () => {
            checkSession()
        }

        // Check session periodically (every 30 seconds)
        const intervalId = setInterval(checkSession, 30000)

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
            clearInterval(intervalId)
        }
    }, [checkSession])

    return { checkSession }
}
