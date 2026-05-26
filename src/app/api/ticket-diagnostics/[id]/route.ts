import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, isFieldExecutive, canUpdateDiagnosticField } from '@/lib/auth'
import { maybeAdvanceTicketStatus } from '@/lib/diagnostic-helpers'
import type { ApiResponse, TicketDiagnostic } from '@/lib/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

// PATCH - Update a single diagnostic record
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
        const supabase = createServiceClient()

        // Fetch the diagnostic to verify it exists and get ticket_id
        const { data: diagnostic, error: fetchError } = await supabase
            .from('ticket_diagnostics')
            .select('*, ticket:tickets(id, assigned_to, is_cancelled)')
            .eq('id', id)
            .single()

        if (fetchError || !diagnostic) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Diagnostic not found' },
                { status: 404 }
            )
        }

        if (diagnostic.ticket?.is_cancelled) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Cannot update diagnostic on a cancelled ticket' },
                { status: 400 }
            )
        }

        // Field executives can only update diagnostics on their assigned tickets
        if (isFieldExecutive(session.role) && diagnostic.ticket?.assigned_to !== session.id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You can only update diagnostics on tickets assigned to you' },
                { status: 403 }
            )
        }

        // Filter to only allowed fields based on role
        const updates: Record<string, any> = {}
        for (const [key, value] of Object.entries(body)) {
            if (canUpdateDiagnosticField(session.role, key)) {
                updates[key] = value
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'No permitted fields to update' },
                { status: 400 }
            )
        }

        updates.updated_at = new Date().toISOString()

        const { data: updated, error: updateError } = await supabase
            .from('ticket_diagnostics')
            .update(updates)
            .eq('id', id)
            .select('*, service_type:service_types(*), lab:labs(*)')
            .single()

        if (updateError) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: updateError.message },
                { status: 500 }
            )
        }

        // Auto-advance ticket status if all diagnostics have progressed
        await maybeAdvanceTicketStatus(supabase, diagnostic.ticket_id, session.id)

        return NextResponse.json<ApiResponse<TicketDiagnostic>>({
            success: true,
            data: updated,
        })
    } catch (error) {
        console.error('Error updating diagnostic:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update diagnostic' },
            { status: 500 }
        )
    }
}

// DELETE - Cancel a single diagnostic (soft delete)
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

        // Only admin, manager, customer_success can cancel diagnostics
        if (!['admin', 'manager', 'customer_success'].includes(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const supabase = createServiceClient()

        const { data: diagnostic, error: fetchError } = await supabase
            .from('ticket_diagnostics')
            .select('ticket_id')
            .eq('id', id)
            .single()

        if (fetchError || !diagnostic) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Diagnostic not found' },
                { status: 404 }
            )
        }

        const { error: updateError } = await supabase
            .from('ticket_diagnostics')
            .update({
                is_cancelled: true,
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)

        if (updateError) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: updateError.message },
                { status: 500 }
            )
        }

        // Re-evaluate ticket status after cancellation
        await maybeAdvanceTicketStatus(supabase, diagnostic.ticket_id, session.id)

        return NextResponse.json<ApiResponse<null>>({
            success: true,
            message: 'Diagnostic cancelled successfully',
        })
    } catch (error) {
        console.error('Error cancelling diagnostic:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to cancel diagnostic' },
            { status: 500 }
        )
    }
}
