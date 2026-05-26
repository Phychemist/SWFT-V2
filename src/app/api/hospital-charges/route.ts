import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

const hospitalChargeSchema = z.object({
  hospital_id: z.string().uuid(),
  service_type_id: z.string().uuid(),
  amount: z.number().nonnegative().multipleOf(0.01),
  gst_applicable: z.boolean().default(false),
  tds_applicable: z.boolean().default(false),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = hospitalChargeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { hospital_id, service_type_id, amount, gst_applicable, tds_applicable, effective_from } = parsed.data
    const supabase = createServiceClient()

    // Find any existing active charge for this hospital and service type that starts before or on the new effective date
    // and is not yet terminated, or terminates after the new effective date
    const { data: existingCharges, error: selectError } = await supabase
      .from('hospital_service_charges')
      .select('id, effective_from, valid_until')
      .eq('hospital_id', hospital_id)
      .eq('service_type_id', service_type_id)
      .is('valid_until', null)
      .order('effective_from', { ascending: false })

    if (selectError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: selectError.message },
        { status: 500 }
      )
    }

    // If there is an existing untargeted charge, expire it the day before the new one starts
    if (existingCharges && existingCharges.length > 0) {
      const activeCharge = existingCharges[0]
      const newEffectiveDate = new Date(effective_from)
      
      // Calculate previous day (newEffectiveDate - 1 day)
      const prevDay = new Date(newEffectiveDate)
      prevDay.setDate(prevDay.getDate() - 1)
      const prevDayStr = prevDay.toISOString().split('T')[0]

      // Ensure we don't cause valid_until < effective_from
      if (prevDayStr >= activeCharge.effective_from) {
        const { error: updateError } = await supabase
          .from('hospital_service_charges')
          .update({ valid_until: prevDayStr })
          .eq('id', activeCharge.id)

        if (updateError) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: `Failed to expire prior rate: ${updateError.message}` },
            { status: 500 }
          )
        }
      }
    }

    // Insert the brand new pricing row (append-only architecture)
    const { data: newCharge, error: insertError } = await supabase
      .from('hospital_service_charges')
      .insert({
        hospital_id,
        service_type_id,
        amount,
        gst_applicable,
        tds_applicable,
        effective_from,
        created_by: session.id,
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: newCharge,
    })
  } catch (error) {
    console.error('Error inserting hospital charge:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to insert pricing charge' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('active') === 'true'
    const hospitalId = url.searchParams.get('hospital_id')
    const todayStr = new Date().toISOString().split('T')[0]

    const supabase = createServiceClient()

    let query = supabase
      .from('hospital_service_charges')
      .select(`
        id, hospital_id, service_type_id, amount, gst_applicable, tds_applicable,
        effective_from, valid_until, created_at,
        hospital:hospitals(name, city),
        service_type:service_types(name, category)
      `)

    if (hospitalId) {
      query = query.eq('hospital_id', hospitalId)
    }

    const { data: charges, error: fetchError } = await query
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    // Filter in-memory for precise active date comparisons if activeOnly is true
    let formatted = (charges || []).map((row: any) => ({
      id: row.id,
      hospital_id: row.hospital_id,
      hospital_name: row.hospital?.name || 'Unknown Hospital',
      hospital_city: row.hospital?.city || 'Unknown City',
      service_type_id: row.service_type_id,
      service_name: row.service_type?.name || 'Unknown Service',
      service_category: row.service_type?.category || 'diagnostics',
      amount: Number(row.amount),
      gst_applicable: row.gst_applicable,
      tds_applicable: row.tds_applicable,
      effective_from: row.effective_from,
      valid_until: row.valid_until,
      created_at: row.created_at,
    }))

    if (activeOnly) {
      formatted = formatted.filter(row => {
        const isEffective = row.effective_from <= todayStr
        const isNotExpired = row.valid_until === null || row.valid_until >= todayStr
        return isEffective && isNotExpired
      })
    }

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted,
    })
  } catch (error) {
    console.error('Error fetching hospital charges:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch pricing charges' },
      { status: 500 }
    )
  }
}
