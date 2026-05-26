import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Hospital } from '@/lib/types'

// GET - List all hospitals
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
            .from('hospitals')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data: hospitals, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Hospital[]>>({
            success: true,
            data: hospitals,
        })
    } catch (error) {
        console.error('Error fetching hospitals:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch hospitals' },
            { status: 500 }
        )
    }
}

// POST - Create a new hospital
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and manager can create hospitals
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, address, city, location, contact } = body

        if (!name) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Name is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: hospital, error } = await supabase
            .from('hospitals')
            .insert({ name, address, city, location, contact })
            .select()
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Hospital>>({
            success: true,
            data: hospital,
        })
    } catch (error) {
        console.error('Error creating hospital:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create hospital' },
            { status: 500 }
        )
    }
}
