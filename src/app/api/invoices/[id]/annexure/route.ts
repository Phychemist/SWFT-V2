import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Generate 60-minute signed URL for Patient Annexure PDF and redirect
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || session.role !== 'accountant') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // 1. Fetch the invoice details to find its sequential UID
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('uid')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invoice not found.' },
        { status: 404 }
      )
    }

    // 2. Generate a 60-minute signed URL for the annexure pdf file
    const filePath = `${invoice.uid}_annexure.pdf`
    
    const { data: signedData, error: signedError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(filePath, 3600) // 3600 seconds = 60 minutes

    if (signedError || !signedData?.signedUrl) {
      console.error('Error creating signed URL for annexure:', signedError)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to generate secure annexure download link.' },
        { status: 500 }
      )
    }

    // 3. Redirect the browser to the signed secure URL
    return NextResponse.redirect(signedData.signedUrl)
  } catch (error: any) {
    console.error('Error redirecting to invoice annexure PDF:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || 'Failed to download annexure PDF' },
      { status: 500 }
    )
  }
}
