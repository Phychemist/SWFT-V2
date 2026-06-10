import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { MAX_FUTURE_ENTRY_DAYS } from '@/lib/constants'
import { getPaginationParams } from '@/lib/utils'
import type { ApiResponse, FundAllocation, PaginatedResponse, UserRole } from '@/lib/types'

const batchAllocationsSchema = z.object({
  entries: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().positive().multipleOf(0.01),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remarks: z.string().max(500).optional().nullable(),
  })).min(1),
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
    const parsed = batchAllocationsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { entries } = parsed.data
    const supabase = createServiceClient()

    // 1. Confirm each user_id is a manager or field_executive
    const userIds = Array.from(new Set(entries.map(e => e.user_id)))
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, role')
      .in('id', userIds)

    if (usersError || !usersData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: usersError?.message || 'Failed to validate recipients.' },
        { status: 400 }
      )
    }

    const roleMap = new Map<string, string>(usersData.map((u: any) => [u.id, u.role]))
    for (const userId of userIds) {
      const role = roleMap.get(userId)
      if (!role || (role !== 'manager' && role !== 'field_executive')) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Allocations can only be made to Managers or Field Executives.' },
          { status: 400 }
        )
      }
    }

    // 2. Compute available Seragen account balance
    const { data: fundsData, error: fundsError } = await supabase
      .from('funds')
      .select('amount')

    if (fundsError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fundsError.message },
        { status: 500 }
      )
    }

    const totalFund = (fundsData || []).reduce((acc, row) => acc + Number(row.amount), 0)

    const { data: allocData, error: allocError } = await supabase
      .from('fund_allocations')
      .select('amount')

    if (allocError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: allocError.message },
        { status: 500 }
      )
    }

    const totalAllocated = (allocData || []).reduce((acc, row) => acc + Number(row.amount), 0)

    // Fetch total approved manager claims sum (deducted directly from Seragen main account)
    const { data: claimsData, error: claimsError } = await supabase
      .from('expense_claims')
      .select('total_amount, claimant:users!claimant_id(role)')
      .eq('status', 'approved')

    if (claimsError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: claimsError.message },
        { status: 500 }
      )
    }

    const totalApprovedManagerExpenses = (claimsData || [])
      .filter((row: any) => {
        const claimant = Array.isArray(row.claimant) ? row.claimant[0] : row.claimant
        return claimant?.role === 'manager'
      })
      .reduce((acc, row) => acc + Number(row.total_amount), 0)

    const availableBalance = totalFund - totalAllocated - totalApprovedManagerExpenses

    const batchTotalAmount = entries.reduce((acc, entry) => acc + entry.amount, 0)
    if (batchTotalAmount > availableBalance) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Insufficient Available Seragen Account Balance. Required: ₹${batchTotalAmount}, Available: ₹${availableBalance}` },
        { status: 400 }
      )
    }

    // 3. Date validations
    const maxFutureDate = new Date()
    maxFutureDate.setDate(maxFutureDate.getDate() + MAX_FUTURE_ENTRY_DAYS)

    for (const entry of entries) {
      const entryDateObj = new Date(entry.entry_date)
      if (entryDateObj > maxFutureDate) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Entry date cannot be more than ${MAX_FUTURE_ENTRY_DAYS} days in the future.` },
          { status: 400 }
        )
      }
    }

    // 4. Atomic batch allocations inserts
    const insertedRows: FundAllocation[] = []
    const userBatchAccumulator = new Map<string, number>()

    for (const entry of entries) {
      const { user_id, amount, entry_date, remarks } = entry

      // Fetch recipient approved claims total expenses
      const { data: claimsData, error: claimsError } = await supabase
        .from('expense_claims')
        .select('total_amount')
        .eq('claimant_id', user_id)
        .eq('status', 'approved')

      if (claimsError) {
        throw new Error(`Failed to calculate expenses for recipient: ${claimsError.message}`)
      }

      const recipient_total_expenses_at_alloc = (claimsData || []).reduce((acc, row) => acc + Number(row.total_amount), 0)

      // Fetch prior allocations sum
      const { data: priorAllocsData, error: priorAllocsError } = await supabase
        .from('fund_allocations')
        .select('amount')
        .eq('user_id', user_id)

      if (priorAllocsError) {
        throw new Error(`Failed to calculate prior allocations for recipient: ${priorAllocsError.message}`)
      }

      const prior_allocations_sum = (priorAllocsData || []).reduce((acc, row) => acc + Number(row.amount), 0)

      // Add prior amounts in this exact batch for this user
      const currentBatchPriorAmount = userBatchAccumulator.get(user_id) || 0
      const recipient_balance_after_alloc = (prior_allocations_sum + currentBatchPriorAmount + amount) - recipient_total_expenses_at_alloc

      // Update accumulator
      userBatchAccumulator.set(user_id, currentBatchPriorAmount + amount)

      // Perform insertion
      const { data: newAlloc, error: insertError } = await supabase
        .from('fund_allocations')
        .insert({
          user_id,
          amount,
          entry_date,
          remarks: remarks || null,
          allocated_by: session.id,
          recipient_balance_after_alloc,
          recipient_total_expenses_at_alloc,
        })
        .select('*')
        .single()

      if (insertError) {
        throw new Error(`Failed to insert allocation row: ${insertError.message}`)
      }

      insertedRows.push(newAlloc)
    }

    return NextResponse.json<ApiResponse<FundAllocation[]>>({
      success: true,
      data: insertedRows,
    })
  } catch (error: any) {
    console.error('Error distributing allocations batch:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || 'Failed to process batch allocations.' },
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
    const userId = url.searchParams.get('user_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const { page, pageSize } = getPaginationParams(url)

    const supabase = createServiceClient()

    let query = supabase
      .from('fund_allocations')
      .select(`
        id, user_id, amount, entry_date, remarks, allocated_by,
        recipient_balance_after_alloc, recipient_total_expenses_at_alloc, created_at,
        recipient:users!fund_allocations_user_id_fkey(full_name, role),
        allocator:users!fund_allocations_allocated_by_fkey(full_name)
      `, { count: 'exact' })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (from) {
      query = query.gte('entry_date', from)
    }
    if (to) {
      query = query.lte('entry_date', to)
    }

    // Paginate and sort
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    const { data: allocsData, error: fetchError, count } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, end)

    if (fetchError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    const formatted = (allocsData || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      recipient_name: row.recipient?.full_name || 'Staff Member',
      recipient_role: row.recipient?.role || 'field_executive',
      amount: Number(row.amount),
      entry_date: row.entry_date,
      remarks: row.remarks,
      allocated_by: row.allocated_by,
      allocator_name: row.allocator?.full_name || 'System',
      recipient_balance_after_alloc: Number(row.recipient_balance_after_alloc),
      recipient_total_expenses_at_alloc: Number(row.recipient_total_expenses_at_alloc),
      created_at: row.created_at,
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
    console.error('Error listing allocations:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch allocations log' },
      { status: 500 }
    )
  }
}
