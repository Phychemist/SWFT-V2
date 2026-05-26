import { NextRequest, NextResponse } from 'next/server'
import { validateUser, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password are required' },
                { status: 400 }
            )
        }

        const user = await validateUser(username, password)

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid username or password' },
                { status: 401 }
            )
        }

        await createSession(user)

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'An error occurred during login' },
            { status: 500 }
        )
    }
}
