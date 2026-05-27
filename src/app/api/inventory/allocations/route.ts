import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

const allocateStockSchema = z.object({
  item_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  quantity: z.number().int().positive(),
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

    // Only backoffice can allocate stock
    if (session.role !== 'officer_backoffice') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = allocateStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { item_id, to_user_id, quantity } = parsed.data
    const supabase = createServiceClient()

    // 1. Confirm recipient is indeed a field executive
    const { data: recipient, error: recError } = await supabase
      .from('users')
      .select('role')
      .eq('id', to_user_id)
      .single()

    if (recError || !recipient) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Recipient user not found.' },
        { status: 400 }
      )
    }

    if (recipient.role !== 'field_executive') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Stock can only be allocated to Field Executives.' },
        { status: 400 }
      )
    }

    // 2. Fetch total added to warehouse
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('item_id', item_id)

    if (stockError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: stockError.message },
        { status: 500 }
      )
    }

    const totalAdded = (stockData || []).reduce((acc, row) => acc + row.quantity, 0)

    // 3. Fetch prior allocations from warehouse
    const { data: allocData, error: allocError } = await supabase
      .from('inventory_allocations')
      .select('quantity')
      .eq('item_id', item_id)
      .is('from_user_id', null)

    if (allocError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: allocError.message },
        { status: 500 }
      )
    }

    const totalAllocated = (allocData || []).reduce((acc, row) => acc + row.quantity, 0)
    const warehouseStock = totalAdded - totalAllocated

    // 4. Verify safety threshold/capacity
    if (quantity > warehouseStock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Insufficient warehouse stock. Available: ${warehouseStock} units, Requested: ${quantity} units.` },
        { status: 400 }
      )
    }

    // 5. Insert allocation row
    const { data: newAlloc, error: insertError } = await supabase
      .from('inventory_allocations')
      .insert({
        item_id,
        to_user_id,
        quantity,
        allocated_by: session.id,
        from_user_id: null, // Indicates disburse from warehouse
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
      data: newAlloc,
    })
  } catch (error) {
    console.error('Error allocating inventory:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to allocate inventory stock' },
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

    const allowedRoles = ['officer_backoffice', 'accountant', 'field_executive']
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const toUserId = url.searchParams.get('to_user_id')
    const itemId = url.searchParams.get('item_id')

    const supabase = createServiceClient()

    let query = supabase
      .from('inventory_allocations')
      .select(`
        id, item_id, from_user_id, to_user_id, quantity, allocated_by, created_at,
        item:inventory_items(name, unit),
        recipient:users!inventory_allocations_to_user_id_fkey(full_name),
        allocator:users!inventory_allocations_allocated_by_fkey(full_name)
      `)

    if (session.role === 'field_executive') {
      // Force filter for FE's own allocations
      query = query.eq('to_user_id', session.id)
    } else {
      // Apply filters if passed by backoffice/accountant
      if (toUserId) {
        query = query.eq('to_user_id', toUserId)
      }
    }

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    const { data: allocations, error: fetchError } = await query
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    const formatted = (allocations || []).map((row: any) => ({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item?.name || 'Unknown Item',
      item_unit: row.item?.unit || 'piece',
      recipient_id: row.to_user_id,
      recipient_name: row.recipient?.full_name || 'Staff Member',
      quantity: row.quantity,
      allocated_by: row.allocated_by,
      allocator_name: row.allocator?.full_name || 'System',
      created_at: row.created_at,
    }))

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted,
    })
  } catch (error) {
    console.error('Error listing allocations:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch inventory allocations' },
      { status: 500 }
    )
  }
}
