import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { validateSessionInDb, canCreateTickets, canEditTickets } from '@/lib/auth'
import type { ApiResponse, Ticket } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - List all tickets with filters
export async function GET(request: NextRequest) {
    try {
        const session = await validateSessionInDb()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const actionSubtype = searchParams.get('action_subtype')
        const stageId = searchParams.get('stage_id')
        const stageIds = searchParams.get('stage_ids') // comma-separated list of stage IDs
        const doctorId = searchParams.get('doctor_id')
        const hospitalId = searchParams.get('hospital_id')
        const serviceTypeId = searchParams.get('service_type_id')
        const city = searchParams.get('city')
        const assignedTo = searchParams.get('assigned_to')
        const search = searchParams.get('search')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const rawReportStart = searchParams.get('raw_report_start')
        const rawReportEnd = searchParams.get('raw_report_end')
        const includeClosed = searchParams.get('include_closed') === 'true'
        const onlyClosed = searchParams.get('only_closed') === 'true'
        const onlyCancelled = searchParams.get('only_cancelled') === 'true'
        const includeCancelled = searchParams.get('include_cancelled') === 'true'
        const limit = parseInt(searchParams.get('limit') || '10000')
        const offset = parseInt(searchParams.get('offset') || '0')

        const supabase = createServiceClient()

        // Use the searchable view instead of the raw table to allow cross-table search
        let query = supabase
            .from('tickets_search_view')
            .select(`
                *,
                doctor:doctors(*),
                hospital:hospitals(*),
                current_stage:workflow_stages!tickets_current_stage_id_fkey(*),
                assigned_user:users!tickets_assigned_to_fkey(id, username, full_name, role),
                creator:users!tickets_created_by_fkey(id, username, full_name, role),
                service_type:service_types(*),
                diagnostics:ticket_diagnostics(*, service_type:service_types(*), lab:labs(*)),
                custom_values:ticket_custom_values(*, column:custom_columns(*))
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply filters
        if (type) {
            query = query.eq('type', type)
        }
        if (actionSubtype) {
            query = query.eq('action_subtype', actionSubtype)
        }
        if (serviceTypeId) {
            query = query.eq('service_type_id', serviceTypeId)
        }
        if (stageId) {
            query = query.eq('current_stage_id', stageId)
        }
        if (stageIds) {
            const ids = stageIds.split(',').map(id => id.trim()).filter(Boolean)
            if (ids.length > 0) query = query.in('current_stage_id', ids)
        }
        if (doctorId) {
            query = query.eq('doctor_id', doctorId)
        }
        if (hospitalId) {
            query = query.eq('hospital_id', hospitalId)
        }
        if (city) {
            const { data: cityHospitals } = await supabase
                .from('hospitals')
                .select('id')
                .eq('city', city)
            if (cityHospitals?.length) {
                query = query.in('hospital_id', cityHospitals.map(h => h.id))
            } else {
                query = query.in('hospital_id', ['00000000-0000-0000-0000-000000000000'])
            }
        }
        if (assignedTo) {
            query = query.eq('assigned_to', assignedTo)
        }
        if (startDate) {
            query = query.gte('created_at', `${startDate}T00:00:00Z`)
        }
        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59Z`)
        }
        if (rawReportStart) {
            query = query.gte('status_report_received_at', `${rawReportStart}T00:00:00Z`)
        }
        if (rawReportEnd) {
            query = query.lte('status_report_received_at', `${rawReportEnd}T23:59:59Z`)
        }
        if (search) {
            // Escape special characters for PostgREST OR syntax
            const s = search.replace(/,/g, '\\,')
            const searchPattern = `%${s}%`

            // Search across: Ticket ID, Message, Both Patient Names, Collection Address, Doctor Name, Hospital Name, Service Name, Label Codes
            query = query.or(
                `uid.ilike.${searchPattern},` +
                `label_code.ilike.${searchPattern},` +
                `original_message.ilike.${searchPattern},` +
                `patient_name.ilike.${searchPattern},` +
                `patient_name_2.ilike.${searchPattern},` +
                `collection_address.ilike.${searchPattern},` +
                `doctor_name.ilike.${searchPattern},` +
                `hospital_name.ilike.${searchPattern},` +
                `service_type_name.ilike.${searchPattern},` +
                `diagnostic_label_codes.ilike.${searchPattern}`
            )
        }

        // For field executives, only show assigned tickets
        if (session.role === 'field_executive') {
            query = query.eq('assigned_to', session.id)
        }

        // Get the "cancelled" stage ID (search for both correct and common misspelled version from seed)
        const { data: cancelledStage } = await supabase
            .from('workflow_stages')
            .select('id')
            .or('name.ilike.cancelled,name.ilike.cancelleed')
            .eq('is_active', true)
            .maybeSingle()

        // Filter for cancelled tickets
        if (onlyCancelled) {
            if (cancelledStage) {
                query = query.or(`is_cancelled.eq.true,current_stage_id.eq.${cancelledStage.id}`)
            } else {
                query = query.eq('is_cancelled', true)
            }
        } else if (!includeCancelled) {
            // Exclude cancelled tickets
            query = query.or('is_cancelled.eq.false,is_cancelled.is.null')
            if (cancelledStage) {
                query = query.neq('current_stage_id', cancelledStage.id)
            }
        }

        // Get the "Submitted and closed" stage ID for filtering
        const { data: closedStage } = await supabase
            .from('workflow_stages')
            .select('id')
            .ilike('name', 'submitted and closed')
            .eq('is_active', true)
            .maybeSingle()

        // Filter closed tickets based on parameters
        if (onlyClosed) {
            // Only show tickets in "Submitted and closed" stage
            if (closedStage) {
                query = query.eq('current_stage_id', closedStage.id)
            } else {
                // If stage doesn't exist, return empty array
                return NextResponse.json({
                    success: true,
                    data: [],
                    total: 0,
                })
            }
        } else if (!includeClosed && closedStage) {
            // Exclude closed tickets by default (unless explicitly included)
            query = query.neq('current_stage_id', closedStage.id)
        }

        const { data: tickets, error, count } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: tickets,
            total: count,
        })
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch tickets' },
            { status: 500 }
        )
    }
}

