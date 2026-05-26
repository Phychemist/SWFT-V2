import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, UserBalance } from '@/lib/types'

export async function GET() {
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

    const supabase = createServiceClient()

    // 1. Fetch all managers and field executives
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .in('role', ['manager', 'field_executive'])

    if (usersError || !usersData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: usersError?.message || 'Failed to fetch users list.' },
        { status: 500 }
      )
    }

    // 2. Fetch all allocations
    const { data: allocations, error: allocError } = await supabase
      .from('fund_allocations')
      .select('user_id, amount')

    if (allocError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: allocError.message },
        { status: 500 }
      )
    }

    // 3. Fetch all approved claims
    const { data: claims, error: claimsError } = await supabase
      .from('expense_claims')
      .select('claimant_id, total_amount')
      .eq('status', 'approved')

    if (claimsError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: claimsError.message },
        { status: 500 }
      )
    }

    // 4. Map allocations and claims in memory
    const allocationMap = new Map<string, number>()
    for (const alloc of (allocations || [])) {
      const current = allocationMap.get(alloc.user_id) || 0
      allocationMap.set(alloc.user_id, current + Number(alloc.amount))
    }

    const expenseMap = new Map<string, number>()
    for (const claim of (claims || [])) {
      const current = expenseMap.get(claim.claimant_id) || 0
      expenseMap.set(claim.claimant_id, current + Number(claim.total_amount))
    }

    // 5. Build dynamic UserBalance array
    const userBalances: UserBalance[] = usersData.map((u: any) => {
      const total_received = allocationMap.get(u.id) || 0
      const total_expenses = expenseMap.get(u.id) || 0
      const current_balance = total_received - total_expenses

      return {
        user_id: u.id,
        full_name: u.full_name,
        role: u.role as 'manager' | 'field_executive',
        total_received,
        total_expenses,
        current_balance,
      }
    })

    // Sort: Managers first, then FEs, then by full_name ascending
    userBalances.sort((a, b) => {
      if (a.role === b.role) {
        return a.full_name.localeCompare(b.full_name)
      }
      return a.role === 'manager' ? -1 : 1
    })

    return NextResponse.json<ApiResponse<UserBalance[]>>({
      success: true,
      data: userBalances,
    })
  } catch (error) {
    console.error('Error fetching user balances:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to calculate team balances.' },
      { status: 500 }
    )
  }
}
