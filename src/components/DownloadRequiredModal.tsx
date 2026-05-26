'use client'

import { useState } from 'react'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { FileDown, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { generateAssignmentPDF } from '@/lib/pdf-utils'
import type { DownloadPdfData, StatusChangeData } from '@/components/StatusChangeModal'

interface DownloadRequiredModalProps {
    isOpen: boolean
    onComplete: () => void
    onConfirmTransition?: (data: StatusChangeData) => Promise<void>  // Callback to commit the status transition
    pdfData: DownloadPdfData | null
}

export function DownloadRequiredModal({
    isOpen,
    onComplete,
    onConfirmTransition,
    pdfData,
}: DownloadRequiredModalProps) {
    const [hasDownloaded, setHasDownloaded] = useState(false)
    const [isCommitting, setIsCommitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDownload = async () => {
        if (!pdfData) return

        try {
            await generateAssignmentPDF({
                ticketUid: pdfData.ticketUid,
                patientName: pdfData.patientName,
                hospitalName: pdfData.hospitalName,
                assignedToName: pdfData.assignedToName,
                transitionDate: pdfData.transitionDate,
                testType: pdfData.testType,
                collectionDate: pdfData.collectionDate,
                collectionTime: pdfData.collectionTime
            })

            setHasDownloaded(true)
            setError(null)
        } catch (err) {
            console.error(err)
            setError('Failed to generate PDF. Please try again.')
        }
    }

    const handleFinish = async () => {
        // If there's a pending transition, commit it now
        if (pdfData?.pendingTransition && onConfirmTransition) {
            setIsCommitting(true)
            setError(null)
            try {
                await onConfirmTransition(pdfData.pendingTransition)
                // Success - close the modal
                setHasDownloaded(false) // Reset for next use
                onComplete()
            } catch (err: any) {
                setError(err.message || 'Failed to update status. Please try again.')
                setIsCommitting(false)
            }
        } else {
            // No pending transition (legacy behavior) - just close
            setHasDownloaded(false) // Reset for next use
            onComplete()
        }
    }

    if (!pdfData) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }} // Cannot close until download is done
            title="Test Requisition Form Required"
            description="You must download the Test Requisition Form (TRF) to complete the assignment."
            showCloseButton={false}
            closeOnOverlayClick={false}
        >
            <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] animate-pulse">
                    <FileDown size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Download Test Requisition Form</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
                        You must download the Test Requisition Form before the status can be updated.
                    </p>
                    <div className="text-left mt-4 p-3 bg-[var(--gray-50)] rounded-lg border border-[var(--border-default)] text-sm">
                        <p><strong>Ticket:</strong> {pdfData.ticketUid}</p>
                        <p><strong>Patient:</strong> {pdfData.patientName}</p>
                        <p><strong>Hospital:</strong> {pdfData.hospitalName}</p>
                        <p><strong>Assigned To:</strong> {pdfData.assignedToName}</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--error-50)] border border-[var(--error-200)] text-sm text-[var(--error-700)]">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button
                        size="lg"
                        className="w-full shadow-md"
                        onClick={handleDownload}
                        leftIcon={<FileDown size={20} />}
                        disabled={isCommitting}
                    >
                        {hasDownloaded ? "Download Again" : "Download TRF (PDF)"}
                    </Button>

                    {hasDownloaded && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full"
                        >
                            <Button
                                size="lg"
                                className="w-full bg-[var(--success-600)] hover:bg-[var(--success-700)] border-none shadow-md"
                                onClick={handleFinish}
                                isLoading={isCommitting}
                                leftIcon={!isCommitting ? <CheckCircle2 size={20} /> : undefined}
                            >
                                {isCommitting ? 'Updating Status...' : 'Confirm & Finish'}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
