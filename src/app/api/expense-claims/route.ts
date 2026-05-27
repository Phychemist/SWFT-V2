import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - List claims based on role
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
    const status = searchParams.get('status') // optional filter: pending | approved | rejected

    const supabase = createServiceClient()

    let query = supabase
      .from('expense_claims')
      .select(`
        *,
        claimant:users!claimant_id(id, full_name, role, username),
        ticket:tickets(id, uid, patient_name)
      `)

    // Role-based filtering
    if (session.role === 'field_executive' || session.role === 'manager') {
      // Users can only see their own claims
      query = query.eq('claimant_id', session.id)
    } else if (session.role !== 'accountant') {
      // Other roles have no access to expense claims
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: claims, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: claims || []
    })
  } catch (error) {
    console.error('Error listing expense claims:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch expense claims' },
      { status: 500 }
    )
  }
}

// POST - Submit a new expense claim
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'field_executive' && session.role !== 'manager') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. Only Field Executives and Managers can raise claims.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      ticket_id,
      outstation_travel = false,
      from_place = null,
      to_place = null,
      distance_km = 0,
      breakfast_amount = 0,
      lunch_amount = 0,
      dinner_amount = 0,
      reimbursement_items = [],
      accommodation_amount = 0,
      travel_allowance_amount = 0,
      miscellaneous_amount = 0,
      miscellaneous_description = null,
      reason = null,
      proof_urls = [],
      notes = null
    } = body

    const supabase = createServiceClient()

    // 1. Fetch singleton rate configurations
    const { data: config, error: configError } = await supabase
      .from('claim_rate_config')
      .select('*')
      .maybeSingle()

    if (configError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch rate configuration.' },
        { status: 500 }
      )
    }

    const rates = config || {
      petrol_rate_per_km: 4.00,
      breakfast_max: 100.00,
      lunch_max: 150.00,
      dinner_max: 150.00
    }

    // 2. Validate food allowance caps
    if (breakfast_amount > rates.breakfast_max) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Breakfast claim exceeds the allowance cap of ₹${rates.breakfast_max}.` },
        { status: 400 }
      )
    }
    if (lunch_amount > rates.lunch_max) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Lunch claim exceeds the allowance cap of ₹${rates.lunch_max}.` },
        { status: 400 }
      )
    }
    if (dinner_amount > rates.dinner_max) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Dinner claim exceeds the allowance cap of ₹${rates.dinner_max}.` },
        { status: 400 }
      )
    }

    // 3. Role-specific validation
    if (session.role === 'field_executive') {
      // FEs MUST submit claims tied to a valid completed ticket assigned to them
      if (!ticket_id) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Ticket ID is required for Field Executive claims.' },
          { status: 400 }
        )
      }

      // Check ticket status and assignment
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id, 
          assigned_to,
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

      if (ticket.assigned_to !== session.id) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'You can only submit claims for tickets assigned to you.' },
          { status: 403 }
        )
      }

      const stage = Array.isArray(ticket.current_stage)
        ? ticket.current_stage[0]
        : (ticket.current_stage as any)
      const stageName = stage?.name?.toLowerCase().trim() || ''
      const allowedCompletedStages = ['sample collected', 'sample received', 'sample sent to', 'analyzed', 'report received', 'final report generated', 'report submission', 'submitted and closed']
      if (!allowedCompletedStages.includes(stageName)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Claims can only be submitted for completed tasks (stage is Sample Collected or later).' },
          { status: 400 }
        )
      }
    } else if (session.role === 'manager') {
      // Managers raise free-standing claims; reason is mandatory
      if (!reason || reason.trim() === '') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'A business reason description is required for Manager claims.' },
          { status: 400 }
        )
      }
    }

    // 4. Calculate Petrol and Total Claim Amounts
    const petrolRate = Number(rates.petrol_rate_per_km)
    const petrolAmount = distance_km ? Number(distance_km) * petrolRate : 0

    const reimbSum = Array.isArray(reimbursement_items) 
      ? reimbursement_items.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0)
      : 0

    const calculatedTotal = 
      petrolAmount + 
      Number(breakfast_amount) + 
      Number(lunch_amount) + 
      Number(dinner_amount) + 
      Number(accommodation_amount) + 
      Number(travel_allowance_amount) + 
      Number(miscellaneous_amount) + 
      reimbSum

    if (calculatedTotal <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Claim total amount must be greater than zero.' },
        { status: 400 }
      )
    }

    // 5. Insert the claim row
    const { data: claim, error: insertError } = await supabase
      .from('expense_claims')
      .insert({
        claimant_id: session.id,
        ticket_id: session.role === 'field_executive' ? ticket_id : null,
        outstation_travel,
        from_place,
        to_place,
        distance_km: distance_km ? Number(distance_km) : null,
        petrol_amount: petrolAmount,
        petrol_rate_at_submission: petrolRate,
        breakfast_amount: Number(breakfast_amount),
        lunch_amount: Number(lunch_amount),
        dinner_amount: Number(dinner_amount),
        reimbursement_items,
        accommodation_amount: Number(accommodation_amount),
        travel_allowance_amount: Number(travel_allowance_amount),
        miscellaneous_amount: Number(miscellaneous_amount),
        miscellaneous_description,
        reason: session.role === 'manager' ? reason : null,
        proof_urls,
        notes,
        total_amount: calculatedTotal,
        status: 'pending'
      })
      .select(`
        *,
        claimant:users!claimant_id(id, full_name, role, username),
        ticket:tickets(id, uid, patient_name)
      `)
      .single()

    if (insertError) {
      console.error('Error inserting claim:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: claim,
      message: 'Claim submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting expense claim:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to submit claim' },
      { status: 500 }
    )
  }
}
