import { NextResponse } from 'next/server'
import { getSession, validateSessionInDb } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await validateSessionInDb()

        if (!session) {
            return NextResponse.json({ success: false, data: null })
        }

        return NextResponse.json({ success: true, data: session })
    } catch (error) {
        console.error('Session check error:', error)
        return NextResponse.json(
            { success: false, error: 'An error occurred' },
            { status: 500 }
        )
    }
}
