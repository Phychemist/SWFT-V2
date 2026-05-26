'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Camera, FileText, X } from 'lucide-react'
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui'
import type { Lab, TicketDiagnostic } from '@/lib/types'
import { diagnosticStatusLabel } from '@/lib/diagnostic-helpers'

export type DiagnosticAction = 'sample_received' | 'send_to_lab' | 'upload_raw_report' | 'upload_final_report'

interface DiagnosticActionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    diagnostic: TicketDiagnostic | null
    action: DiagnosticAction | null
    ticketId: string
}

const ACTION_TITLES: Record<DiagnosticAction, string> = {
    sample_received: 'Mark Sample Received',
    send_to_lab: 'Send to Lab',
    upload_raw_report: 'Upload Raw Report',
    upload_final_report: 'Upload Final Report',
}

export function DiagnosticActionModal({
    isOpen,
    onClose,
    onSuccess,
    diagnostic,
    action,
    ticketId,
}: DiagnosticActionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [labs, setLabs] = useState<Lab[]>([])

    // Send to Lab fields
    const [labelCode, setLabelCode] = useState('')
    const [labId, setLabId] = useState('')

    // Tagged sample image
    const [taggedSampleFile, setTaggedSampleFile] = useState<File | null>(null)
    const [taggedSamplePreview, setTaggedSamplePreview] = useState<string | null>(null)
    const taggedSampleRef = useRef<HTMLInputElement>(null)
    const taggedSampleCameraRef = useRef<HTMLInputElement>(null)

    // Courier details image
    const [courierFile, setCourierFile] = useState<File | null>(null)
    const [courierPreview, setCourierPreview] = useState<string | null>(null)
    const courierRef = useRef<HTMLInputElement>(null)
    const courierCameraRef = useRef<HTMLInputElement>(null)

    // Raw report file
    const [rawReportFile, setRawReportFile] = useState<File | null>(null)
    const [rawReportPreview, setRawReportPreview] = useState<string | null>(null)
    const rawReportRef = useRef<HTMLInputElement>(null)

    // Final report file
    const [finalReportFile, setFinalReportFile] = useState<File | null>(null)
    const [finalReportPreview, setFinalReportPreview] = useState<string | null>(null)
    const finalReportRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setError(null)
            setLabelCode('')
            setLabId('')
            setTaggedSampleFile(null)
            setTaggedSamplePreview(null)
            setCourierFile(null)
            setCourierPreview(null)
            setRawReportFile(null)
            setRawReportPreview(null)
            setFinalReportFile(null)
            setFinalReportPreview(null)
        }
    }, [isOpen])

    useEffect(() => {
        const fetchLabs = async () => {
            try {
                const res = await fetch('/api/labs')
                const data = await res.json()
                if (data.success) setLabs(data.data)
            } catch (e) {
                console.error('Failed to fetch labs:', e)
            }
        }
        fetchLabs()
    }, [])

    const handleImageSelect = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: (f: File | null) => void,
        setPreview: (p: string | null) => void,
    ) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Allowed: JPEG, PNG, WebP')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File too large. Maximum 10MB')
            return
        }

        setFile(file)
        setError(null)
        const reader = new FileReader()
        reader.onload = (ev) => setPreview(ev.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleReportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Allowed: Images or PDF')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File too large. Maximum 10MB')
            return
        }

        setRawReportFile(file)
        setError(null)
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (ev) => setRawReportPreview(ev.target?.result as string)
            reader.readAsDataURL(file)
        } else {
            setRawReportPreview(null)
        }
    }

    const uploadFile = async (file: File, apiPath: string, extraFields?: Record<string, string>): Promise<string> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('ticketId', ticketId)
        if (extraFields) {
            for (const [k, v] of Object.entries(extraFields)) {
                formData.append(k, v)
            }
        }
        const res = await fetch(apiPath, { method: 'POST', body: formData })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Upload failed')
        return data.data.url
    }

    const handleSubmit = async () => {
        if (!diagnostic || !action) return

        setIsSubmitting(true)
        setError(null)

        try {
            const patchBody: Record<string, any> = {}

            if (action === 'sample_received') {
                patchBody.status = 'sample_received'
                patchBody.sample_received_at = new Date().toISOString()
            }

            if (action === 'send_to_lab') {
                if (!labelCode.trim()) {
                    setError('Label code is required')
                    setIsSubmitting(false)
                    return
                }
                if (!labId) {
                    setError('Please select a lab')
                    setIsSubmitting(false)
                    return
                }
                if (!courierFile) {
                    setError('Courier details image is required')
                    setIsSubmitting(false)
                    return
                }

                patchBody.status = 'sent_to_lab'
                patchBody.label_code = labelCode.trim()
                patchBody.sent_to_lab_id = labId

                // Upload tagged sample image (optional)
                if (taggedSampleFile) {
                    const url = await uploadFile(taggedSampleFile, '/api/upload-backoffice-image', { type: 'tagged_sample' })
                    patchBody.tagged_sample_image_url = url
                }

                // Upload courier details image (required)
                const courierUrl = await uploadFile(courierFile, '/api/upload-backoffice-image', { type: 'courier_details' })
                patchBody.backoffice_courier_image_url = courierUrl
            }

            if (action === 'upload_raw_report') {
                if (!rawReportFile) {
                    setError('Raw report file is required')
                    setIsSubmitting(false)
                    return
                }

                const url = await uploadFile(rawReportFile, '/api/upload-raw-report')
                patchBody.status = 'raw_report_received'
                patchBody.raw_report_url = url
            }

            if (action === 'upload_final_report') {
                if (!finalReportFile) {
                    setError('Final report file is required')
                    setIsSubmitting(false)
                    return
                }

                const url = await uploadFile(finalReportFile, '/api/upload-final-report')
                patchBody.status = 'final_report_generated'
                patchBody.final_report_url = url
            }

            // Update diagnostic via API
            const res = await fetch(`/api/ticket-diagnostics/${diagnostic.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody),
            })
            const result = await res.json()

            if (!result.success) {
                throw new Error(result.error || 'Failed to update diagnostic')
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!diagnostic || !action) return null

    const diagName = diagnostic.service_type?.name || 'Diagnostic'
    const title = `${ACTION_TITLES[action]} - ${diagName}`

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} description={`Current status: ${diagnosticStatusLabel(diagnostic.status)}`}>
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
                    </div>
                )}

                {/* Sample Received — simple confirmation */}
                {action === 'sample_received' && (
                    <p className="text-sm text-[var(--text-secondary)]">
                        Confirm that the sample for <strong>{diagName}</strong> has been physically received at the office.
                    </p>
                )}

                {/* Send to Lab — label code, lab, images */}
                {action === 'send_to_lab' && (
                    <>
                        <Input
                            label="Label Code"
                            placeholder="Enter label code (e.g. LAB-123)"
                            value={labelCode}
                            onChange={(e) => setLabelCode(e.target.value)}
                            required
                        />
                        <p className="text-[10px] text-[var(--text-muted)] italic -mt-2 px-1">
                            This code identifies the sample at the laboratory.
                        </p>

                        <Select
                            label="Laboratory"
                            value={labId}
                            onChange={(e) => setLabId(e.target.value)}
                            options={[
                                { value: '', label: 'Select Laboratory...' },
                                ...labs.map(l => ({ value: l.id, label: l.name })),
                            ]}
                            required
                        />

                        {/* Tagged Sample Image (optional) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Sample After Tagging <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
                            </label>
                            {!taggedSampleFile ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => taggedSampleRef.current?.click()}
                                    >
                                        <input ref={taggedSampleRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageSelect(e, setTaggedSampleFile, setTaggedSamplePreview)} className="hidden" />
                                        <Upload size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Upload</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => taggedSampleCameraRef.current?.click()}
                                    >
                                        <input ref={taggedSampleCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleImageSelect(e, setTaggedSampleFile, setTaggedSamplePreview)} className="hidden" />
                                        <Camera size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Photo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-[var(--primary-300)] rounded-lg p-3 bg-[var(--primary-50)] flex items-center gap-3">
                                    {taggedSamplePreview && <img src={taggedSamplePreview} alt="Tagged Sample" className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{taggedSampleFile.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{(taggedSampleFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button type="button" onClick={() => { setTaggedSampleFile(null); setTaggedSamplePreview(null) }} className="p-1 rounded-full hover:bg-red-100 text-[var(--text-muted)] hover:text-red-600">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Courier Details Image (required) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Courier Details <span className="text-red-500">*</span>
                            </label>
                            {!courierFile ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => courierRef.current?.click()}
                                    >
                                        <input ref={courierRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageSelect(e, setCourierFile, setCourierPreview)} className="hidden" />
                                        <Upload size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Upload</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => courierCameraRef.current?.click()}
                                    >
                                        <input ref={courierCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleImageSelect(e, setCourierFile, setCourierPreview)} className="hidden" />
                                        <Camera size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Photo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-[var(--primary-300)] rounded-lg p-3 bg-[var(--primary-50)] flex items-center gap-3">
                                    {courierPreview && <img src={courierPreview} alt="Courier" className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{courierFile.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{(courierFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button type="button" onClick={() => { setCourierFile(null); setCourierPreview(null) }} className="p-1 rounded-full hover:bg-red-100 text-[var(--text-muted)] hover:text-red-600">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Upload Raw Report */}
                {action === 'upload_raw_report' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                            Raw Report (Lab Report) <span className="text-red-500">*</span>
                        </label>
                        {!rawReportFile ? (
                            <div
                                className="border-2 border-dashed border-[var(--error-400)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--error-600)] hover:bg-[var(--error-50)] transition-colors"
                                onClick={() => rawReportRef.current?.click()}
                            >
                                <input ref={rawReportRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleReportSelect} className="hidden" />
                                <Upload size={28} className="mx-auto text-[var(--error-600)] mb-2" />
                                <p className="text-sm text-[var(--text-secondary)]">Click to upload raw report</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Images or PDF, max 10MB</p>
                            </div>
                        ) : (
                            <div className="border border-[var(--border-default)] rounded-lg p-3 bg-[var(--gray-50)] flex items-center gap-3">
                                {rawReportPreview ? (
                                    <img src={rawReportPreview} alt="Report" className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]" />
                                ) : (
                                    <div className="w-16 h-16 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                        <FileText size={24} className="text-[var(--error-600)]" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{rawReportFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{(rawReportFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button type="button" onClick={() => { setRawReportFile(null); setRawReportPreview(null) }} className="p-1 rounded-full hover:bg-red-100 text-[var(--text-muted)] hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Final Report */}
                {action === 'upload_final_report' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                            Final Report <span className="text-red-500">*</span>
                        </label>
                        {!finalReportFile ? (
                            <div
                                className="border-2 border-dashed border-[var(--success-400)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--success-600)] hover:bg-[var(--success-50)] transition-colors"
                                onClick={() => finalReportRef.current?.click()}
                            >
                                <input ref={finalReportRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
                                    if (!allowedTypes.includes(file.type)) { setError('Invalid file type'); return }
                                    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum 10MB'); return }
                                    setFinalReportFile(file)
                                    setError(null)
                                    if (file.type.startsWith('image/')) {
                                        const reader = new FileReader()
                                        reader.onload = (ev) => setFinalReportPreview(ev.target?.result as string)
                                        reader.readAsDataURL(file)
                                    } else {
                                        setFinalReportPreview(null)
                                    }
                                }} className="hidden" />
                                <Upload size={28} className="mx-auto text-[var(--success-600)] mb-2" />
                                <p className="text-sm text-[var(--text-secondary)]">Click to upload final report</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Images or PDF, max 10MB</p>
                            </div>
                        ) : (
                            <div className="border border-[var(--success-300)] rounded-lg p-3 bg-[var(--success-50)] flex items-center gap-3">
                                {finalReportPreview ? (
                                    <img src={finalReportPreview} alt="Final Report" className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]" />
                                ) : (
                                    <div className="w-16 h-16 flex items-center justify-center bg-[var(--success-100)] rounded-lg border border-[var(--success-300)]">
                                        <FileText size={24} className="text-[var(--success-700)]" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{finalReportFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{(finalReportFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button type="button" onClick={() => { setFinalReportFile(null); setFinalReportPreview(null) }} className="p-1 rounded-full hover:bg-red-100 text-[var(--text-muted)] hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} isLoading={isSubmitting}>
                    {ACTION_TITLES[action]}
                </Button>
            </ModalFooter>
        </Modal>
    )
}
