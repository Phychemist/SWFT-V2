import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { MAX_FUTURE_ENTRY_DAYS } from '@/lib/constants'
import { getPaginationParams } from '@/lib/utils'
import type { ApiResponse, FundEntry, PaginatedResponse } from '@/lib/types'

const fundEntrySchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  remarks: z.string().max(500).optional().nullable(),
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
    const parsed = fundEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { amount, entry_date, remarks } = parsed.data

    // Date validations: cannot be more than 30 days in future
    const entryDateObj = new Date(entry_date)
    const maxFutureDate = new Date()
    maxFutureDate.setDate(maxFutureDate.getDate() + MAX_FUTURE_ENTRY_DAYS)

    if (entryDateObj > maxFutureDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Entry date cannot be more than ${MAX_FUTURE_ENTRY_DAYS} days in the future.` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Insert new fund entry
    const { data: newEntry, error: insertError } = await supabase
      .from('funds')
      .insert({
        amount,
        entry_date,
        remarks: remarks || null,
        entered_by: session.id,
      })
      .select('id, amount, entry_date, remarks, entered_by, created_at')
      .single()

    if (insertError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<FundEntry>>({
      success: true,
      data: newEntry,
    })
  } catch (error) {
    console.error('Error recording fund entry:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to record fund entry' },
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
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const { page, pageSize } = getPaginationParams(url)

    const supabase = createServiceClient()

    let query = supabase
      .from('funds')
      .select('id, amount, entry_date, remarks, entered_by, created_at, users!funds_entered_by_fkey(full_name)', { count: 'exact' })

    if (from) {
      query = query.gte('entry_date', from)
    }
    if (to) {
      query = query.lte('entry_date', to)
    }

    // Paginate and sort
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    const { data: entriesData, error: fetchError, count } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, end)

    if (fetchError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    // Format output with entered_by_name
    const formatted = (entriesData || []).map((entry: any) => ({
      id: entry.id,
      amount: Number(entry.amount),
      entry_date: entry.entry_date,
      remarks: entry.remarks,
      entered_by: entry.entered_by,
      entered_by_name: entry.users?.full_name || 'System',
      created_at: entry.created_at,
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json<ApiResponse<PaginatedResponse<any>>>({
      success: true,
      data: {
        success: true,
        data: formatted,
        total,
        page,
        pageSize,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error listing fund entries:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch fund entries' },
      { status: 500 }
    )
  }
}
