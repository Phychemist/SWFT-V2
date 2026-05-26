import type { TicketDiagnostic, DiagnosticStatus, PatientType } from './types'

const STATUS_ORDER: DiagnosticStatus[] = [
    'pending',
    'sample_collected',
    'sample_received',
    'sent_to_lab',
    'raw_report_received',
    'final_report_generated',
]

/**
 * Check if ALL non-cancelled diagnostics have reached or passed a given status.
 * Used to determine if the ticket-level status should advance.
 */
export function allDiagnosticsAtOrPast(
    diagnostics: TicketDiagnostic[],
    targetStatus: DiagnosticStatus
): boolean {
    const targetIndex = STATUS_ORDER.indexOf(targetStatus)
    const active = diagnostics.filter(d => !d.is_cancelled)
    if (active.length === 0) return false
    return active.every(d => STATUS_ORDER.indexOf(d.status) >= targetIndex)
}

/**
 * Check if ANY non-cancelled diagnostic has reached a given status.
 * Used for scientist visibility (any raw report = visible).
 */
export function anyDiagnosticAtOrPast(
    diagnostics: TicketDiagnostic[],
    targetStatus: DiagnosticStatus
): boolean {
    const targetIndex = STATUS_ORDER.indexOf(targetStatus)
    const active = diagnostics.filter(d => !d.is_cancelled)
    return active.some(d => STATUS_ORDER.indexOf(d.status) >= targetIndex)
}

/**
 * Map diagnostic status to human-readable label.
 */
export function diagnosticStatusLabel(status: DiagnosticStatus): string {
    const labels: Record<DiagnosticStatus, string> = {
        'pending': 'Pending',
        'sample_collected': 'Sample Collected',
        'sample_received': 'Sample Received',
        'sent_to_lab': 'Sent to Lab',
        'raw_report_received': 'Raw Report Received',
        'final_report_generated': 'Final Report Generated',
    }
    return labels[status] || status
}

/**
 * Map diagnostic status to a color for badges.
 */
export function diagnosticStatusColor(status: DiagnosticStatus): string {
    const colors: Record<DiagnosticStatus, string> = {
        'pending': '#94a3b8',
        'sample_collected': '#f59e0b',
        'sample_received': '#3b82f6',
        'sent_to_lab': '#8b5cf6',
        'raw_report_received': '#10b981',
        'final_report_generated': '#059669',
    }
    return colors[status] || '#94a3b8'
}

/**
 * Map diagnostic status to the corresponding workflow stage name.
 */
export function diagnosticStatusToStageName(status: DiagnosticStatus): string {
    const map: Record<DiagnosticStatus, string> = {
        'pending': 'new',
        'sample_collected': 'sample collected',
        'sample_received': 'sample received',
        'sent_to_lab': 'sample sent to',
        'raw_report_received': 'report received',
        'final_report_generated': 'final report generated',
    }
    return map[status] || 'new'
}

/**
 * Compute the aggregate patient type from all active diagnostics.
 * Returns { showMale, showFemale } based on the union of all diagnostics' patient types.
 * If ANY test needs male fields, showMale is true. If ANY needs female, showFemale is true.
 */
export function getAggregatePatientType(diagnostics: TicketDiagnostic[]): { showMale: boolean; showFemale: boolean } {
    let showMale = false
    let showFemale = false
    const active = diagnostics.filter(d => !d.is_cancelled)
    for (const d of active) {
        const pt: PatientType = d.service_type?.patient_type || 'couple'
        if (pt === 'couple' || pt === 'male_only') showMale = true
        if (pt === 'couple' || pt === 'female_only') showFemale = true
    }
    return { showMale, showFemale }
}

/**
 * Get the minimum (lowest) status across all active diagnostics.
 * This determines what the ticket-level aggregate status should be.
 */
export function getAggregateStatus(diagnostics: TicketDiagnostic[]): DiagnosticStatus {
    const active = diagnostics.filter(d => !d.is_cancelled)
    if (active.length === 0) return 'pending'
    const minIndex = Math.min(...active.map(d => STATUS_ORDER.indexOf(d.status)))
    return STATUS_ORDER[minIndex] || 'pending'
}

/**
 * Map a workflow stage name to the corresponding ticket-level timestamp column.
 */
function stageNameToTimestampField(stageName: string): string | null {
    const map: Record<string, string> = {
        'new': 'status_new_at',
        'sample collected': 'status_sample_collected_at',
        'sample received': 'status_sample_received_at',
        'sample sent to': 'status_sample_sent_at',
        'analyzed': 'status_analyzed_at',
        'report received': 'status_report_received_at',
        'final report generated': 'status_final_report_generated_at',
        'report submission': 'status_report_submitted_at',
    }
    return map[stageName.toLowerCase()] || null
}

/**
 * Server-side helper: Auto-advance ticket status based on aggregate diagnostic status.
 * Call this after any diagnostic update.
 * Also creates a status_transitions record and updates system timestamp fields
 * so the timeline view works correctly.
 */
export async function maybeAdvanceTicketStatus(supabase: any, ticketId: string, changedBy?: string): Promise<void> {
    // Fetch all diagnostics for this ticket
    const { data: diagnostics } = await supabase
        .from('ticket_diagnostics')
        .select('*')
        .eq('ticket_id', ticketId)

    if (!diagnostics || diagnostics.length === 0) return

    const aggregateStatus = getAggregateStatus(diagnostics)
    const targetStageName = diagnosticStatusToStageName(aggregateStatus)

    // Find the workflow stage
    const { data: stage } = await supabase
        .from('workflow_stages')
        .select('id, name, sort_order')
        .ilike('name', targetStageName)
        .eq('is_active', true)
        .maybeSingle()

    if (!stage) return

    // Get current ticket stage
    const { data: ticket } = await supabase
        .from('tickets')
        .select('current_stage_id, current_stage:workflow_stages!tickets_current_stage_id_fkey(sort_order)')
        .eq('id', ticketId)
        .single()

    if (!ticket) return

    // Only advance, never go backward
    const currentSortOrder = (ticket.current_stage as any)?.sort_order ?? -1
    if (stage.sort_order > currentSortOrder) {
        const now = new Date().toISOString()
        const ticketUpdates: Record<string, any> = {
            current_stage_id: stage.id,
            updated_at: now,
        }

        // Set the system timestamp field for this stage
        const tsField = stageNameToTimestampField(stage.name)
        if (tsField) {
            ticketUpdates[tsField] = now
        }

        await supabase
            .from('tickets')
            .update(ticketUpdates)
            .eq('id', ticketId)

        // Create a status_transitions record so the timeline view works
        await supabase
            .from('status_transitions')
            .insert({
                ticket_id: ticketId,
                from_stage_id: ticket.current_stage_id || null,
                to_stage_id: stage.id,
                transition_date: now.split('T')[0],
                transition_time: now.split('T')[1]?.slice(0, 5) || null,
                field_data: {},
                changed_by: changedBy || null,
            })
    }
}
