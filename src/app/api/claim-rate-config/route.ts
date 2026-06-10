import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - Retrieve singleton config
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // Fetch the single config row
    const { data: config, error } = await supabase
      .from('claim_rate_config')
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Fallback if not seeded yet
    const defaultConfig = config || {
      petrol_rate_per_km: 4.00,
      breakfast_max: 100.00,
      lunch_max: 150.00,
      dinner_max: 150.00
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: defaultConfig
    })
  } catch (error) {
    console.error('Error fetching claim rate config:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch claim rate config' },
      { status: 500 }
    )
  }
}

// POST/PATCH - Update singleton config (restricted to Accountant)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. Only Accountant can update config.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { petrol_rate_per_km, breakfast_max, lunch_max, dinner_max } = body

    const supabase = createServiceClient()

    // Get the existing row to update, or insert if none exists
    const { data: existing } = await supabase
      .from('claim_rate_config')
      .select('id')
      .maybeSingle()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('claim_rate_config')
        .update({
          petrol_rate_per_km: Number(petrol_rate_per_km),
          breakfast_max: Number(breakfast_max),
          lunch_max: Number(lunch_max),
          dinner_max: Number(dinner_max),
          updated_by: session.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from('claim_rate_config')
        .insert({
          petrol_rate_per_km: Number(petrol_rate_per_km),
          breakfast_max: Number(breakfast_max),
          lunch_max: Number(lunch_max),
          dinner_max: Number(dinner_max),
          updated_by: session.id
        })
        .select('*')
        .single()

      if (error) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
      result = data
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: result,
      message: 'Claim rates updated successfully'
    })
  } catch (error) {
    console.error('Error updating claim rate config:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to update claim rate config' },
      { status: 500 }
    )
  }
}
