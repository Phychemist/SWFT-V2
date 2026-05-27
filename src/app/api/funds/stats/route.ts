import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

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

    // 1. Fetch total fund entries sum
    const { data: fundsData, error: fundsError } = await supabase
      .from('funds')
      .select('amount, entry_date')
      .order('entry_date', { ascending: false })

    if (fundsError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fundsError.message },
        { status: 500 }
      )
    }

    const total_fund = (fundsData || []).reduce((acc, row) => acc + Number(row.amount), 0)
    const last_entry_date = (fundsData && fundsData.length > 0) ? fundsData[0].entry_date : null

    // 2. Fetch total allocated sum
    const { data: allocData, error: allocError } = await supabase
      .from('fund_allocations')
      .select('amount')

    if (allocError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: allocError.message },
        { status: 500 }
      )
    }

    const funds_used = (allocData || []).reduce((acc, row) => acc + Number(row.amount), 0)

    // 3. Fetch total approved manager claims sum (deducted directly from Seragen main account)
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

    const available_seragen_account_balance = total_fund - funds_used - totalApprovedManagerExpenses

    return NextResponse.json<ApiResponse<{ total_fund: number; funds_used: number; available_seragen_account_balance: number; last_entry_date: string | null }>>({
      success: true,
      data: {
        total_fund,
        funds_used,
        available_seragen_account_balance,
        last_entry_date,
      },
    })
  } catch (error) {
    console.error('Error fetching fund stats:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch fund statistics' },
      { status: 500 }
    )
  }
}
