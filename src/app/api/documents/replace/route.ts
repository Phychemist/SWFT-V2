import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canReplaceDocumentByRole } from '@/lib/auth'
import {
    DOCUMENT_TYPES,
    DOCUMENT_TYPE_TO_URL_FIELD,
    DOCUMENT_TYPE_BUCKET,
    getMaxFileSize,
    isAllowedMime,
    type DocumentType,
} from '@/lib/document-types'
import type { ApiResponse } from '@/lib/types'

const VALID_DOCUMENT_TYPES = new Set<string>(DOCUMENT_TYPES)

/** Known document buckets; used to safely derive path from URL and delete only from our buckets */
const DOCUMENT_BUCKETS = new Set<string>(['trf-documents', 'raw-reports', 'final-reports'])

interface ReplaceResponse {
    url: string
}

/**
 * Extract storage object path from a Supabase public URL for a given bucket.
 * Returns null if URL doesn't match the bucket (safety: never delete from wrong bucket).
 */
function getStoragePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
    try {
        const prefix = `/storage/v1/object/public/${bucket}/`
        const idx = publicUrl.indexOf(prefix)
        if (idx === -1) return null
        const path = publicUrl.slice(idx + prefix.length).split('?')[0]
        return path && path.length > 0 ? path : null
    } catch {
        return null
    }
}

/**
 * POST /api/documents/replace
 * Replace an existing uploaded document with a new file.
 * Permission: manager/admin can replace any; others can replace if their role can upload that doc type (no DB migration).
 * After successful update, the old file is removed from storage to avoid clutter.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const ticketId = formData.get('ticketId') as string | null
        const documentType = formData.get('documentType') as string | null
        const diagnosticId = formData.get('diagnosticId') as string | null

        if (!file || !ticketId || !documentType) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Missing required fields: file, ticketId, documentType' },
                { status: 400 }
            )
        }

        if (!VALID_DOCUMENT_TYPES.has(documentType)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Invalid documentType. Allowed: ${DOCUMENT_TYPES.join(', ')}` },
                { status: 400 }
            )
        }

        const type = documentType as DocumentType
        const urlField = DOCUMENT_TYPE_TO_URL_FIELD[type]

        if (!canReplaceDocumentByRole(session.role, type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to replace this document type.' },
                { status: 403 }
            )
        }

        if (!isAllowedMime(type, file.type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Invalid file type for ${documentType}. Allowed: images (JPEG, PNG, WebP) and PDF where applicable.` },
                { status: 400 }
            )
        }

        if (file.size > getMaxFileSize()) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `File too large. Maximum size: ${getMaxFileSize() / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        let currentUrl: string | null = null
        let updateTarget: 'ticket' | 'diagnostic' = 'ticket'

        if (diagnosticId) {
            const { data: diagnostic, error: diagError } = await supabase
                .from('ticket_diagnostics')
                .select(`ticket_id, ${urlField}`)
                .eq('id', diagnosticId)
                .eq('ticket_id', ticketId)
                .single()

            if (diagError || !diagnostic) {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Diagnostic not found or does not belong to this ticket' },
                    { status: 404 }
                )
            }

            const diagData: unknown = diagnostic
            currentUrl = (diagData as Record<string, unknown>)[urlField] as string | null
            updateTarget = 'diagnostic'
        } else {
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .select(`id, ${urlField}, trf_image_urls`)
                .eq('id', ticketId)
                .single()

            if (ticketError || !ticket) {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Ticket not found' },
                    { status: 404 }
                )
            }

            const ticketData: unknown = ticket
            const t = ticketData as Record<string, unknown>
            if (type === 'trf') {
                const urls = t.trf_image_urls as string[] | undefined
                currentUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : (t.trf_image_url as string) ?? null
            } else {
                currentUrl = t[urlField] as string | null
            }
        }

        const bucket = DOCUMENT_TYPE_BUCKET[type]
        const timestamp = Date.now()
        let extension = 'jpg'
        if (file.type === 'image/png') extension = 'png'
        else if (file.type === 'image/webp') extension = 'webp'
        else if (file.type === 'application/pdf') extension = 'pdf'

        const prefix = type === 'trf' ? 'trf' : type === 'raw_report' ? 'raw_report' : type === 'final_report' ? 'final_report' : type
        const fileName = `${prefix}_${ticketId}_${timestamp}.${extension}`
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Document replace upload error:', uploadError)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: `Upload failed: ${uploadError.message}` },
                { status: 500 }
            )
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path)
        const newUrl = urlData.publicUrl

        if (updateTarget === 'diagnostic') {
            const updates: Record<string, unknown> = {
                [urlField]: newUrl,
                updated_at: new Date().toISOString(),
            }
            const { error: updateError } = await supabase
                .from('ticket_diagnostics')
                .update(updates)
                .eq('id', diagnosticId!)
                .eq('ticket_id', ticketId)

            if (updateError) {
                console.error('Document replace diagnostic update error:', updateError)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Failed to update diagnostic with new document' },
                    { status: 500 }
                )
            }
        } else {
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            }
            if (type === 'trf') {
                updates.trf_image_url = newUrl
                const { data: ticketRow } = await supabase
                    .from('tickets')
                    .select('trf_image_urls')
                    .eq('id', ticketId)
                    .single()
                const existing = (ticketRow as { trf_image_urls?: string[] } | null)?.trf_image_urls ?? []
                updates.trf_image_urls = [newUrl, ...existing.slice(1)]
            } else {
                updates[urlField] = newUrl
            }

            const { error: updateError } = await supabase
                .from('tickets')
                .update(updates)
                .eq('id', ticketId)

            if (updateError) {
                console.error('Document replace ticket update error:', updateError)
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Failed to update ticket with new document' },
                    { status: 500 }
                )
            }
        }

        // Remove old file from storage (only if URL belongs to our bucket for this type)
        if (currentUrl && DOCUMENT_BUCKETS.has(bucket)) {
            const oldPath = getStoragePathFromPublicUrl(currentUrl, bucket)
            if (oldPath) {
                const { error: removeError } = await supabase.storage.from(bucket).remove([oldPath])
                if (removeError) {
                    console.warn('Document replace: could not remove old file from storage:', removeError.message, 'path:', oldPath)
                }
            }
        }

        return NextResponse.json<ApiResponse<ReplaceResponse>>({
            success: true,
            data: { url: newUrl },
            message: 'Document replaced successfully.',
        })
    } catch (error: unknown) {
        console.error('Document replace error:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: error instanceof Error ? error.message : 'Failed to replace document' },
            { status: 500 }
        )
    }
}
