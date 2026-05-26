import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, ServiceType } from '@/lib/types'

// GET - Get all service types (optionally filter by category)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createServiceClient()
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        let query = supabase
            .from('service_types')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<ServiceType[]>>({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching service types:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch service types' },
            { status: 500 }
        )
    }
}

// POST - Create new service type
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
        const { category, name, kit, requirements, protocol, patient_type } = body

        if (!category || !name) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Category and name are required' },
                { status: 400 }
            )
        }

        if (!['diagnostics', 'therapeutics'].includes(category)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid category' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Get max sort_order for this category
        const { data: maxOrderData } = await supabase
            .from('service_types')
            .select('sort_order')
            .eq('category', category)
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const nextOrder = (maxOrderData?.sort_order || 0) + 1

        const { data, error } = await supabase
            .from('service_types')
            .insert({
                category,
                name,
                kit: kit || null,
                requirements: requirements || null,
                protocol: protocol || null,
                patient_type: patient_type || 'couple',
                sort_order: nextOrder,
            })
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
        console.error('Error creating service type:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create service type' },
            { status: 500 }
        )
    }
}
