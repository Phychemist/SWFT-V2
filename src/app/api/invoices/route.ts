import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { generateInvoicePDFBuffer, generateAnnexurePDFBuffer } from '@/lib/pdf-utils-server'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - List bulk hospital invoices (Accountant only)
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

    // Fetch invoices joining hospital, creator, and related tickets to count cases
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        hospital:hospitals(name),
        tickets:tickets(id),
        generator:users!generated_by(full_name)
      `)
      .order('generated_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const formatted = (invoices || []).map((inv: any) => ({
      id: inv.id,
      uid: inv.uid,
      hospital_name: inv.hospital?.name || 'Unknown Hospital',
      start_date: inv.start_date,
      end_date: inv.end_date,
      ticket_count: inv.tickets ? inv.tickets.length : 0,
      base_amount: Number(inv.base_amount),
      gst_amount: Number(inv.gst_amount),
      tds_amount: Number(inv.tds_amount),
      total_amount: Number(inv.total_amount),
      pdf_url: inv.pdf_url,
      annexure_url: inv.annexure_url,
      generated_by_name: inv.generator?.full_name || 'System Accountant',
      generated_at: inv.generated_at
    }))

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted
    })
  } catch (error) {
    console.error('Error listing invoices:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST - Generate a new bulk hospital invoice (Accountant only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. Only Accountants can generate invoices.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { hospital_id, start_date, end_date } = body

    if (!hospital_id || !start_date || !end_date) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Hospital ID, start date, and end date are required.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch Hospital Info
    const { data: hospital, error: hospError } = await supabase
      .from('hospitals')
      .select('name, address, city')
      .eq('id', hospital_id)
      .single()

    if (hospError || !hospital) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Hospital not found.' },
        { status: 404 }
      )
    }

    // 2. Fetch completed closed tickets in the selected date range that are not yet billed
    const { data: closedTickets, error: closedError } = await supabase
      .from('tickets')
      .select(`
        id, uid, patient_name, hospital_id, service_type_id, status_report_submitted_at, created_at,
        service_type:service_types(name, category),
        current_stage:workflow_stages!current_stage_id(name)
      `)
      .eq('hospital_id', hospital_id)
      .is('invoice_id', null)

    if (closedError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: closedError.message },
        { status: 500 }
      )
    }

    // Filter closed stage & dates
    const matchingTickets = (closedTickets || []).filter((t: any) => {
      const stage = Array.isArray(t.current_stage) ? t.current_stage[0] : t.current_stage
      const stageName = stage?.name?.toLowerCase().trim() || ''
      const isClosed = stageName === 'submitted and closed'
      
      if (!isClosed) return false

      const ticketDateStr = t.status_report_submitted_at || t.created_at
      if (!ticketDateStr) return false
      const ticketDate = new Date(ticketDateStr.split('T')[0])
      
      if (ticketDate < new Date(start_date)) return false
      if (ticketDate > new Date(end_date)) return false

      return true
    })

    if (matchingTickets.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No completed, unbilled tickets found for this hospital in the specified date range.' },
        { status: 400 }
      )
    }

    // 3. Resolve active rate and calculate amounts for each ticket
    const { data: allCharges } = await supabase
      .from('hospital_service_charges')
      .select('*')
      .eq('hospital_id', hospital_id)

    const GST_RATE = 0.18
    const TDS_RATE = 0.10

    let totalBase = 0
    let totalGst = 0
    let totalTds = 0
    let totalTotal = 0

    const annexureRows = []

    for (const t of matchingTickets) {
      const ticketDateStr = t.status_report_submitted_at || t.created_at || new Date().toISOString()
      const ticketDate = ticketDateStr.split('T')[0]

      const matchedCharges = (allCharges || []).filter((c: any) => 
        c.service_type_id === t.service_type_id &&
        c.effective_from <= ticketDate &&
        (c.valid_until === null || c.valid_until >= ticketDate)
      )
      
      matchedCharges.sort((a: any, b: any) => b.effective_from.localeCompare(a.effective_from))
      const activeRate = matchedCharges[0]

      if (!activeRate) {
        const service = Array.isArray(t.service_type) ? t.service_type[0] : t.service_type
        return NextResponse.json<ApiResponse<null>>(
          { 
            success: false, 
            error: `Missing active hospital service charge rate for ticket ${t.uid} (${service?.name}). Please configure hospital charges first.` 
          },
          { status: 400 }
        )
      }

      const base = Number(activeRate.amount)
      const gst = activeRate.gst_applicable ? base * GST_RATE : 0
      const tds = activeRate.tds_applicable ? base * TDS_RATE : 0
      const total = base + gst - tds

      totalBase += base
      totalGst += gst
      totalTds += tds
      totalTotal += total

      const service = Array.isArray(t.service_type) ? t.service_type[0] : t.service_type

      annexureRows.push({
        ticketUid: t.uid,
        patientName: t.patient_name || 'General Patient',
        serviceName: service?.name || 'Workflow Service',
        completedAt: ticketDateStr,
        baseAmount: base,
        gstAmount: gst,
        tdsAmount: tds,
        totalAmount: total
      })
    }

    // 4. Generate sequentially incrementing INV UID
    const currentYear = new Date().getFullYear()
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('uid')
      .like('uid', `INV-${currentYear}-%`)
      .order('uid', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextNumber = 1
    if (lastInvoice) {
      const parts = lastInvoice.uid.split('-')
      const lastNum = parseInt(parts[2], 10)
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1
      }
    }
    const padNum = String(nextNumber).padStart(4, '0')
    const invoice_uid = `INV-${currentYear}-${padNum}`

    // 5. Generate BOTH PDFs on the server
    const dateRangeStr = `${new Date(start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    
    // Summary Invoice PDF
    let pdfBuffer
    try {
      pdfBuffer = await generateInvoicePDFBuffer({
        invoiceUid: invoice_uid,
        dateStr: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        datePeriodStr: dateRangeStr,
        hospitalName: hospital.name,
        hospitalAddress: hospital.address || '',
        hospitalCity: hospital.city || '',
        ticketCount: matchingTickets.length,
        baseAmount: totalBase,
        gstAmount: totalGst,
        tdsAmount: totalTds,
        totalAmount: totalTotal,
        accountantName: session.full_name || 'System Accountant'
      })
    } catch (pdfErr: any) {
      console.error('Invoice PDF compilation failed:', pdfErr)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to compile Invoice PDF: ${pdfErr.message}` },
        { status: 500 }
      )
    }

    // Annexure PDF
    let annexureBuffer
    try {
      annexureBuffer = await generateAnnexurePDFBuffer({
        invoiceUid: invoice_uid,
        dateStr: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        datePeriodStr: dateRangeStr,
        hospitalName: hospital.name,
        tickets: annexureRows,
        accountantName: session.full_name || 'System Accountant'
      })
    } catch (annexureErr: any) {
      console.error('Annexure PDF compilation failed:', annexureErr)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to compile Annexure PDF: ${annexureErr.message}` },
        { status: 500 }
      )
    }

    // 6. Upload BOTH PDFs to Supabase Storage
    const invoicePath = `${invoice_uid}.pdf`
    const annexurePath = `${invoice_uid}_annexure.pdf`

    const [uploadInvResult, uploadAnnexResult] = await Promise.all([
      supabase.storage.from('invoices').upload(invoicePath, pdfBuffer, { contentType: 'application/pdf', upsert: true }),
      supabase.storage.from('invoices').upload(annexurePath, annexureBuffer, { contentType: 'application/pdf', upsert: true })
    ])

    if (uploadInvResult.error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invoice PDF upload failed: ${uploadInvResult.error.message}` },
        { status: 500 }
      )
    }
    if (uploadAnnexResult.error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Annexure PDF upload failed: ${uploadAnnexResult.error.message}` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(invoicePath)
    const { data: annexUrlData } = supabase.storage.from('invoices').getPublicUrl(annexurePath)

    // 7. Store Bulk Invoice row in Database
    const { data: sampleRate } = await supabase
      .from('hospital_service_charges')
      .select('id')
      .eq('hospital_id', hospital_id)
      .limit(1)
      .maybeSingle()

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        uid: invoice_uid,
        hospital_id,
        start_date,
        end_date,
        hospital_service_charge_id: sampleRate?.id || null,
        base_amount: totalBase,
        gst_amount: totalGst,
        tds_amount: totalTds,
        total_amount: totalTotal,
        pdf_url: urlData.publicUrl,
        annexure_url: annexUrlData.publicUrl,
        generated_by: session.id,
        generated_at: new Date().toISOString()
      })
      .select(`
        *,
        hospital:hospitals(name),
        generator:users!generated_by(full_name)
      `)
      .single()

    if (insertError) {
      console.error('Error saving invoice record:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to save invoice record: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 8. Link all matched tickets to this invoice
    const ticketIds = matchingTickets.map(t => t.id)
    const { error: linkError } = await supabase
      .from('tickets')
      .update({ invoice_id: invoice.id })
      .in('id', ticketIds)

    if (linkError) {
      console.error('Failed to link tickets to invoice:', linkError)
    }

    const formatted = {
      id: invoice.id,
      uid: invoice.uid,
      hospital_name: invoice.hospital?.name || 'Unknown Hospital',
      start_date: invoice.start_date,
      end_date: invoice.end_date,
      ticket_count: ticketIds.length,
      base_amount: Number(invoice.base_amount),
      gst_amount: Number(invoice.gst_amount),
      tds_amount: Number(invoice.tds_amount),
      total_amount: Number(invoice.total_amount),
      pdf_url: invoice.pdf_url,
      annexure_url: invoice.annexure_url,
      generated_by_name: invoice.generator?.full_name || 'System Accountant',
      generated_at: invoice.generated_at
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: formatted,
      message: `Invoice ${invoice_uid} successfully generated with ${ticketIds.length} tickets!`
    })
  } catch (error: any) {
    console.error('Invoice generation unhandled error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
