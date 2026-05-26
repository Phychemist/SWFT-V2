import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Doctor } from '@/lib/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Get single doctor by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('doctors')
            .select(`*, hospital:hospitals(*)`)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Doctor not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<ApiResponse<Doctor>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching doctor:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch doctor' },
            { status: 500 }
        )
    }
}

// PATCH - Update doctor
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and manager can update
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, phone, hospital_id, is_active } = body

        const supabase = createServiceClient()

        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (phone !== undefined) updateData.phone = phone || null
        if (hospital_id !== undefined) updateData.hospital_id = hospital_id
        if (is_active !== undefined) updateData.is_active = is_active
        // updateData.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('doctors')
            .update(updateData)
            .eq('id', id)
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
            data,
        })
    } catch (error) {
        console.error('Error updating doctor:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update doctor' },
            { status: 500 }
        )
    }
}

// DELETE - Delete doctor (soft delete by setting is_active to false)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and manager can delete
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const supabase = createServiceClient()

        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('doctors')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<null>>({
            success: true,
            message: 'Doctor deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting doctor:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete doctor' },
            { status: 500 }
        )
    }
}
