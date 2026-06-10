import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - Review (Approve or Reject) an expense claim
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden. Only Accountant can review claims.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, review_notes } = body

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Status is required and must be either "approved" or "rejected".' },
        { status: 400 }
      )
    }

    if (status === 'rejected' && (!review_notes || review_notes.trim() === '')) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Review comments / notes are mandatory when rejecting a claim.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch the claim to ensure it exists and is currently pending
    const { data: claim, error: fetchError } = await supabase
      .from('expense_claims')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !claim) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Claim record not found.' },
        { status: 404 }
      )
    }

    if (claim.status !== 'pending') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Claim has already been reviewed (status: ${claim.status}).` },
        { status: 400 }
      )
    }

    // 2. Perform the update
    const { data: updatedClaim, error: updateError } = await supabase
      .from('expense_claims')
      .update({
        status,
        reviewed_by: session.id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        claimant:users!claimant_id(id, full_name, role, username),
        ticket:tickets(id, uid, patient_name)
      `)
      .single()

    if (updateError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: updatedClaim,
      message: `Claim successfully ${status === 'approved' ? 'approved' : 'rejected'}.`
    })
  } catch (error) {
    console.error('Error reviewing claim:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to process claim review' },
      { status: 500 }
    )
  }
}
