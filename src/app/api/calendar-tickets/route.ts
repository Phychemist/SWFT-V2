import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export interface CalendarTicket {
    id: string
    uid: string
    scheduled_date: string
    scheduled_time: string | null
    patient_name: string | null
    hospital_name: string | null
    city: string | null
    assigned_user_id: string | null
    assigned_user_name: string | null
    stage_name: string | null
    stage_color: string | null
    service_type_name: string | null
    collection_location: string | null
    collection_address: string | null
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const allowedRoles = ['admin', 'manager', 'customer_success']
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to view calendar data' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const assignedTo = searchParams.get('assigned_to')
        const city = searchParams.get('city')
        const stageId = searchParams.get('stage_id')

        if (!startDate || !endDate) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'start_date and end_date are required (YYYY-MM-DD)' },
                { status: 400 }
            )
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Only show tickets in FE-active stages (sort_order < "Sample Collected")
        // This matches the field-executive dashboard logic
        const { data: stages } = await supabase
            .from('workflow_stages')
            .select('id, name, sort_order')
            .eq('is_active', true)

        const sampleCollectedStage = stages?.find(s => s.name.toLowerCase().trim() === 'sample collected')
        const cutoffSortOrder = sampleCollectedStage?.sort_order ?? 2

        // FE-active stage IDs: stages before "Sample Collected"
        const feActiveStageIds = (stages || [])
            .filter(s => s.sort_order < cutoffSortOrder)
            .map(s => s.id)

        let query = supabase
            .from('tickets')
            .select(`
                id,
                uid,
                scheduled_date,
                scheduled_time,
                patient_name,
                collection_location,
                collection_address,
                hospital:hospitals(name, city),
                assigned_user:users!tickets_assigned_to_fkey(id, full_name),
                current_stage:workflow_stages!tickets_current_stage_id_fkey(name, color),
                service_type:service_types(name)
            `)
            .not('scheduled_date', 'is', null)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate)
            .or('is_cancelled.eq.false,is_cancelled.is.null')
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true, nullsFirst: false })
            .limit(500)

        // Filter to only FE-active stages (unless a specific stage filter is applied)
        if (stageId) {
            query = query.eq('current_stage_id', stageId)
        } else if (feActiveStageIds.length > 0) {
            query = query.in('current_stage_id', feActiveStageIds)
        }

        if (assignedTo) {
            query = query.eq('assigned_to', assignedTo)
        }

        if (city) {
            const { data: cityHospitals } = await supabase
                .from('hospitals')
                .select('id')
                .eq('city', city)
            if (cityHospitals?.length) {
                query = query.in('hospital_id', cityHospitals.map(h => h.id))
            } else {
                return NextResponse.json({
                    success: true,
                    data: [],
                })
            }
        }

        const { data: tickets, error } = await query

        if (error) {
            console.error('Error fetching calendar tickets:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        const calendarTickets: CalendarTicket[] = (tickets || []).map((t: any) => ({
            id: t.id,
            uid: t.uid,
            scheduled_date: t.scheduled_date,
            scheduled_time: t.scheduled_time,
            patient_name: t.patient_name,
            hospital_name: t.hospital?.name || null,
            city: t.hospital?.city || null,
            assigned_user_id: t.assigned_user?.id || null,
            assigned_user_name: t.assigned_user?.full_name || null,
            stage_name: t.current_stage?.name || null,
            stage_color: t.current_stage?.color || null,
            service_type_name: t.service_type?.name || null,
            collection_location: t.collection_location,
            collection_address: t.collection_address,
        }))

        return NextResponse.json({
            success: true,
            data: calendarTickets,
        })
    } catch (error) {
        console.error('Error in calendar-tickets:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch calendar tickets' },
            { status: 500 }
        )
    }
}
