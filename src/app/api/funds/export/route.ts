import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import * as XLSX from 'xlsx'
import type { ApiResponse } from '@/lib/types'

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

    const supabase = createServiceClient()
    const wb = XLSX.book_new()
    let hasSheet = false

    // 1. Generate Allocations Sheet
    if (type === 'all' || type === 'allocation') {
      let allocQuery = supabase
        .from('fund_allocations')
        .select(`
          entry_date, amount, remarks, user_id, allocated_by,
          recipient_balance_after_alloc, recipient_total_expenses_at_alloc,
          recipient:users!fund_allocations_user_id_fkey(full_name, role),
          allocator:users!fund_allocations_allocated_by_fkey(full_name)
        `)
        .order('entry_date', { ascending: false })

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

      const allocsExportData = (allocs || []).map((row: any) => ({
        'Date': row.entry_date,
        'Recipient Name': row.recipient?.full_name || 'Staff Member',
        'Recipient Role': row.recipient?.role || 'field_executive',
        'Allocated Amount': `₹${Number(row.amount).toFixed(2)}`,
        'Balance After Allocation': `₹${Number(row.recipient_balance_after_alloc).toFixed(2)}`,
        'Total Expenses at Allocation': `₹${Number(row.recipient_total_expenses_at_alloc).toFixed(2)}`,
        'Remarks': row.remarks || '',
        'Allocated By': row.allocator?.full_name || 'System',
      }))

      const wsAlloc = XLSX.utils.json_to_sheet(allocsExportData)
      XLSX.utils.book_append_sheet(wb, wsAlloc, 'Allocations')
      hasSheet = true
    }

    // 2. Generate Expenses Sheet
    if (type === 'all' || type === 'expense') {
      let expenseQuery = supabase
        .from('expense_claims')
        .select(`
          reviewed_at, total_amount, created_at, claimant_id, reviewed_by, reason,
          ticket:tickets(uid),
          claimant:users!expense_claims_claimant_id_fkey(full_name, role),
          reviewer:users!expense_claims_reviewed_by_fkey(full_name)
        `)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })

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

      const expensesExportData = (claims || []).map((row: any) => {
        const reviewDate = row.reviewed_at ? row.reviewed_at.split('T')[0] : row.created_at.split('T')[0]
        return {
          'Approved Date': reviewDate,
          'Claimant Name': row.claimant?.full_name || 'Staff Member',
          'Claimant Role': row.claimant?.role || 'field_executive',
          'Approved Amount': `₹${Number(row.total_amount).toFixed(2)}`,
          'Ticket UID': row.ticket?.uid || 'Free-standing',
          'Reason / Reference': row.reason || '',
          'Approved By (Reviewer)': row.reviewer?.full_name || 'System',
        }
      })

      const wsExp = XLSX.utils.json_to_sheet(expensesExportData)
      XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses')
      hasSheet = true
    }

    if (!hasSheet) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid export parameters or no sheets to generate' },
        { status: 400 }
      )
    }

    // 3. Write Excel book to buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const uintArray = new Uint8Array(excelBuffer)

    const response = new NextResponse(uintArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=funds_activity_export_${type}_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })

    return response
  } catch (error) {
    console.error('Error exporting funds data:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to generate Excel export.' },
      { status: 500 }
    )
  }
}
