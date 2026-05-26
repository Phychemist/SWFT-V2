import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Lab } from '@/lib/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Get single diagnostic center by ID
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
            .from('labs')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Diagnostic center not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<ApiResponse<Lab>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching diagnostic center:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch diagnostic center' },
            { status: 500 }
        )
    }
}

// PATCH - Update diagnostic center
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
        const { name, address, city, is_active } = body

        const supabase = createServiceClient()

        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (address !== undefined) updateData.address = address || null
        if (city !== undefined) updateData.city = city || null
        if (is_active !== undefined) updateData.is_active = is_active
        // updateData.updated_at = new Date().toISOString() // DB column likely missing

        const { data, error } = await supabase
            .from('labs')
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

        return NextResponse.json<ApiResponse<Lab>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error updating diagnostic center:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update diagnostic center' },
            { status: 500 }
        )
    }
}

// DELETE - Delete diagnostic center (soft delete by setting is_active to false)
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
            .from('labs')
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
            message: 'Diagnostic center deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting diagnostic center:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete diagnostic center' },
            { status: 500 }
        )
    }
}
