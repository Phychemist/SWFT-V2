import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Lab } from '@/lib/types'

// GET - List all labs
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
        const search = searchParams.get('search')

        const supabase = createServiceClient()

        let query = supabase
            .from('labs')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data: labs, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Lab[]>>({
            success: true,
            data: labs,
        })
    } catch (error) {
        console.error('Error fetching labs:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch labs' },
            { status: 500 }
        )
    }
}

// POST - Create a new diagnostic center (lab)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and manager can create
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, address, city } = body

        if (!name) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Name is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: lab, error } = await supabase
            .from('labs')
            .insert({ name, address, city })
            .select()
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Lab>>({
            success: true,
            data: lab,
        })
    } catch (error) {
        console.error('Error creating diagnostic center:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create diagnostic center' },
            { status: 500 }
        )
    }
}
