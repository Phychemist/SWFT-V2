import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canChangeTicketStatus, isFieldExecutive, isOfficerBackoffice, canBackofficeChangeToStage, isScientist, canScientistChangeToStage } from '@/lib/auth'
import type { ApiResponse, StatusTransition, WorkflowStage } from '@/lib/types'

// GET - List transitions for a ticket OR for a specific user (history)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const ticketId = searchParams.get('ticket_id')
        const changedBy = searchParams.get('changed_by')
        const toStages = searchParams.get('to_stages') // comma-separated stage names

        // Must have either ticket_id or changed_by
        if (!ticketId && !changedBy) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Either ticket_id or changed_by is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        let query = supabase
            .from('status_transitions')
            .select(`
                *,
                from_stage:workflow_stages!from_stage_id(*),
                to_stage:workflow_stages!to_stage_id(*),
                changer:users!changed_by(id, username, full_name),
                ticket:tickets(id, uid, patient_name, hospital:hospitals(id, name))
            `)
            .order('created_at', { ascending: false })

        // Filter by ticket_id
        if (ticketId) {
            query = query.eq('ticket_id', ticketId)
        }

        // Filter by changed_by user (for history)
        if (changedBy) {
            // Security: users can only fetch their own history
            if (changedBy !== session.id && session.role !== 'admin' && session.role !== 'manager') {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'You can only view your own history' },
                    { status: 403 }
                )
            }
            query = query.eq('changed_by', changedBy)
        }

        const { data: transitions, error } = await query

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        // Filter by to_stages if provided (client can also filter, but server-side is more efficient)
        let filteredTransitions = transitions
        if (toStages && transitions) {
            const stageNames = toStages.split(',').map(s => s.trim().toLowerCase())
            filteredTransitions = transitions.filter((t: any) =>
                t.to_stage?.name && stageNames.includes(t.to_stage.name.toLowerCase())
            )
        }

        return NextResponse.json<ApiResponse<StatusTransition[]>>({
            success: true,
            data: filteredTransitions,
        })
    } catch (error) {
        console.error('Error fetching transitions:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch transitions' },
            { status: 500 }
        )
    }
}

