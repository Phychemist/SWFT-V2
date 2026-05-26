import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { GST_RATE, TDS_RATE } from '@/lib/constants'
import { generateInvoicePDFBuffer } from '@/lib/pdf-utils-server'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - List invoices (Accountant only)
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

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        ticket:tickets(id, uid, patient_name, service_type:service_types(name, category), hospital:hospitals(name)),
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
      ticket_id: inv.ticket_id,
      ticket_uid: inv.ticket?.uid || 'TKT-000000',
      patient_name: inv.ticket?.patient_name || 'General Patient',
      service_name: inv.ticket?.service_type?.name || 'Workflow Service',
      service_category: inv.ticket?.service_type?.category || 'diagnostics',
      hospital_name: inv.ticket?.hospital?.name || 'Unknown Hospital',
      base_amount: Number(inv.base_amount),
      gst_amount: Number(inv.gst_amount),
      tds_amount: Number(inv.tds_amount),
      total_amount: Number(inv.total_amount),
      pdf_url: inv.pdf_url,
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

// POST - Generate a new invoice (Accountant only)
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
    const { ticket_id } = body

    if (!ticket_id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Ticket ID is required.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch ticket details and check completion status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id, uid, service_type_id, hospital_id,
        hospital:hospitals(name, address, city),
        service_type:service_types(name, category),
        current_stage:workflow_stages!current_stage_id(name)
      `)
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Associated ticket not found.' },
        { status: 404 }
      )
    }

    const stageName = ticket.current_stage?.name.toLowerCase().trim()
    if (stageName !== 'submitted and closed') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invoices can only be generated for successfully closed tasks (stage: "submitted and closed").' },
        { status: 400 }
      )
    }

    // 2. Prevent duplicates: check if invoice already generated
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('ticket_id', ticket_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'An invoice has already been generated for this ticket.' },
        { status: 400 }
      )
    }

    // 3. Fetch active point-in-time pricing charge rate
    const currentDate = new Date().toISOString().split('T')[0]
    const { data: activeRate, error: rateError } = await supabase
      .from('hospital_service_charges')
      .select('*')
      .eq('hospital_id', ticket.hospital_id)
      .eq('service_type_id', ticket.service_type_id)
      .lte('effective_from', currentDate)
      .or(`valid_until.is.null,valid_until.gte.${currentDate}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (rateError || !activeRate) {
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          error: `No active hospital service charge rate found for this hospital and service type. Please configure hospital charges first.` 
        },
        { status: 400 }
      )
    }

    const base_amount = Number(activeRate.amount)
    const gst_amount = activeRate.gst_applicable ? base_amount * GST_RATE : 0
    const tds_amount = activeRate.tds_applicable ? base_amount * TDS_RATE : 0
    const total_amount = base_amount + gst_amount - tds_amount

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

    // 5. Generate Professional PDF invoice buffer on the server
    let pdfBuffer
    try {
      pdfBuffer = await generateInvoicePDFBuffer({
        invoiceUid: invoice_uid,
        dateStr: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hospitalName: ticket.hospital?.name || 'Unknown Hospital',
        hospitalAddress: ticket.hospital?.address || '',
        hospitalCity: ticket.hospital?.city || '',
        serviceCategory: ticket.service_type?.category || 'diagnostics',
        ticketUid: ticket.uid,
        baseAmount: base_amount,
        gstAmount: gst_amount,
        tdsAmount: tds_amount,
        totalAmount: total_amount,
        accountantName: session.full_name || 'System Accountant'
      })
    } catch (pdfErr: any) {
      console.error('Server PDF Generation failed:', pdfErr)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to compile PDF document layout: ${pdfErr.message}` },
        { status: 500 }
      )
    }

    // 6. Upload PDF buffer to Supabase Storage
    const filePath = `${invoice_uid}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Invoice PDF upload failed:', uploadError)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL to record
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(filePath)

    // 7. Store invoice row in DB
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        uid: invoice_uid,
        ticket_id,
        hospital_service_charge_id: activeRate.id,
        base_amount,
        gst_amount,
        tds_amount,
        total_amount,
        pdf_url: urlData.publicUrl,
        generated_by: session.id,
        generated_at: new Date().toISOString()
      })
      .select(`
        *,
        ticket:tickets(uid, patient_name, service_type:service_types(name, category), hospital:hospitals(name)),
        generator:users!generated_by(full_name)
      `)
      .single()

    if (insertError) {
      console.error('Error saving invoice record:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to register invoice row in database: ${insertError.message}` },
        { status: 500 }
      )
    }

    const formatted = {
      id: invoice.id,
      uid: invoice.uid,
      ticket_id: invoice.ticket_id,
      ticket_uid: invoice.ticket?.uid || 'TKT-000000',
      patient_name: invoice.ticket?.patient_name || 'General Patient',
      service_name: invoice.ticket?.service_type?.name || 'Workflow Service',
      service_category: invoice.ticket?.service_type?.category || 'diagnostics',
      hospital_name: invoice.ticket?.hospital?.name || 'Unknown Hospital',
      base_amount: Number(invoice.base_amount),
      gst_amount: Number(invoice.gst_amount),
      tds_amount: Number(invoice.tds_amount),
      total_amount: Number(invoice.total_amount),
      pdf_url: invoice.pdf_url,
      generated_by_name: invoice.generator?.full_name || 'System Accountant',
      generated_at: invoice.generated_at
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: formatted,
      message: `Invoice ${invoice_uid} successfully generated!`
    })
  } catch (error: any) {
    console.error('Invoice generation unhandled error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
