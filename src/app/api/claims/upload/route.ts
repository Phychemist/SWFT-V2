import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { RECEIPT_BUCKET } from '@/lib/constants'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

interface UploadResponse {
  url: string
  path: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'field_executive' && session.role !== 'manager')) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid file type. Only JPG, PNG, WEBP and PDF are allowed.` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `File too large. Max 10MB.` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Generate unique filename
    const timestamp = Date.now()
    let extension = 'jpg'
    if (file.type === 'image/png') extension = 'png'
    else if (file.type === 'image/webp') extension = 'webp'
    else if (file.type === 'application/pdf') extension = 'pdf'

    const fileName = `receipt_${session.id}_${timestamp}.${extension}`
    const filePath = fileName

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Attempt to upload to public bucket
    const { data, error } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from(RECEIPT_BUCKET)
      .getPublicUrl(data.path)

    return NextResponse.json<ApiResponse<UploadResponse>>({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
      },
    })
  } catch (error: any) {
    console.error('Claim receipt upload error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}
