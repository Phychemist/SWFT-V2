import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, Ticket } from '@/lib/types'

// POST - Cancel a ticket
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin, manager, and customer_success can cancel tickets
        const allowedRoles = ['admin', 'manager', 'customer_success']
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to cancel tickets' },
                { status: 403 }
            )
        }

        const { id: ticketId } = await params
        const body = await request.json()
        const { reason } = body

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Cancellation reason is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // First check if ticket exists and is not already cancelled
        const { data: existingTicket, error: fetchError } = await supabase
            .from('tickets')
            .select('id, is_cancelled')
            .eq('id', ticketId)
            .single()

        if (fetchError || !existingTicket) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            )
        }

        if (existingTicket.is_cancelled) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket is already cancelled' },
                { status: 400 }
            )
        }

        // Cancel the ticket
        const { data: updatedTicket, error: updateError } = await supabase
            .from('tickets')
            .update({
                is_cancelled: true,
                cancelled_at: new Date().toISOString(),
                cancelled_by: session.id,
                cancellation_reason: reason.trim(),
            })
            .eq('id', ticketId)
            .select(`
                *,
                doctor:doctors(*),
                hospital:hospitals(*),
                current_stage:workflow_stages(*),
                service_type:service_types(*)
            `)
            .single()

        if (updateError) {
            console.error('Error cancelling ticket:', updateError)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Failed to cancel ticket' },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<Ticket>>({
            success: true,
            data: updatedTicket,
            message: 'Ticket cancelled successfully',
        })
    } catch (error) {
        console.error('Error in cancel ticket:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to cancel ticket' },
            { status: 500 }
        )
    }
}
