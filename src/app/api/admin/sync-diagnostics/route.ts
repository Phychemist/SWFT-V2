import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

/**
 * POST /api/admin/sync-diagnostics
 *
 * One-time (and safe to re-run) migration endpoint.
 * Retroactively syncs ticket_diagnostics.status to match the parent
 * ticket's current_stage for all tickets where they are out of sync.
 *
 * This fixes tickets where a manager/admin manually changed the ticket
 * stage via the status dropdown before the diagnostic-sync fix was deployed.
 *
 * Only accessible by admin or manager roles.
 */

// Stage name → expected diagnostic status
const STAGE_TO_DIAGNOSTIC_STATUS: Record<string, string> = {
    'sample collected': 'sample_collected',
    'sample received': 'sample_received',
    'sample sent to': 'sent_to_lab',
    'report received': 'raw_report_received',
    'final report generated': 'final_report_generated',
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Only admin or manager can run this migration' },
                { status: 403 }
            )
        }

        const supabase = createServiceClient()

        // Fetch all non-cancelled tickets with their current stage and diagnostics
        const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select(`
                id,
                uid,
                raw_report_url,
                final_report_url,
                current_stage:workflow_stages!current_stage_id(name),
                ticket_diagnostics(id, status, raw_report_url, final_report_url, is_cancelled)
            `)
            .eq('is_cancelled', false)

        if (ticketsError) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: ticketsError.message },
                { status: 500 }
            )
        }

        let ticketsFixed = 0
        let diagnosticsFixed = 0
        const errors: string[] = []
        const fixedTickets: { id: string; uid: string; stage: string; diagnosticsCount: number }[] = []

        for (const ticket of (tickets || [])) {
            const stageName = (ticket.current_stage as any)?.name?.toLowerCase()?.trim()
            const stageDisplayName = (ticket.current_stage as any)?.name || ''
            if (!stageName) continue

            const targetDiagnosticStatus = STAGE_TO_DIAGNOSTIC_STATUS[stageName]
            if (!targetDiagnosticStatus) continue // Stage doesn't map to a diagnostic status (e.g. 'new', 'cancelled')

            const activeDiagnostics = (ticket.ticket_diagnostics || []).filter(
                (d: any) => !d.is_cancelled
            )
            if (activeDiagnostics.length === 0) continue

            // Find diagnostics that are out of sync (status doesn't match expected)
            const outOfSync = activeDiagnostics.filter(
                (d: any) => d.status !== targetDiagnosticStatus
            )
            if (outOfSync.length === 0) continue

            const outOfSyncIds = outOfSync.map((d: any) => d.id)

            const diagnosticUpdates: Record<string, any> = {
                status: targetDiagnosticStatus,
                updated_at: new Date().toISOString(),
            }

            // For 'report received': propagate ticket-level raw_report_url to diagnostics
            // that don't already have one. This covers tickets where manager uploaded
            // the report via StatusChangeModal (stored at ticket level, not diagnostic level).
            if (targetDiagnosticStatus === 'raw_report_received') {
                const ticketRawUrl = (ticket as any).raw_report_url
                if (ticketRawUrl) {
                    diagnosticUpdates.raw_report_url = ticketRawUrl
                }
            }

            // For 'final report generated': propagate ticket-level final_report_url
            if (targetDiagnosticStatus === 'final_report_generated') {
                const ticketFinalUrl = (ticket as any).final_report_url
                if (ticketFinalUrl) {
                    diagnosticUpdates.final_report_url = ticketFinalUrl
                }
            }

            const { error: updateError } = await supabase
                .from('ticket_diagnostics')
                .update(diagnosticUpdates)
                .in('id', outOfSyncIds)

            if (updateError) {
                errors.push(`Ticket ${ticket.id}: ${updateError.message}`)
            } else {
                ticketsFixed++
                diagnosticsFixed += outOfSyncIds.length
                fixedTickets.push({
                    id: ticket.id,
                    uid: (ticket as any).uid || ticket.id,
                    stage: stageDisplayName,
                    diagnosticsCount: outOfSyncIds.length,
                })
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                ticketsFixed,
                diagnosticsFixed,
                errors,
                fixedTickets,
            },
            message: errors.length > 0
                ? `Completed with ${errors.length} error(s). Fixed ${diagnosticsFixed} diagnostics across ${ticketsFixed} tickets.`
                : `Successfully synced ${diagnosticsFixed} diagnostics across ${ticketsFixed} tickets.`,
        })
    } catch (error: any) {
        console.error('Sync diagnostics error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error.message || 'Migration failed' },
            { status: 500 }
        )
    }
}