// POST - Create a new status transition
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const {
            ticket_id,
            from_stage_id,
            to_stage_id,
            transition_date,
            field_data
        } = body

        let { transition_time } = body

        if (!ticket_id || !to_stage_id || !transition_date) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // ============================================
        // AUTHORIZATION CHECK (Security Fix)
        // ============================================
        const supabase = createServiceClient()

        // Check if ticket is cancelled
        const { data: ticket, error: ticketFetchError } = await supabase
            .from('tickets')
            .select('assigned_to, is_cancelled')
            .eq('id', ticket_id)
            .single()

        if (ticketFetchError || !ticket) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            )
        }

        if (ticket.is_cancelled) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Cannot change status of a cancelled ticket' },
                { status: 400 }
            )
        }

        // Check if user has permission to change ticket status
        if (!canChangeTicketStatus(session.role)) {
            // If not admin/manager, check if field_executive with ownership
            if (isFieldExecutive(session.role)) {
                // Field executive must own the ticket
                if (ticket.assigned_to !== session.id) {
                    console.warn(`Field executive ${session.id} attempted to change status on unassigned ticket ${ticket_id}`)
                    return NextResponse.json<ApiResponse<null>>(
                        { success: false, error: 'You can only change status on tickets assigned to you' },
                        { status: 403 }
                    )
                }
                // Field executive owns the ticket, allow status change
            } else if (isOfficerBackoffice(session.role)) {
                // Backoffice officer - will validate target stage after fetching it below
            } else if (isScientist(session.role)) {
                // Scientist - will validate target stage after fetching it below
            } else {
                // Not admin, manager, field_executive, backoffice, or scientist - deny access
                console.warn(`User ${session.id} with role ${session.role} attempted unauthorized status change`)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'You do not have permission to change ticket status' },
                    { status: 403 }
                )
            }
        }
        // ============================================

        // Use current time if transition_time is not provided
        if (!transition_time) {
            transition_time = new Date().toTimeString().split(' ')[0].slice(0, 5)
        }



        // 1. Fetch the target stage
        const { data: toStage, error: stageError } = await supabase
            .from('workflow_stages')
            .select('*')
            .eq('id', to_stage_id)
            .single()

        if (stageError || !toStage) {
            console.error('Target stage error:', stageError);
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Target stage not found' },
                { status: 400 }
            )
        }



        // ============================================
        // BACKOFFICE STAGE VALIDATION
        // ============================================
        if (isOfficerBackoffice(session.role)) {
            const stageNameLower = toStage.name.toLowerCase().trim()
            if (!canBackofficeChangeToStage(stageNameLower)) {
                console.warn(`Backoffice officer ${session.id} attempted to change to unauthorized stage: ${toStage.name}`)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: `You can only update status to: Sample Received, Sample Sent To, or Report Received` },
                    { status: 403 }
                )
            }

            // TRF is already uploaded by Field Executive, no need to require it from backoffice

            // Enforce mandatory Raw Report for Report Received
            if (stageNameLower === 'report received' && !field_data?.raw_report_url) {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Raw Report (Final/Lab Report) is required for this status change' },
                    { status: 400 }
                )
            }
        }

        // ============================================
        // SCIENTIST STAGE VALIDATION
        // ============================================
        if (isScientist(session.role)) {
            if (!canScientistChangeToStage(toStage.name)) {
                console.warn(`Scientist ${session.id} attempted to change to unauthorized stage: ${toStage.name}`)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: `You can only update status to: Final Report Generated` },
                    { status: 403 }
                )
            }
        }
        // ============================================

        // ============================================
        // FIELD EXECUTIVE STAGE VALIDATION
        // ============================================
        if (isFieldExecutive(session.role)) {
            const stageNameLower = toStage.name.toLowerCase().trim()
            if (stageNameLower === 'sample collected') {
                // Check if this is a multi-diagnostic ticket
                const { data: diagnostics } = await supabase
                    .from('ticket_diagnostics')
                    .select('id, sample_image_url, courier_image_url, is_cancelled')
                    .eq('ticket_id', ticket_id)

                if (diagnostics && diagnostics.length > 0) {
                    // Multi-diagnostic: fetch service types to check if any are diagnostics (not therapeutics)
                    const { data: diagnosticsWithServiceType } = await supabase
                        .from('ticket_diagnostics')
                        .select('id, sample_image_url, courier_image_url, is_cancelled, service_type_id, service_types!ticket_diagnostics_service_type_id_fkey(category)')
                        .eq('ticket_id', ticket_id)

                    interface DiagnosticWithServiceType {
                        id: string
                        sample_image_url: string | null
                        courier_image_url: string | null
                        is_cancelled: boolean
                        service_type_id: string
                        service_types: { category: string } | { category: string }[] | null
                    }

                    const activeDiags = (diagnosticsWithServiceType as DiagnosticWithServiceType[] || []).filter(d => !d.is_cancelled)

                    // Check if all diagnostics are therapeutics
                    const allTherapeutics = activeDiags.every(d => {
                        const serviceType = d.service_types
                        const category = Array.isArray(serviceType) ? serviceType[0]?.category : serviceType?.category
                        return category === 'therapeutics'
                    })

                    // Validate uploads for active diagnostics
                    const missingSamples = activeDiags.filter((d: any) => !d.sample_image_url)
                    if (missingSamples.length > 0) {
                        return NextResponse.json<ApiResponse<null>>(
                            { success: false, error: `All diagnostics must have a sample image. ${missingSamples.length} diagnostic(s) are missing sample images.` },
                            { status: 400 }
                        )
                    }

                    // Courier is only mandatory for diagnostics (not therapeutics)
                    if (!allTherapeutics) {
                        const missingCouriers = activeDiags.filter((d: any) => !d.courier_image_url)
                        if (missingCouriers.length > 0) {
                            return NextResponse.json<ApiResponse<null>>(
                                { success: false, error: `Diagnostics require courier images. ${missingCouriers.length} diagnostic(s) are missing courier images.` },
                                { status: 400 }
                            )
                        }
                    }

                    // TRF is mandatory for diagnostics, but optional for therapeutics
                    const trfUrls = field_data?.trf_image_urls || []
                    if (!allTherapeutics && (!Array.isArray(trfUrls) || trfUrls.length === 0)) {
                        return NextResponse.json<ApiResponse<null>>(
                            { success: false, error: 'At least one TRF form image is required' },
                            { status: 400 }
                        )
                    }

                    // Bulk-update all active diagnostic statuses to sample_collected
                    await supabase
                        .from('ticket_diagnostics')
                        .update({ status: 'sample_collected', updated_at: new Date().toISOString() })
                        .eq('ticket_id', ticket_id)
                        .eq('is_cancelled', false)
                } else {
                    // Single diagnostic (legacy) - validate based on service type
                    // Check if this ticket is for therapeutics
                    const { data: ticketData } = await supabase
                        .from('tickets')
                        .select('service_type_id, service_types!tickets_service_type_id_fkey(category)')
                        .eq('id', ticket_id)
                        .single()

                    const serviceType = ticketData?.service_types as { category: string } | { category: string }[] | null
                    const category = Array.isArray(serviceType) ? serviceType[0]?.category : serviceType?.category
                    const isTherapeutics = category === 'therapeutics'

                    const trfUrls = field_data?.trf_image_urls || []
                    if (!isTherapeutics && (!Array.isArray(trfUrls) || trfUrls.length === 0)) {
                        return NextResponse.json<ApiResponse<null>>(
                            { success: false, error: 'At least one TRF form image is required' },
                            { status: 400 }
                        )
                    }

                    // Sample image is required for both diagnostics and therapeutics
                    if (!field_data?.sample_image_url) {
                        return NextResponse.json<ApiResponse<null>>(
                            { success: false, error: 'Sample image is required' },
                            { status: 400 }
                        )
                    }

                    // Courier details image is only required for diagnostics
                    if (!isTherapeutics && !field_data?.courier_image_url) {
                        return NextResponse.json<ApiResponse<null>>(
                            { success: false, error: 'Courier details image is required' },
                            { status: 400 }
                        )
                    }
                }
            }
        }
        // ============================================

        // 2. Insert the transition record

        const { data: transitions, error: transitionError } = await supabase
            .from('status_transitions')
            .insert({
                ticket_id,
                from_stage_id: from_stage_id || null,
                to_stage_id,
                transition_date,
                transition_time: transition_time || null,
                field_data: field_data || {},
                changed_by: session.id,
            })
            .select(`*`)

        if (transitionError) {
            console.error('Transition insertion error:', transitionError);
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: transitionError.message },
                { status: 500 }
            )
        }

        if (!transitions || transitions.length === 0) {
            console.error('No transition data returned');
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Failed to create transition' },
                { status: 500 }
            )
        }

        const transition = transitions[0]


        // 3. Update the ticket's current_stage_id and system status fields
        const ticketUpdates: Record<string, any> = {
            current_stage_id: to_stage_id,
            updated_at: new Date().toISOString(),
        }



        // Handle system fields based on modal data
        if (field_data?.assigned_to) {
            ticketUpdates.assigned_to = field_data.assigned_to
        }
        if (field_data?.lab_id) {
            ticketUpdates.sent_to_lab_id = field_data.lab_id
        }
        // Handle TRF image URL (from Sample Received status change)
        if (field_data?.trf_image_url) {
            ticketUpdates.trf_image_url = field_data.trf_image_url
        }
        // Handle multiple TRF image URLs
        if (field_data?.trf_image_urls && Array.isArray(field_data.trf_image_urls)) {
            ticketUpdates.trf_image_urls = field_data.trf_image_urls
        }
        // Handle Raw Report URL (from Report Received status change)
        if (field_data?.raw_report_url) {
            ticketUpdates.raw_report_url = field_data.raw_report_url
        }
        // Handle Final Report URL (from Final Report Generated status change)
        if (field_data?.final_report_url) {
            ticketUpdates.final_report_url = field_data.final_report_url
        }
        // Handle Field Executive images
        if (field_data?.sample_image_url) {
            ticketUpdates.sample_image_url = field_data.sample_image_url
        }
        if (field_data?.courier_image_url) {
            ticketUpdates.courier_image_url = field_data.courier_image_url
        }
        // Handle Backoffice images (when sending to lab)
        if (field_data?.tagged_sample_image_url) {
            ticketUpdates.tagged_sample_image_url = field_data.tagged_sample_image_url
        }
        if (field_data?.backoffice_courier_image_url) {
            ticketUpdates.backoffice_courier_image_url = field_data.backoffice_courier_image_url
        }
        if (field_data?.label_code) {
            ticketUpdates.label_code = field_data.label_code
        }

        // Construct a full ISO timestamp for the ticket status fields
        const now = new Date()
        const timeParts = transition_time.split(':')
        const transitionDateObj = new Date(transition_date)
        transitionDateObj.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), now.getSeconds(), now.getMilliseconds())
        const transitionDateTime = transitionDateObj.toISOString()

        // Map stage to system timestamp column
        const stageName = (toStage as WorkflowStage).name.toLowerCase()
        if (stageName === 'new') ticketUpdates.status_new_at = transitionDateTime
        else if (stageName === 'sample collected') ticketUpdates.status_sample_collected_at = transitionDateTime
        else if (stageName === 'sample received') ticketUpdates.status_sample_received_at = transitionDateTime
        else if (stageName === 'sample sent to') ticketUpdates.status_sample_sent_at = transitionDateTime
        else if (stageName === 'analyzed') ticketUpdates.status_analyzed_at = transitionDateTime
        else if (stageName === 'report received') ticketUpdates.status_report_received_at = transitionDateTime
        else if (stageName === 'final report generated') ticketUpdates.status_final_report_generated_at = transitionDateTime
        else if (stageName === 'report submission') ticketUpdates.status_report_submitted_at = transitionDateTime

        const { error: ticketUpdateError } = await supabase
            .from('tickets')
            .update(ticketUpdates)
            .eq('id', ticket_id)

        if (ticketUpdateError) {
            console.error('Error updating ticket status:', ticketUpdateError)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Transition created but ticket update failed: ${ticketUpdateError.message}` },
                { status: 500 }
            )
        }

        // ============================================
        // ADMIN/MANAGER: SYNC TICKET DIAGNOSTICS
        // When admin/manager manually changes stage, bulk-update all active
        // ticket_diagnostics status so dashboards behave identically to the normal flow.
        // Raw/final report URLs are NOT bulk-propagated for multi-diagnostic tickets —
        // each diagnostic must have its own report uploaded individually.
        // ============================================
        if (session.role === 'admin' || session.role === 'manager') {
            const { data: activeDiagnostics } = await supabase
                .from('ticket_diagnostics')
                .select('id')
                .eq('ticket_id', ticket_id)
                .eq('is_cancelled', false)

            const isMultiDiagnostic = (activeDiagnostics?.length ?? 0) > 1

            const stageToDiagnosticStatus: Record<string, string> = {
                'sample collected': 'sample_collected',
                'sample received': 'sample_received',
                'sample sent to': 'sent_to_lab',
                'report received': 'raw_report_received',
                'final report generated': 'final_report_generated',
            }

            const targetDiagnosticStatus = stageToDiagnosticStatus[stageName]
            if (targetDiagnosticStatus) {
                const diagnosticUpdates: Record<string, any> = {
                    status: targetDiagnosticStatus,
                    updated_at: new Date().toISOString(),
                }

                // Propagate sample_received_at when marking sample received
                if (targetDiagnosticStatus === 'sample_received') {
                    diagnosticUpdates.sample_received_at = transitionDateTime
                }

                // For single-diagnostic tickets propagate report URLs directly.
                // For multi-diagnostic tickets the modal sends per_diagnostic_raw_reports
                // (an array of {diagnostic_id, raw_report_url}) so each gets its own file.
                if (!isMultiDiagnostic) {
                    if (targetDiagnosticStatus === 'raw_report_received' && field_data?.raw_report_url) {
                        diagnosticUpdates.raw_report_url = field_data.raw_report_url
                    }
                    if (targetDiagnosticStatus === 'final_report_generated' && field_data?.final_report_url) {
                        diagnosticUpdates.final_report_url = field_data.final_report_url
                    }
                }

                // Bulk-update status (and optionally the single-diag URL) for all active diagnostics
                await supabase
                    .from('ticket_diagnostics')
                    .update(diagnosticUpdates)
                    .eq('ticket_id', ticket_id)
                    .eq('is_cancelled', false)

                // Per-diagnostic raw report URLs — applied individually after the bulk status update
                if (isMultiDiagnostic && targetDiagnosticStatus === 'raw_report_received') {
                    const perReports: { diagnostic_id: string; raw_report_url: string }[] =
                        field_data?.per_diagnostic_raw_reports ?? []

                    for (const entry of perReports) {
                        if (!entry.diagnostic_id || !entry.raw_report_url) continue
                        await supabase
                            .from('ticket_diagnostics')
                            .update({ raw_report_url: entry.raw_report_url, updated_at: new Date().toISOString() })
                            .eq('id', entry.diagnostic_id)
                            .eq('ticket_id', ticket_id) // safety guard
                    }
                }
            }
        }
        // ============================================

        return NextResponse.json<ApiResponse<StatusTransition>>({
            success: true,
            data: transition,
            message: 'Status updated successfully',
        })
    } catch (error: any) {
        console.error('Unhandled status transition error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error.message || 'An unhandled error occurred' },
            { status: 500 }
        )
    }
}
