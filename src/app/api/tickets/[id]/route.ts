import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canEditTickets } from '@/lib/auth'
import type { ApiResponse, Ticket } from '@/lib/types'
import { autoCreateConsumptions } from '@/lib/inventory'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Get single ticket by ID
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

        const { data: ticket, error } = await supabase
            .from('tickets')
            .select(`
        *,
        doctor:doctors(*),
        hospital:hospitals(*),
        current_stage:workflow_stages!tickets_current_stage_id_fkey(*),
        assigned_user:users!tickets_assigned_to_fkey(id, username, full_name, role),
        creator:users!tickets_created_by_fkey(id, username, full_name, role),
        service_type:service_types(*),
        lab:labs(*),
        diagnostics:ticket_diagnostics(*, service_type:service_types(*), lab:labs(*)),
        status_transitions(*, to_stage:workflow_stages!status_transitions_to_stage_id_fkey(id, name, color), changer:users!status_transitions_changed_by_fkey(id, full_name)),
        custom_values:ticket_custom_values(*, column:custom_columns(*))
      `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            )
        }

        // Field executives can only view their assigned tickets
        if (session.role === 'field_executive' && ticket.assigned_to !== session.id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json<ApiResponse<Ticket>>({
            success: true,
            data: ticket,
        })
    } catch (error) {
        console.error('Error fetching ticket:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch ticket' },
            { status: 500 }
        )
    }
}

