import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

const updateItemSchema = z.object({
  cost_per_unit: z.number().nonnegative().multipleOf(0.01).optional(),
  minimum_threshold: z.number().int().nonnegative().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Both backoffice (item settings) and accountant (billing values) can update costs/thresholds
    const allowedRoles = ['officer_backoffice', 'accountant']
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const updateFields: any = {}
    if (parsed.data.cost_per_unit !== undefined) {
      updateFields.cost_per_unit = parsed.data.cost_per_unit
    }
    if (parsed.data.minimum_threshold !== undefined) {
      updateFields.minimum_threshold = parsed.data.minimum_threshold
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No fields to update provided' },
        { status: 400 }
      )
    }

    const { data: updatedItem, error } = await supabase
      .from('inventory_items')
      .update(updateFields)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: updatedItem,
    })
  } catch (error) {
    console.error('Error updating inventory item settings:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to update inventory item settings' },
      { status: 500 }
    )
  }
}
