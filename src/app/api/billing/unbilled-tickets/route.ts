import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'
import { GST_RATE, TDS_RATE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// GET - Retrieve completed but unbilled tickets filtered by hospital & dates (Accountant only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const hospital_id = searchParams.get('hospital_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    const supabase = createServiceClient()

    // 1. Fetch completed closed tickets that are not yet billed (invoice_id is NULL)
    let query = supabase
      .from('tickets')
      .select(`
        id, uid, patient_name, hospital_id, service_type_id, status_report_submitted_at, created_at,
        hospital:hospitals(name),
        service_type:service_types(name, category),
        current_stage:workflow_stages!current_stage_id(name)
      `)
      .is('invoice_id', null)

    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    const { data: closedTickets, error: closedError } = await query

    if (closedError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: closedError.message },
        { status: 500 }
      )
    }

    // 2. Filter for "submitted and closed" and date range
    const filtered = (closedTickets || []).filter((t: any) => {
      const stage = Array.isArray(t.current_stage) ? t.current_stage[0] : t.current_stage
      const stageName = stage?.name?.toLowerCase().trim() || ''
      const isClosed = stageName === 'submitted and closed'
      
      if (!isClosed) return false

      if (start_date || end_date) {
        const ticketDateStr = t.status_report_submitted_at || t.created_at
        if (!ticketDateStr) return false
        const ticketDate = new Date(ticketDateStr.split('T')[0])
        
        if (start_date) {
          if (ticketDate < new Date(start_date)) return false
        }
        if (end_date) {
          if (ticketDate > new Date(end_date)) return false
        }
      }

      return true
    })

    // 3. Fetch active hospital service charges for point-in-time calculation
    let chargesQuery = supabase.from('hospital_service_charges').select('*')
    if (hospital_id) {
      chargesQuery = chargesQuery.eq('hospital_id', hospital_id)
    }
    const { data: allCharges } = await chargesQuery

    const formatted = filtered.map((t: any) => {
      const ticketDateStr = t.status_report_submitted_at || t.created_at || new Date().toISOString()
      const ticketDate = ticketDateStr.split('T')[0]

      // Filter charges matching hospital and service type active at the ticket completion date
      const matchedCharges = (allCharges || []).filter((c: any) => 
        c.hospital_id === t.hospital_id && 
        c.service_type_id === t.service_type_id &&
        c.effective_from <= ticketDate &&
        (c.valid_until === null || c.valid_until >= ticketDate)
      )
      
      matchedCharges.sort((a: any, b: any) => b.effective_from.localeCompare(a.effective_from))
      const activeRate = matchedCharges[0]

      let base_amount = 0
      let gst_amount = 0
      let tds_amount = 0
      let total_amount = 0
      let has_rate = false

      if (activeRate) {
        base_amount = Number(activeRate.amount)
        gst_amount = activeRate.gst_applicable ? base_amount * GST_RATE : 0
        tds_amount = activeRate.tds_applicable ? base_amount * TDS_RATE : 0
        total_amount = base_amount + gst_amount - tds_amount
        has_rate = true
      }

      const hosp = Array.isArray(t.hospital) ? t.hospital[0] : t.hospital
      const service = Array.isArray(t.service_type) ? t.service_type[0] : t.service_type

      return {
        id: t.id,
        uid: t.uid,
        patient_name: t.patient_name || 'General Patient',
        hospital_name: hosp?.name || 'Unknown Hospital',
        service_name: service?.name || 'Workflow Service',
        service_category: service?.category || 'diagnostics',
        hospital_id: t.hospital_id,
        service_type_id: t.service_type_id,
        completed_at: t.status_report_submitted_at || t.created_at,
        base_amount,
        gst_amount,
        tds_amount,
        total_amount,
        has_rate
      }
    })

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
