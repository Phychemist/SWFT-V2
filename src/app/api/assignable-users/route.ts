import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, User } from '@/lib/types'

// GET - List assignable users (field executives, etc.)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')

        const supabase = createServiceClient()

        let query = supabase
            .from('users')
            .select('*')
            .eq('is_active', true)
            .order('full_name', { ascending: true })

        if (role) {
            query = query.eq('role', role)
        }

        const { data: users, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<User[]>>({
            success: true,
            data: users,
        })
    } catch (error) {
        console.error('Error fetching assignable users:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}
