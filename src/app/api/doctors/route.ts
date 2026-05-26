import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Doctor } from '@/lib/types'

// GET - List all doctors
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
        const hospitalId = searchParams.get('hospital_id')
        const search = searchParams.get('search')

        const supabase = createServiceClient()

        let query = supabase
            .from('doctors')
            .select(`*, hospital:hospitals(*)`)
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (hospitalId) {
            query = query.eq('hospital_id', hospitalId)
        }

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data: doctors, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Doctor[]>>({
            success: true,
            data: doctors,
        })
    } catch (error) {
        console.error('Error fetching doctors:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch doctors' },
            { status: 500 }
        )
    }
}

// POST - Create a new doctor
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and manager can create doctors
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, phone, hospital_id } = body

        if (!name) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Name is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: doctor, error } = await supabase
            .from('doctors')
            .insert({ name, phone, hospital_id })
            .select(`*, hospital:hospitals(*)`)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Doctor>>({
            success: true,
            data: doctor,
        })
    } catch (error) {
        console.error('Error creating doctor:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create doctor' },
            { status: 500 }
        )
    }
}
