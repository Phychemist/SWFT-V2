import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, ServiceType } from '@/lib/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Get single service type by ID
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
            .from('service_types')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Service type not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<ApiResponse<ServiceType>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching service type:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch service type' },
            { status: 500 }
        )
    }
}

// PATCH - Update service type
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
        const { name, kit, requirements, protocol, patient_type, is_active, sort_order } = body

        const supabase = createServiceClient()

        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (kit !== undefined) updateData.kit = kit || null
        if (requirements !== undefined) updateData.requirements = requirements || null
        if (protocol !== undefined) updateData.protocol = protocol || null
        if (patient_type !== undefined) updateData.patient_type = patient_type
        if (is_active !== undefined) updateData.is_active = is_active
        if (sort_order !== undefined) updateData.sort_order = sort_order

        const { data, error } = await supabase
            .from('service_types')
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

        return NextResponse.json<ApiResponse<ServiceType>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error updating service type:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update service type' },
            { status: 500 }
        )
    }
}

// DELETE - Delete service type
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

        const { error } = await supabase
            .from('service_types')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<null>>({
            success: true,
            message: 'Service type deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting service type:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete service type' },
            { status: 500 }
        )
    }
}
