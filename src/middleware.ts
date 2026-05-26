import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'seragen_session'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login']

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
    '/settings/users': ['admin', 'manager'], // User management - admin & manager (must be before /settings)
    '/settings': ['admin', 'manager'],
    '/users': ['admin'],
    '/api/users': ['admin', 'manager'], // managers can view users for assignment
    '/backoffice': ['officer_backoffice'], // Backoffice dashboard - only for backoffice officers
    '/field-executive': ['field_executive'], // Field executive dashboard
    '/dashboard': ['admin', 'manager', 'customer_success'], // Exclude backoffice and field executive
    '/tickets': ['admin', 'manager', 'customer_success'], // Exclude backoffice and field executive
}

// Read-only routes that all authenticated users can access (write is controlled in API)
const readOnlyApiRoutes = ['/api/workflow-stages', '/api/custom-columns']

function decodeSession(token: string): { role: string; expiresAt: number } | null {
    try {
        const data = JSON.parse(Buffer.from(token, 'base64').toString())
        if (data.expiresAt < Date.now()) {
            return null
        }
        return data
    } catch {
        return null
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if it's a public route
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Get session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

    // If no session and trying to access protected route, redirect to login
    if (!sessionCookie) {
        // For API routes, return 401 with cache-control
        if (pathname.startsWith('/api/')) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
            response.headers.set('Pragma', 'no-cache')
            response.headers.set('Expires', '0')
            return response
        }
        // For pages, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Decode session for initial check (fast)
    const session = decodeSession(sessionCookie.value)
    if (!session) {
        // Session is invalid or expired
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete(SESSION_COOKIE_NAME)
        return response
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!allowedRoles.includes(session.role)) {
                if (pathname.startsWith('/api/')) {
                    const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
                    response.headers.set('Pragma', 'no-cache')
                    response.headers.set('Expires', '0')
                    return response
                }
                // Redirect to root which handles smart redirection
                return NextResponse.redirect(new URL('/', request.url))
            }
        }
    }

    // For API routes, add cache-control headers to prevent caching sensitive data
    if (pathname.startsWith('/api/')) {
        const response = NextResponse.next()
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
