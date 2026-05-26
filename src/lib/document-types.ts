/**
 * Document types used for upload/replace. Keys match ticket and ticket_diagnostics column names.
 * Used by replace API and UI to know which URL column and uploaded_by column to update.
 */
export const DOCUMENT_TYPES = [
    'trf',
    'raw_report',
    'final_report',
    'tagged_sample',
    'backoffice_courier',
    'sample_image',
    'courier_image',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/** Map document type to ticket/diagnostic URL column name */
export const DOCUMENT_TYPE_TO_URL_FIELD: Record<DocumentType, string> = {
    trf: 'trf_image_url',
    raw_report: 'raw_report_url',
    final_report: 'final_report_url',
    tagged_sample: 'tagged_sample_image_url',
    backoffice_courier: 'backoffice_courier_image_url',
    sample_image: 'sample_image_url',
    courier_image: 'courier_image_url',
}

/** Storage bucket per document type (must match upload routes). */
export const DOCUMENT_TYPE_BUCKET: Record<DocumentType, string> = {
    trf: 'trf-documents',
    raw_report: 'raw-reports',
    final_report: 'final-reports',
    tagged_sample: 'trf-documents',
    backoffice_courier: 'trf-documents',
    sample_image: 'trf-documents',
    courier_image: 'trf-documents',
}

/** Allowed MIME types per document type (same as upload routes). */
export const DOCUMENT_TYPE_ALLOWED_MIMES: Record<DocumentType, string[]> = {
    trf: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    raw_report: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    final_report: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    tagged_sample: ['image/jpeg', 'image/png', 'image/webp'],
    backoffice_courier: ['image/jpeg', 'image/png', 'image/webp'],
    sample_image: ['image/jpeg', 'image/png', 'image/webp'],
    courier_image: ['image/jpeg', 'image/png', 'image/webp'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function getMaxFileSize(): number {
    return MAX_FILE_SIZE
}

export function isAllowedMime(type: DocumentType, mime: string): boolean {
    return DOCUMENT_TYPE_ALLOWED_MIMES[type].includes(mime)
}
