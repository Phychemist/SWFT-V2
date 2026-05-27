import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

const overrideConsumptionSchema = z.object({
  quantity_used: z.number().int().positive(),
  override_reason: z.string().min(5).max(500),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const allowedRoles = ['officer_backoffice', 'accountant', 'field_executive']
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const ticketId = url.searchParams.get('ticket_id')
    const feId = url.searchParams.get('fe_id')

    const supabase = createServiceClient()

    let query = supabase
      .from('inventory_consumptions')
      .select(`
        id, item_id, fe_id, ticket_id, quantity_used, kit_default_quantity,
        overridden, override_reason, created_at, updated_at,
        item:inventory_items(name, unit, cost_per_unit),
        fe:users!inventory_consumptions_fe_id_fkey(full_name),
        ticket:tickets(uid, patient_name)
      `)

    if (session.role === 'field_executive') {
      // Force filter for FE's own consumptions
      query = query.eq('fe_id', session.id)
    } else {
      if (feId) {
        query = query.eq('fe_id', feId)
      }
    }

    if (ticketId) {
      query = query.eq('ticket_id', ticketId)
    }

    const { data: consumptions, error: fetchError } = await query
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    const formatted = (consumptions || []).map((row: any) => ({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item?.name || 'Unknown Item',
      item_unit: row.item?.unit || 'piece',
      cost_per_unit: Number(row.item?.cost_per_unit || 0),
      fe_id: row.fe_id,
      fe_name: row.fe?.full_name || 'Field Executive',
      ticket_id: row.ticket_id,
      ticket_uid: row.ticket?.uid || 'TKT-000000',
      patient_name: row.ticket?.patient_name || 'General Patient',
      quantity_used: row.quantity_used,
      kit_default_quantity: row.kit_default_quantity,
      overridden: row.overridden,
      override_reason: row.override_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted,
    })
  } catch (error) {
    console.error('Error listing consumptions:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch inventory consumptions' },
      { status: 500 }
    )
  }
}

export async function PATCH_handler(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'field_executive') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. Only Field Executives can override consumptions.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, quantity_used, override_reason } = body

    if (!id || !quantity_used || !override_reason) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Consumption ID, quantity_used, and override_reason are required.' },
        { status: 400 }
      )
    }

    const parsed = overrideConsumptionSchema.safeParse({ quantity_used, override_reason })
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch the existing consumption record
    const { data: consumption, error: fetchError } = await supabase
      .from('inventory_consumptions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !consumption) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Consumption record not found.' },
        { status: 404 }
      )
    }

    // Ensure this belongs to the logged-in FE
    if (consumption.fe_id !== session.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. You do not own this consumption record.' },
        { status: 403 }
      )
    }

    // 2. Verify 24-hour override window (from consumption created_at date)
    const completionTime = new Date(consumption.created_at).getTime()
    const currentTime = Date.now()
    const diffHours = (currentTime - completionTime) / (1000 * 60 * 60)

    if (diffHours > 24) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'The 24-hour override window has closed for this ticket.' },
        { status: 400 }
      )
    }

    // 3. Verify stock safety (if quantity increases, make sure FE has enough personal stock holdings)
    const diffQuantity = quantity_used - consumption.quantity_used
    if (diffQuantity > 0) {
      // Calculate FE's personal stock holdings for this item
      // Allocations to this FE
      const { data: allocs, error: allocError } = await supabase
        .from('inventory_allocations')
        .select('quantity')
        .eq('to_user_id', session.id)
        .eq('item_id', consumption.item_id)

      if (allocError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: allocError.message },
          { status: 500 }
        )
      }

      const totalAllocated = (allocs || []).reduce((acc, row) => acc + row.quantity, 0)

      // Consumptions by this FE (excluding the current row)
      const { data: conss, error: consError } = await supabase
        .from('inventory_consumptions')
        .select('quantity_used')
        .eq('fe_id', session.id)
        .eq('item_id', consumption.item_id)
        .neq('id', id)

      if (consError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: consError.message },
          { status: 500 }
        )
      }

      const totalConsumedExcludingCurrent = (conss || []).reduce((acc, row) => acc + row.quantity_used, 0)
      const feHoldingBalance = totalAllocated - totalConsumedExcludingCurrent

      if (quantity_used > feHoldingBalance) {
        return NextResponse.json<ApiResponse<null>>(
          { 
            success: false, 
            error: `Insufficient personal inventory holdings. Your available balance is ${feHoldingBalance} units, requested: ${quantity_used} units.` 
          },
          { status: 400 }
        )
      }
    }

    // 4. Update the consumption row
    const { data: updatedCons, error: updateError } = await supabase
      .from('inventory_consumptions')
      .update({
        quantity_used,
        overridden: true,
        override_reason,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: updatedCons,
    })
  } catch (error) {
    console.error('Error overriding consumption:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to process override' },
      { status: 500 }
    )
  }
}

// Next.js Route handlers call:
export async function PATCH_entry(request: NextRequest) {
  return PATCH_handler(request)
}

// Explicit route method for Next.js to map both PATCH and GET
export { PATCH_handler as PATCH }
