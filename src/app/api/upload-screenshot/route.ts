import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canCreateTickets } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

const BUCKET_NAME = 'ticket-screenshots'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UploadResponse {
    url: string
    path: string
}

// POST - Upload screenshot to Supabase Storage
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user can create tickets (same permission for uploading screenshots)
        if (!canCreateTickets(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to upload screenshots' },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const ticketId = formData.get('ticketId') as string | null

        if (!file) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'No file provided' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
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
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const fileName = ticketId
            ? `${ticketId}_${timestamp}.${extension}`
            : `temp_${session.id}_${timestamp}.${extension}`

        const filePath = fileName

        // Convert File to Buffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false, // Don't overwrite existing files
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
            },
            message: 'Screenshot uploaded successfully',
        })
    } catch (error: any) {
        console.error('Screenshot upload error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error.message || 'Failed to upload screenshot' },
            { status: 500 }
        )
    }
}

// DELETE - Remove screenshot from storage (optional cleanup)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const path = searchParams.get('path')

        if (!path) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Path is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path])

        if (error) {
            console.error('Supabase storage delete error:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Delete failed: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<null>>({
            success: true,
            data: null,
            message: 'Screenshot deleted successfully',
        })
    } catch (error: any) {
        console.error('Screenshot delete error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error.message || 'Failed to delete screenshot' },
            { status: 500 }
        )
    }
}
