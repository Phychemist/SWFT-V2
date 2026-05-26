import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, isOfficerBackoffice } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

const BUCKET_NAME = 'trf-documents' // Reusing existing bucket for backoffice images
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UploadResponse {
    url: string
    path: string
    fileType: string
}

// POST - Upload backoffice images (tagged sample, courier details) to Supabase Storage
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only backoffice officers can upload these images
        if (!isOfficerBackoffice(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to upload backoffice images' },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const ticketId = formData.get('ticketId') as string | null
        const type = formData.get('type') as string | null // 'tagged_sample' or 'courier_details'

        if (!file) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'No file provided' },
                { status: 400 }
            )
        }

        if (!ticketId) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Ticket ID is required' },
                { status: 400 }
            )
        }

        if (!type || (type !== 'tagged_sample' && type !== 'courier_details')) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid image type. Must be "tagged_sample" or "courier_details"' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Invalid file type. Allowed: Images (JPEG, PNG, WebP)` },
                { status: 400 }
            )
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Generate unique filename
        const timestamp = Date.now()
        let extension = 'jpg'
        if (file.type === 'image/png') extension = 'png'
        else if (file.type === 'image/webp') extension = 'webp'

        const fileName = `${type}_${ticketId}_${timestamp}.${extension}`
        const filePath = fileName

        // Convert File to Buffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            })

        if (error) {
            console.error('Supabase storage upload error:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Upload failed: ${error.message}` },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path)

        return NextResponse.json<ApiResponse<UploadResponse>>({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: data.path,
                fileType: file.type,
            },
            message: 'Image uploaded successfully',
        })
    } catch (error: any) {
        console.error('Backoffice image upload error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error.message || 'Failed to upload image' },
            { status: 500 }
        )
    }
}
