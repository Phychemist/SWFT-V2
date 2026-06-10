import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { getPaginationParams } from '@/lib/utils'
import type { ApiResponse, ActivityLogRow, PaginatedResponse } from '@/lib/types'

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
    const type = url.searchParams.get('type') || 'all' // all | allocation | expense
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const userId = url.searchParams.get('user_id')
    const { page, pageSize } = getPaginationParams(url)

    const supabase = createServiceClient()
    let combinedLogs: any[] = []

    // 1. Fetch Allocations if requested
    if (type === 'all' || type === 'allocation') {
      let allocQuery = supabase
        .from('fund_allocations')
        .select(`
          id, amount, entry_date, remarks, user_id, allocated_by, created_at,
          recipient_balance_after_alloc, recipient_total_expenses_at_alloc,
          recipient:users!fund_allocations_user_id_fkey(full_name, role),
          allocator:users!fund_allocations_allocated_by_fkey(full_name)
        `)

      if (userId) {
        allocQuery = allocQuery.eq('user_id', userId)
      }
      if (from) {
        allocQuery = allocQuery.gte('entry_date', from)
      }
      if (to) {
        allocQuery = allocQuery.lte('entry_date', to)
      }

      const { data: allocs, error: allocError } = await allocQuery
      if (allocError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: allocError.message },
          { status: 500 }
        )
      }

      const formattedAllocs = (allocs || []).map((row: any) => ({
        id: row.id,
        type: 'allocation',
        date: row.entry_date,
        user_id: row.user_id,
        user_name: row.recipient?.full_name || 'Staff Member',
        user_role: row.recipient?.role || 'field_executive',
        amount: Number(row.amount),
        balance_at_moment: Number(row.recipient_balance_after_alloc),
        total_expenses_at_moment: Number(row.recipient_total_expenses_at_alloc),
        reference: row.remarks,
        performed_by_name: row.allocator?.full_name || 'System',
        created_at: row.created_at,
      }))

      combinedLogs = combinedLogs.concat(formattedAllocs)
    }

    // 2. Fetch Expense Claims (Approved only) if requested
    if (type === 'all' || type === 'expense') {
      let expenseQuery = supabase
        .from('expense_claims')
        .select(`
          id, total_amount, created_at, claimant_id, reviewed_by, reviewed_at, reason,
          ticket:tickets(uid),
          claimant:users!expense_claims_claimant_id_fkey(full_name, role),
          reviewer:users!expense_claims_reviewed_by_fkey(full_name)
        `)
        .eq('status', 'approved')

      if (userId) {
        expenseQuery = expenseQuery.eq('claimant_id', userId)
      }
      if (from) {
        expenseQuery = expenseQuery.gte('reviewed_at', `${from}T00:00:00.000Z`)
      }
      if (to) {
        expenseQuery = expenseQuery.lte('reviewed_at', `${to}T23:59:59.999Z`)
      }

      const { data: claims, error: claimsError } = await expenseQuery
      if (claimsError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: claimsError.message },
          { status: 500 }
        )
      }

      const formattedExpenses = (claims || []).map((row: any) => {
        const reviewDate = row.reviewed_at ? row.reviewed_at.split('T')[0] : row.created_at.split('T')[0]
        return {
          id: row.id,
          type: 'expense',
          date: reviewDate,
          user_id: row.claimant_id,
          user_name: row.claimant?.full_name || 'Staff Member',
          user_role: row.claimant?.role || 'field_executive',
          amount: Number(row.total_amount),
          balance_at_moment: null,
          total_expenses_at_moment: null,
          reference: row.ticket?.uid ? `${row.ticket.uid} — ${row.reason || 'Expense'}` : (row.reason || 'Expense'),
          performed_by_name: row.reviewer?.full_name || 'System',
          created_at: row.reviewed_at || row.created_at,
        }
      })

      combinedLogs = combinedLogs.concat(formattedExpenses)
    }

    // 3. Sort merged logs by date DESC, then by created_at DESC
    combinedLogs.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare === 0) {
        return b.created_at.localeCompare(a.created_at)
      }
      return dateCompare
    })

    // 4. Paginate
    const total = combinedLogs.length
    const start = (page - 1) * pageSize
    const paginatedLogs = combinedLogs.slice(start, start + pageSize)
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json<ApiResponse<PaginatedResponse<ActivityLogRow>>>({
      success: true,
      data: {
        success: true,
        data: paginatedLogs,
        total,
        page,
        pageSize,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch financial activity log.' },
      { status: 500 }
    )
  }
}
