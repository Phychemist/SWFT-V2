import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - Retrieve all completed but unbilled tickets (Accountant only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch all invoices to exclude their ticket_ids
    const { data: billedInvoices, error: billedError } = await supabase
      .from('invoices')
      .select('ticket_id')

    if (billedError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: billedError.message },
        { status: 500 }
      )
    }

    const billedTicketIds = (billedInvoices || []).map((inv: any) => inv.ticket_id)

    // 2. Fetch all tickets in "submitted and closed" stage
    const { data: closedTickets, error: closedError } = await supabase
      .from('tickets')
      .select(`
        id, uid, patient_name, hospital_id, service_type_id,
        hospital:hospitals(name),
        service_type:service_types(name, category),
        current_stage:workflow_stages!current_stage_id(name)
      `)

    if (closedError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: closedError.message },
        { status: 500 }
      )
    }

    // 3. Filter for "submitted and closed" and not billed
    const unbilled = (closedTickets || []).filter((t: any) => {
      const stageName = t.current_stage?.name.toLowerCase().trim()
      const isClosed = stageName === 'submitted and closed'
      const isNotBilled = !billedTicketIds.includes(t.id)
      return isClosed && isNotBilled
    })

    const formatted = unbilled.map((t: any) => ({
      id: t.id,
      uid: t.uid,
      patient_name: t.patient_name || 'General Patient',
      hospital_name: t.hospital?.name || 'Unknown Hospital',
      service_name: t.service_type?.name || 'Workflow Service',
      service_category: t.service_type?.category || 'diagnostics',
      hospital_id: t.hospital_id,
      service_type_id: t.service_type_id
    }))

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted
    })
  } catch (error) {
    console.error('Error fetching unbilled tickets:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch unbilled tickets' },
      { status: 500 }
    )
  }
}