// POST - Create a new ticket
export async function POST(request: NextRequest) {
    try {
        const session = await validateSessionInDb()
        if (!session || !canCreateTickets(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const {
            type,
            original_message,
            screenshot_url, // NEW: WhatsApp screenshot URL
            action_subtype,
            query_category,
            patient_name,
            patient_name_2,
            patient_age_1,
            patient_age_2,
            doctor_id,
            hospital_id,
            service_type_id,
            service_type_ids, // Multiple diagnostics
            scheduled_date,
            scheduled_time
        } = body


        // Validate: must have type
        if (!type) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket type is required' },
                { status: 400 }
            )
        }

        // Validate: must have either screenshot_url OR original_message (except for query tickets)
        if (type !== 'query' && !screenshot_url && !original_message) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Either a screenshot or message is required' },
                { status: 400 }
            )
        }

        // For query tickets, hospital is required
        if (type === 'query' && !hospital_id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Hospital is required for query tickets' },
                { status: 400 }
            )
        }

        // For action tickets, hospital is required
        if (type === 'action' && !hospital_id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Hospital is required' },
                { status: 400 }
            )
        }

        // For info tickets, hospital is required
        if (type === 'info' && !hospital_id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Hospital is required for info tickets' },
                { status: 400 }
            )
        }

        // For query tickets, at least one patient name is required
        if (type === 'query' && !patient_name?.trim() && !patient_name_2?.trim()) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'At least one patient name is required for query tickets' },
                { status: 400 }
            )
        }

        const validTypes = ['action', 'query', 'info']
        if (!validTypes.includes(type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid ticket type' },
                { status: 400 }
            )
        }

        // Validate action_subtype if ticket type is 'action'
        if (type === 'action' && !action_subtype) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Action subtype is required for action tickets' },
                { status: 400 }
            )
        }

        if (action_subtype && !['diagnostics', 'therapeutics'].includes(action_subtype)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid action subtype' },
                { status: 400 }
            )
        }

        // Validate query_category if ticket type is 'query'
        if (type === 'query' && !query_category) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Query category is required for query tickets' },
                { status: 400 }
            )
        }

        if (query_category && !['report_related', 'scientific', 'billing_related', 'others'].includes(query_category)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid query category' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Verify hospital exists
        const { data: hospitalExists, error: hospitalSearchError } = await supabase
            .from('hospitals')
            .select('id')
            .eq('id', hospital_id)
            .single()

        if (hospitalSearchError || !hospitalExists) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Selected hospital not found' },
                { status: 404 }
            )
        }

        // Get the default stage (first active stage)
        const { data: defaultStage } = await supabase
            .from('workflow_stages')
            .select('id')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(1)
            .single()

        // For multi-diagnostic tickets, don't set service_type_id on the ticket itself
        const isMultiDiagnostic = action_subtype === 'diagnostics' && Array.isArray(service_type_ids) && service_type_ids.length > 0
        const ticketServiceTypeId = isMultiDiagnostic ? null : (service_type_id || null)

        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert({
                type,
                original_message: original_message || null,
                screenshot_url: screenshot_url || null,
                action_subtype: action_subtype || null,
                query_category: query_category || null,
                patient_name: patient_name || null,
                patient_name_2: patient_name_2 || null,
                patient_age_1: patient_age_1 ? parseInt(patient_age_1) : null,
                patient_age_2: patient_age_2 ? parseInt(patient_age_2) : null,
                doctor_id: doctor_id || null,
                hospital_id: hospital_id || null,
                service_type_id: ticketServiceTypeId,
                current_stage_id: defaultStage?.id || null,
                scheduled_date: scheduled_date || null,
                scheduled_time: scheduled_time || null,
                created_by: session.id,
            })
            .select(`
        *,
        doctor:doctors(*),
        hospital:hospitals(*),
        current_stage:workflow_stages!tickets_current_stage_id_fkey(*),
        service_type:service_types(*)
      `)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        // Create ticket_diagnostics rows for multi-diagnostic tickets
        if (isMultiDiagnostic) {
            const diagnosticRows = service_type_ids.map((stId: string) => ({
                ticket_id: ticket.id,
                service_type_id: stId,
                status: 'pending',
            }))

            const { error: diagError } = await supabase
                .from('ticket_diagnostics')
                .insert(diagnosticRows)

            if (diagError) {
                console.error('Error creating diagnostics:', diagError)
                // Delete the ticket since diagnostics failed — don't leave orphaned tickets
                await supabase.from('tickets').delete().eq('id', ticket.id)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Failed to create diagnostic entries. Please ensure the database migration has been applied.' },
                    { status: 500 }
                )
            }
        }

        // Re-fetch with diagnostics included
        const { data: fullTicket } = await supabase
            .from('tickets')
            .select(`
                *,
                doctor:doctors(*),
                hospital:hospitals(*),
                current_stage:workflow_stages!tickets_current_stage_id_fkey(*),
                service_type:service_types(*),
                diagnostics:ticket_diagnostics(*, service_type:service_types(*))
            `)
            .eq('id', ticket.id)
            .single()

        return NextResponse.json<ApiResponse<Ticket>>({
            success: true,
            data: fullTicket || ticket,
            message: `Ticket ${ticket.uid} created successfully`,
        })
    } catch (error) {
        console.error('Error creating ticket:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create ticket' },
            { status: 500 }
        )
    }
}
