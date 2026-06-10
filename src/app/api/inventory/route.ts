import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

const addStockSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
})

export async function GET() {
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

    const supabase = createServiceClient()

    // 1. Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')

    if (itemsError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: itemsError.message },
        { status: 500 }
      )
    }

    // 2. Fetch all stock additions
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .select('item_id, quantity')

    if (stockError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: stockError.message },
        { status: 500 }
      )
    }

    // 3. Fetch all allocations
    const { data: allocData, error: allocError } = await supabase
      .from('inventory_allocations')
      .select('item_id, quantity, from_user_id')

    if (allocError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: allocError.message },
        { status: 500 }
      )
    }

    // 4. Fetch all consumptions
    const { data: consData, error: consError } = await supabase
      .from('inventory_consumptions')
      .select('item_id, quantity_used')

    if (consError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: consError.message },
        { status: 500 }
      )
    }

    // Process aggregations
    const addedMap = new Map<string, number>()
    for (const row of (stockData || [])) {
      addedMap.set(row.item_id, (addedMap.get(row.item_id) || 0) + row.quantity)
    }

    const allocatedMap = new Map<string, number>()
    for (const row of (allocData || [])) {
      // Stock allocated from warehouse has from_user_id as null
      if (row.from_user_id === null) {
        allocatedMap.set(row.item_id, (allocatedMap.get(row.item_id) || 0) + row.quantity)
      }
    }

    const consumedMap = new Map<string, number>()
    for (const row of (consData || [])) {
      consumedMap.set(row.item_id, (consumedMap.get(row.item_id) || 0) + row.quantity_used)
    }

    const formatted = (items || []).map((item: any) => {
      const total_added = addedMap.get(item.id) || 0
      const total_allocated = allocatedMap.get(item.id) || 0
      const total_consumed = consumedMap.get(item.id) || 0

      // Warehouse stock = added - allocated
      const warehouse_stock = total_added - total_allocated
      const below_threshold = warehouse_stock < item.minimum_threshold

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        cost_per_unit: Number(item.cost_per_unit),
        minimum_threshold: item.minimum_threshold,
        warehouse_stock,
        total_allocated,
        total_consumed,
        below_threshold,
      }
    })

    return NextResponse.json<ApiResponse<any[]>>({
      success: true,
      data: formatted,
    })
  } catch (error) {
    console.error('Error fetching inventory counts:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch inventory counts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only backoffice can add stock
    if (session.role !== 'officer_backoffice') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = addStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { item_id, quantity, notes } = parsed.data
    const supabase = createServiceClient()

    // Insert new stock addition row
    const { data: newStock, error: insertError } = await supabase
      .from('inventory_stock')
      .insert({
        item_id,
        quantity,
        notes: notes || null,
        added_by: session.id,
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
      data: newStock,
    })
  } catch (error) {
    console.error('Error adding inventory stock:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to add stock' },
      { status: 500 }
    )
  }
}