// PATCH - Update ticket
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

        const body = await request.json()
        const { custom_values, add_diagnostic_ids, ...ticketUpdates } = body

        const supabase = createServiceClient()

        // Fetch current ticket state to check cancellation status
        const { data: ticket, error: ticketFetchError } = await supabase
            .from('tickets')
            .select('assigned_to, is_cancelled')
            .eq('id', id)
            .single()

        if (ticketFetchError || !ticket) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            )
        }

        if (ticket.is_cancelled) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Cannot update a cancelled ticket' },
                { status: 400 }
            )
        }

        // Check permissions
        // Admin, Manager, and Customer Success can edit tickets (Metadata)
        // Field Executive has restricted access
        const canEdit =
            session.role === 'admin' ||
            session.role === 'manager' ||
            session.role === 'customer_success'

        if (!canEdit) {
            // Field executives can only update certain fields on their tickets
            if (session.role === 'field_executive') {
                if (ticket.assigned_to !== session.id) {
                    return NextResponse.json<ApiResponse<null>>(
                        { success: false, error: 'Unauthorized' },
                        { status: 403 }
                    )
                }
                // Field executives execution flow continues below to update
            } else {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Unauthorized' },
                    { status: 403 }
                )
            }
        }

        // Update ticket fields if any
        if (Object.keys(ticketUpdates).length > 0) {
            // Convert empty strings to null for foreign key fields and constrained fields
            const cleanedUpdates = { ...ticketUpdates }
            const nullableFields = [
                'current_stage_id',
                'assigned_to',
                'doctor_id',
                'hospital_id',
                'collection_location',
                'collection_address',
                'scheduled_date',
                'scheduled_time',
                'query_category',
                'patient_name_2',
                'patient_age_1',
                'patient_age_2',
                'screenshot_url'
            ]
            for (const field of nullableFields) {
                if (field in cleanedUpdates && cleanedUpdates[field] === '') {
                    cleanedUpdates[field] = null
                }
            }

            // Stage changes MUST go through /api/status-transitions to keep status_transitions
            // and tickets.current_stage_id in sync. Stripping here for all roles prevents
            // direct PATCH calls from silently drifting the stage without a timeline record.
            delete cleanedUpdates.current_stage_id

            // Role-based Field Protection for Customer Success
            if (session.role === 'customer_success') {
                // CS Agents CANNOT update workflow fields
                delete cleanedUpdates.assigned_to
                // They CAN update: patient_name, doctor_id, hospital_id, original_message, type, action_subtype
            }

            // Role-based Field Protection for Field Executive
            if (session.role === 'field_executive') {
                // FE can ONLY update specific fields (stage goes through status-transitions)
                const allowedFeFields = [
                    'collection_location',
                    'collection_address',
                    'trf_image_urls',
                    'sample_image_url',
                    'courier_image_url',
                    'patient_name',
                    'patient_name_2',
                    'patient_age_1',
                    'patient_age_2'
                ]
                Object.keys(cleanedUpdates).forEach(key => {
                    if (!allowedFeFields.includes(key)) {
                        delete cleanedUpdates[key]
                    }
                })
            }

            // Verify hospital exists if provided
            if (cleanedUpdates.hospital_id) {
                const { data: hospitalExists, error: hospitalSearchError } = await supabase
                    .from('hospitals')
                    .select('id')
                    .eq('id', cleanedUpdates.hospital_id)
                    .single()

                if (hospitalSearchError || !hospitalExists) {
                    return NextResponse.json<ApiResponse<null>>(
                        { success: false, error: 'Selected hospital not found' },
                        { status: 404 }
                    )
                }
            }

            const { error: ticketError } = await supabase
                .from('tickets')
                .update(cleanedUpdates)
                .eq('id', id)

            if (ticketError) {
                console.error('Ticket update error:', ticketError)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: ticketError.message },
                    { status: 500 }
                )
            }
        }

        // Update custom values if any
        if (custom_values && typeof custom_values === 'object') {
            for (const [columnId, value] of Object.entries(custom_values)) {
                const { error: valueError } = await supabase
                    .from('ticket_custom_values')
                    .upsert(
                        {
                            ticket_id: id,
                            column_id: columnId,
                            value: value as string,
                        },
                        { onConflict: 'ticket_id,column_id' }
                    )

                if (valueError) {
                    console.error('Error updating custom value:', valueError)
                }
            }
        }

        // Add new diagnostics to existing ticket
        if (add_diagnostic_ids && Array.isArray(add_diagnostic_ids) && add_diagnostic_ids.length > 0) {
            const diagnosticRows = add_diagnostic_ids.map((stId: string) => ({
                ticket_id: id,
                service_type_id: stId,
                status: 'pending',
            }))

            const { error: diagError } = await supabase
                .from('ticket_diagnostics')
                .insert(diagnosticRows)

            if (diagError) {
                console.error('Error adding diagnostics:', diagError)
            }
        }

        // Fetch updated ticket
        const { data: updatedTicket, error } = await supabase
            .from('tickets')
            .select(`
        *,
        doctor:doctors(*),
        hospital:hospitals(*),
        current_stage:workflow_stages!tickets_current_stage_id_fkey(*),
        assigned_user:users!tickets_assigned_to_fkey(id, username, full_name, role),
        creator:users!tickets_created_by_fkey(id, username, full_name, role),
        service_type:service_types(*),
        lab:labs(*),
        diagnostics:ticket_diagnostics(*, service_type:service_types(*), lab:labs(*)),
        status_transitions(*, to_stage:workflow_stages!status_transitions_to_stage_id_fkey(id, name, color), changer:users!status_transitions_changed_by_fkey(id, full_name)),
        custom_values:ticket_custom_values(*, column:custom_columns(*))
      `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        // Trigger auto-consumption if in completed stage
        if (updatedTicket.current_stage?.name.toLowerCase().trim() === 'submitted and closed') {
            await autoCreateConsumptions(id)
        }

        return NextResponse.json<ApiResponse<Ticket>>({
            success: true,
            data: updatedTicket,
        })
    } catch (error) {
        console.error('Error updating ticket:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update ticket' },
            { status: 500 }
        )
    }
}

// DELETE - Delete ticket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getSession()
        if (!session || !canEditTickets(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const supabase = createServiceClient()

        const { error } = await supabase
            .from('tickets')
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
            message: 'Ticket deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete ticket' },
            { status: 500 }
        )
    }
}
