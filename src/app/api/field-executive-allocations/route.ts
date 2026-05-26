import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

// Interface for allocation response
interface FieldExecutiveAllocation {
    id: string
    uid: string
    scheduled_time: string | null
    patient_name: string | null
    hospital_name: string | null
    current_stage_name: string | null
    current_stage_color: string | null
}

// GET - Fetch tickets assigned to a field executive on a specific date
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin, manager, and customer_success can view allocations
        const allowedRoles = ['admin', 'manager', 'customer_success']
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to view field executive allocations' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('user_id')
        const date = searchParams.get('date')

        if (!userId) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'user_id is required' },
                { status: 400 }
            )
        }

        if (!date) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'date is required (YYYY-MM-DD format)' },
                { status: 400 }
            )
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(date)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Fetch tickets assigned to the field executive on the specified date
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select(`
                id,
                uid,
                scheduled_time,
                patient_name,
                is_cancelled,
                hospital:hospitals(name),
                current_stage:workflow_stages!tickets_current_stage_id_fkey(name, color)
            `)
            .eq('assigned_to', userId)
            .eq('scheduled_date', date)
            .or('is_cancelled.eq.false,is_cancelled.is.null')
            .order('scheduled_time', { ascending: true, nullsFirst: false })

        if (error) {
            console.error('Error fetching field executive allocations:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        // Transform the response to flatten nested objects
        const allocations: FieldExecutiveAllocation[] = (tickets || []).map((ticket: any) => ({
            id: ticket.id,
            uid: ticket.uid,
            scheduled_time: ticket.scheduled_time,
            patient_name: ticket.patient_name,
            hospital_name: ticket.hospital?.name || null,
            current_stage_name: ticket.current_stage?.name || null,
            current_stage_color: ticket.current_stage?.color || null,
        }))

        return NextResponse.json({
            success: true,
            data: allocations,
            count: allocations.length,
        })
    } catch (error) {
        console.error('Error in field-executive-allocations:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch allocations' },
            { status: 500 }
        )
    }
}
