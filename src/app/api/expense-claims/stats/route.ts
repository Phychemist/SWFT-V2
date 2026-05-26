import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

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

    if (session.role === 'accountant') {
      // 1. Accountant Role Stats: Pending and Approved claims tallies
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('status, total_amount')

      if (claimsError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: claimsError.message },
          { status: 500 }
        )
      }

      let pendingCount = 0
      let pendingAmount = 0
      let approvedCount = 0
      let approvedAmount = 0

      for (const claim of claims || []) {
        const amt = Number(claim.total_amount)
        if (claim.status === 'pending') {
          pendingCount++
          pendingAmount += amt
        } else if (claim.status === 'approved') {
          approvedCount++
          approvedAmount += amt
        }
      }

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: {
          pending_claims_count: pendingCount,
          pending_claims_amount: pendingAmount,
          approved_claims_count: approvedCount,
          approved_claims_amount: approvedAmount
        }
      })
    } else if (session.role === 'field_executive' || session.role === 'manager') {
      // 2. Claimant Role Stats: Holdings, Expenses and Available Balances
      // Total funds allocated to this user
      const { data: allocations, error: allocError } = await supabase
        .from('fund_allocations')
        .select('amount')
        .eq('user_id', session.id)

      if (allocError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: allocError.message },
          { status: 500 }
        )
      }

      const totalAllocated = (allocations || []).reduce((acc, row) => acc + Number(row.amount), 0)

      // Personal claims raised by this user
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('status, total_amount')
        .eq('claimant_id', session.id)

      if (claimsError) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: claimsError.message },
          { status: 500 }
        )
      }

      let totalClaimed = 0 // approved expenses
      let pendingClaimsAmount = 0

      for (const claim of claims || []) {
        const amt = Number(claim.total_amount)
        if (claim.status === 'approved') {
          totalClaimed += amt
        } else if (claim.status === 'pending') {
          pendingClaimsAmount += amt
        }
      }

      const availableBalance = totalAllocated - totalClaimed

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: {
          total_allocated: totalAllocated,
          total_claimed: totalClaimed,
          available_balance: availableBalance,
          pending_claims_amount: pendingClaimsAmount
        }
      })
    } else {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }
  } catch (error) {
    console.error('Error fetching claims stats:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch claims statistics' },
      { status: 500 }
    )
  }
}
