'use client'

import { useRef } from 'react'
import { canReplaceDocumentByRole } from '@/lib/document-replace-permission'
import type { UserRole } from '@/lib/types'
import type { DocumentType } from '@/lib/document-types'

interface ReplaceDocumentButtonProps {
    ticketId: string
    documentType: DocumentType
    diagnosticId?: string | null
    currentUserRole: UserRole
    onReplaced: (newUrl: string) => void
    onError?: (message: string) => void
    label?: string
    className?: string
    disabled?: boolean
}

/**
 * Renders a "Replace" button when the user's role can replace this document type.
 * Manager and admin can replace any; others can replace if they can upload that type (no DB migration).
 */
export function ReplaceDocumentButton({
    ticketId,
    documentType,
    diagnosticId,
    currentUserRole,
    onReplaced,
    onError,
    label = 'Replace',
    className = '',
    disabled = false,
}: ReplaceDocumentButtonProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    const canReplace = canReplaceDocumentByRole(currentUserRole, documentType)

    if (!canReplace) return null

    const handleClick = () => {
        if (disabled) return
        inputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('ticketId', ticketId)
            formData.append('documentType', documentType)
            if (diagnosticId) formData.append('diagnosticId', diagnosticId)

            const res = await fetch('/api/documents/replace', { method: 'POST', body: formData })
            const data = await res.json()

            if (data.success && data.data?.url) {
                onReplaced(data.data.url)
            } else {
                onError?.(data.error || 'Failed to replace document')
            }
        } catch (err) {
            onError?.('Failed to replace document')
        } finally {
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileChange}
            />
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={className || 'text-sm text-[var(--primary-600)] hover:underline'}
            >
                {label}
            </button>
        </>
    )
}
