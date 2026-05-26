'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'

interface CancelTicketModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (reason: string) => Promise<void>
    ticketUid: string
}

export function CancelTicketModal({ isOpen, onClose, onConfirm, ticketUid }: CancelTicketModalProps) {
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a cancellation reason')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await onConfirm(reason.trim())
            setReason('')
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to cancel ticket')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setReason('')
            setError(null)
            onClose()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                        <AlertTriangle className="text-red-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Cancel Ticket</h3>
                                        <p className="text-sm text-gray-500">{ticketUid}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Are you sure you want to cancel this ticket? This action cannot be undone.
                                </p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cancellation Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Please provide a reason for cancellation..."
                                        rows={3}
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                >
                                    Keep Ticket
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSubmit}
                                    isLoading={isSubmitting}
                                    className="!bg-red-600 hover:!bg-red-700"
                                >
                                    Cancel Ticket
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
