import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'field_executive') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createServiceClient()

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status') || 'active' // 'active' | 'completed'
        const sortOrder = searchParams.get('sort') || 'asc' // 'asc' (Earliest First - Default) | 'desc' (Latest First)

        // Fetch stages to identify ID and sort_order for filtering
        const { data: stages } = await supabase.from('workflow_stages').select('id, name, sort_order')
        const sampleCollectedStage = stages?.find(s => s.name.toLowerCase().trim() === 'sample collected')
        const sampleCollectedSortOrder = sampleCollectedStage?.sort_order ?? 0

        let query = supabase
            .from('tickets')
            .select(`
                *,
                hospital:hospitals(id, name, address, city),
                doctor:doctors(id, name, phone),
                current_stage:workflow_stages!current_stage_id(*),
                service_type:service_types(id, name, category, kit, requirements, protocol)
            `)
            .eq('assigned_to', session.id)
            .or('is_cancelled.eq.false,is_cancelled.is.null')

        // Apply Status Filtering based on sort_order
        if (sampleCollectedStage) {
            const stageIds = stages || []
            if (status === 'completed') {
                // Completed = Sample Collected or any subsequent stage
                const completedIds = stageIds
                    .filter(s => s.sort_order >= sampleCollectedSortOrder)
                    .map(s => s.id)

                if (completedIds.length > 0) {
                    query = query.in('current_stage_id', completedIds)
                } else {
                    // Fallback to just the sample collected stage if no others found
                    query = query.eq('current_stage_id', sampleCollectedStage.id)
                }
            } else {
                // Active = Any stage before Sample Collected
                const activeIds = stageIds
                    .filter(s => s.sort_order < sampleCollectedSortOrder)
                    .map(s => s.id)

                if (activeIds.length > 0) {
                    query = query.in('current_stage_id', activeIds)
                } else {
                    // Fallback: exclude sample collected stage and any we know are later
                    query = query.neq('current_stage_id', sampleCollectedStage.id)
                }
            }
        }

        // Apply Sorting
        query = query.order('created_at', { ascending: sortOrder === 'asc' })

        const { data: tickets, error } = await query

        if (error) {
            console.error('Error fetching FE tickets:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<any[]>>({
            success: true,
            data: tickets,
        })
    } catch (error) {
        console.error('Unhandled error in FE tickets API:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
