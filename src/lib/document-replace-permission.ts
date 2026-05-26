/**
 * Document replace permission — pure role + document type checks.
 * Safe to import from Client Components (no next/headers or server-only code).
 * Used by ReplaceDocumentButton and re-exported from auth for API use.
 */
import type { UserRole } from './types'

export type DocumentTypeForReplace =
    | 'trf'
    | 'raw_report'
    | 'final_report'
    | 'tagged_sample'
    | 'backoffice_courier'
    | 'sample_image'
    | 'courier_image'

/**
 * Can this role replace a document of the given type?
 * - Admin and manager can replace any document (always show Replace button).
 * - Others can replace only document types they are allowed to upload.
 * No database migration needed — purely role + document type.
 */
export function canReplaceDocumentByRole(
    role: UserRole | undefined | null,
    documentType: DocumentTypeForReplace
): boolean {
    if (role == null) return false
    const r = typeof role === 'string' ? role.toLowerCase() : ''
    if (r === 'admin' || r === 'manager') return true
    switch (documentType) {
        case 'trf':
            return r === 'officer_backoffice'
        case 'raw_report':
        case 'tagged_sample':
        case 'backoffice_courier':
            return r === 'officer_backoffice'
        case 'final_report':
            return r === 'scientist'
        case 'sample_image':
        case 'courier_image':
            return r === 'field_executive'
        default:
            return false
    }
}
