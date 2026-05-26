import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Hospital } from '@/lib/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Get single hospital by ID
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
            .from('hospitals')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Hospital not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<ApiResponse<Hospital>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching hospital:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch hospital' },
            { status: 500 }
        )
    }
}

// PATCH - Update hospital
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
        const { name, address, city, location, contact, is_active } = body

        const supabase = createServiceClient()

        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (address !== undefined) updateData.address = address || null
        if (city !== undefined) updateData.city = city || null
        if (location !== undefined) updateData.location = location || null
        if (contact !== undefined) updateData.contact = contact || null
        if (is_active !== undefined) updateData.is_active = is_active
        // updateData.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('hospitals')
            .update(updateData)
            .eq('id', id)
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
            data,
        })
    } catch (error) {
        console.error('Error updating hospital:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update hospital' },
            { status: 500 }
        )
    }
}

// DELETE - Delete hospital (soft delete by setting is_active to false)
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
            .from('hospitals')
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
            message: 'Hospital deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting hospital:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete hospital' },
            { status: 500 }
        )
    }
}
