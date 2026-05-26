'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Edit2, Save, User, Building2, Stethoscope, Clock, Calendar, AlertCircle, Eye, Activity, MessageSquare, Trash2, CheckCircle2, ChevronDown, ChevronUp, Send, Download, FileText, FileDown, Package, Ban, FlaskConical, Plus, X, Upload, Image as ImageIcon } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import {
    Button,
    Select,
    Textarea,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    SearchableSelect,
    SearchableMultiSelect,
} from '@/components/ui'
import { StatusChangeModal, type StatusChangeData, type DownloadPdfData } from '@/components/StatusChangeModal'
import { DownloadRequiredModal } from '@/components/DownloadRequiredModal'
import { CancelTicketModal } from '@/components/CancelTicketModal'
import { ReplaceDocumentButton } from '@/components/ReplaceDocumentButton'
import type { Ticket, WorkflowStage, CustomColumn, SessionUser, Hospital, Doctor, User as UserType, TicketComment, TicketDiagnostic, ServiceType, Lab } from '@/lib/types'
import { diagnosticStatusLabel, diagnosticStatusColor, getAggregatePatientType } from '@/lib/diagnostic-helpers'

const ticketTypeLabels = {
    action: { label: 'Action Required', color: '#8b5cf6' },
    query: { label: 'Query', color: '#3b82f6' },
    info: { label: 'Information', color: '#6b7280' },
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [ticket, setTicket] = useState<Ticket | null>(null)
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [columns, setColumns] = useState<CustomColumn[]>([])

    // Metadata Lists for Editing
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [users, setUsers] = useState<UserType[]>([]) // For direct assignment if needed

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    // Status Change Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false)
    const [targetStage, setTargetStage] = useState<WorkflowStage | null>(null)

    // Comments state
    const [comments, setComments] = useState<TicketComment[]>([])
    const [newComment, setNewComment] = useState('')
    const [isPostingComment, setIsPostingComment] = useState(false)
    const [showAllComments, setShowAllComments] = useState(false)

    // Download Required Modal State (for mandatory download after assigning)
    const [downloadModalOpen, setDownloadModalOpen] = useState(false)
    const [downloadPdfData, setDownloadPdfData] = useState<DownloadPdfData | null>(null)

    // Cancel Ticket Modal State
    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    // Service types for editing diagnostics/therapeutics
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [addDiagnosticIds, setAddDiagnosticIds] = useState<string[]>([])

    // Labs for per-diagnostic editing
    const [labs, setLabs] = useState<Lab[]>([])
    // Per-diagnostic edits (label_code, sent_to_lab_id) managed separately from main formData
    const [diagnosticEdits, setDiagnosticEdits] = useState<Record<string, { label_code: string; sent_to_lab_id: string }>>({})

    const [removeDiagnosticIds, setRemoveDiagnosticIds] = useState<string[]>([])
    const [editServiceTypeId, setEditServiceTypeId] = useState<string>('')

    // Role-Based Permissions
    const canEditMetadata = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'customer_success'
    const canEditWorkflow = currentUser?.role === 'admin' || currentUser?.role === 'manager'
    const canComment = currentUser?.role === 'admin' || currentUser?.role === 'manager'
    const canCancel = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'customer_success'

    // Form state
    const [formData, setFormData] = useState<{
        // Metadata
        type: string
        action_subtype: 'diagnostics' | 'therapeutics' | undefined
        patient_name: string
        patient_name_2: string
        patient_age_1: string
        patient_age_2: string
        doctor_id: string
        hospital_id: string
        original_message: string
        // Workflow
        current_stage_id: string; // Kept for form consistency, but updated via modal mainly
        assigned_to: string;      // Kept for form consistency
        collection_location: string
        collection_address: string
        scheduled_date: string
        scheduled_time: string
        custom_values: Record<string, string>
    }>({
        type: '',
        action_subtype: undefined,
        patient_name: '',
        patient_name_2: '',
        patient_age_1: '',
        patient_age_2: '',
        doctor_id: '',
        hospital_id: '',
        original_message: '',
        current_stage_id: '',
        assigned_to: '',
        collection_location: '',
        collection_address: '',
        scheduled_date: '',
        scheduled_time: '',
        custom_values: {},
    })

    // Image Editing State
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const [screenshotUploading, setScreenshotUploading] = useState(false)
    const [isScreenshotDeleted, setIsScreenshotDeleted] = useState(false)

    const [newTrfFiles, setNewTrfFiles] = useState<File[]>([])
    const [newTrfPreviews, setNewTrfPreviews] = useState<string[]>([])
    const [trfUploading, setTrfUploading] = useState(false)
    const [deletedTrfUrls, setDeletedTrfUrls] = useState<string[]>([])

    const screenshotInputRef = useRef<HTMLInputElement>(null)
    const trfInputRef = useRef<HTMLInputElement>(null)

    const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setScreenshotUploading(true)
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            }
            const compressedFile = await imageCompression(file, options)
            setScreenshotFile(compressedFile)
            setScreenshotPreview(URL.createObjectURL(compressedFile))
            setIsScreenshotDeleted(false)
        } catch (err) {
            setError('Failed to process image')
        } finally {
            setScreenshotUploading(false)
        }
    }

    const handleTrfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        try {
            setTrfUploading(true)
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            }

            const processedFiles: File[] = []
            const previews: string[] = []

            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const compressed = await imageCompression(file, options)
                    processedFiles.push(compressed)
                    previews.push(URL.createObjectURL(compressed))
                } else {
                    processedFiles.push(file)
                    previews.push('') // No preview for non-images (PDFs)
                }
            }

            setNewTrfFiles(prev => [...prev, ...processedFiles])
            setNewTrfPreviews(prev => [...prev, ...previews])
        } catch (err) {
            setError('Failed to process some files')
        } finally {
            setTrfUploading(false)
        }
    }

    const fetchData = async () => {
        try {
            const [meRes, ticketRes, stagesRes, columnsRes, hospitalsRes, doctorsRes, usersRes, commentsRes, serviceTypesRes, labsRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch(`/api/tickets/${id}`),
                fetch('/api/workflow-stages'),
                fetch('/api/custom-columns'),
                fetch('/api/hospitals'),
                fetch('/api/doctors'),
                fetch('/api/users'),
                fetch(`/api/tickets/${id}/comments`),
                fetch('/api/service-types'),
                fetch('/api/labs'),
            ])

            const meData = await meRes.json()
            const ticketData = await ticketRes.json()
            const stagesData = await stagesRes.json()
            const columnsData = await columnsRes.json()
            const hospitalsData = await hospitalsRes.json()
            const doctorsData = await doctorsRes.json()
            const usersData = await usersRes.json()
            const commentsData = await commentsRes.json()
            const serviceTypesData = await serviceTypesRes.json()
            const labsData = await labsRes.json()

            if (meData.success) setCurrentUser(meData.data)

            if (ticketData.success) {
                const t = ticketData.data
                // Normalize TRF images (legacy support)
                if (!t.trf_image_urls && t.trf_image_url) {
                    t.trf_image_urls = [t.trf_image_url]
                } else if (!t.trf_image_urls) {
                    t.trf_image_urls = []
                }

                setTicket(t)
                // Initialize per-diagnostic edits from loaded data
                const initDiagEdits: Record<string, { label_code: string; sent_to_lab_id: string }> = {}
                t.diagnostics?.forEach((d: TicketDiagnostic) => {
                    initDiagEdits[d.id] = {
                        label_code: d.label_code || '',
                        sent_to_lab_id: d.sent_to_lab_id || '',
                    }
                })
                setDiagnosticEdits(initDiagEdits)
                // Initialize form
                const customValuesMap: Record<string, string> = {}
                t.custom_values?.forEach((cv: any) => {
                    customValuesMap[cv.column_id] = cv.value
                })
                setFormData({
                    type: t.type,
                    action_subtype: t.action_subtype,
                    patient_name: t.patient_name || '',
                    patient_name_2: t.patient_name_2 || '',
                    patient_age_1: t.patient_age_1?.toString() || '',
                    patient_age_2: t.patient_age_2?.toString() || '',
                    doctor_id: t.doctor_id || '',
                    hospital_id: t.hospital_id || '',
                    original_message: t.original_message,
                    current_stage_id: t.current_stage_id || '',
                    assigned_to: t.assigned_to || '',
                    collection_location: t.collection_location || '',
                    collection_address: t.collection_address || '',
                    scheduled_date: t.scheduled_date || '',
                    scheduled_time: t.scheduled_time || '',
                    custom_values: customValuesMap,
                })
            } else {
                setError(ticketData.error)
            }

            if (stagesData.success) {
                const filteredStages = stagesData.data
                    .filter((s: WorkflowStage) =>
                        s.is_active &&
                        s.name.toLowerCase().trim() !== 'cancelled' &&
                        s.name.toLowerCase().trim() !== 'cancelleed'
                    )
                    .sort((a: WorkflowStage, b: WorkflowStage) => a.sort_order - b.sort_order)
                setStages(filteredStages)
            }
            if (columnsData.success) setColumns(columnsData.data.filter((c: CustomColumn) => c.is_active).sort((a: CustomColumn, b: CustomColumn) => a.sort_order - b.sort_order))
            if (hospitalsData.success) setHospitals(hospitalsData.data)
            if (doctorsData.success) setDoctors(doctorsData.data)
            if (usersData.success) setUsers(usersData.data.filter((u: UserType) => u.is_active))
            if (commentsData.success) setComments(commentsData.data)
            if (serviceTypesData.success) setServiceTypes(serviceTypesData.data)
            if (labsData.success) setLabs(labsData.data)

        } catch (err) {
            setError('Failed to load ticket data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [id])

    const uploadScreenshot = async (): Promise<string | null | undefined> => {
        if (isScreenshotDeleted) return null
        if (!screenshotFile) return ticket?.screenshot_url

        try {
            const formData = new FormData()
            formData.append('file', screenshotFile)

            const response = await fetch('/api/upload-screenshot', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()
            if (result.success) {
                return result.data.url
            } else {
                throw new Error(result.error || 'Screenshot upload failed')
            }
        } catch (err) {
            console.error('Screenshot upload error:', err)
            throw err
        }
    }

    const uploadTrfFiles = async (): Promise<string[]> => {
        // Keep existing ones not deleted
        const remainingUrls = (ticket?.trf_image_urls || []).filter(url => !deletedTrfUrls.includes(url))

        if (newTrfFiles.length === 0) return remainingUrls

        try {
            const uploadedUrls: string[] = []
            for (const file of newTrfFiles) {
                const formData = new FormData()
                formData.append('file', file)

                const response = await fetch('/api/upload-trf', {
                    method: 'POST',
                    body: formData,
                })

                const result = await response.json()
                if (result.success) {
                    uploadedUrls.push(result.data.url)
                } else {
                    throw new Error(result.error || 'TRF upload failed')
                }
            }
            return [...remainingUrls, ...uploadedUrls]
        } catch (err) {
            console.error('TRF upload error:', err)
            throw err
        }
    }

    const handleSave = async () => {
        if (!canEditMetadata && !canEditWorkflow) return

        setSaving(true)
        setError(null)

        try {
            // 1. Upload images if any
            let finalScreenshotUrl: string | null | undefined = ticket?.screenshot_url
            let finalTrfUrls: string[] = ticket?.trf_image_urls || []

            if (canEditMetadata) {
                finalScreenshotUrl = await uploadScreenshot()
                finalTrfUrls = await uploadTrfFiles()
            }

            // 2. Handle diagnostic removals (cancel) first
            for (const diagId of removeDiagnosticIds) {
                await fetch(`/api/ticket-diagnostics/${diagId}`, { method: 'DELETE' })
            }

            const payload: any = {
                ...formData,
                patient_age_1: formData.patient_age_1 ? parseInt(formData.patient_age_1) : null,
                patient_age_2: formData.patient_age_2 ? parseInt(formData.patient_age_2) : null,
                screenshot_url: finalScreenshotUrl === null ? null : finalScreenshotUrl,
                trf_image_urls: finalTrfUrls,
            }

            // Include new diagnostics to add
            if (addDiagnosticIds.length > 0) {
                payload.add_diagnostic_ids = addDiagnosticIds
            }

            // Include service type change for therapeutics (single service type tickets)
            if (editServiceTypeId && editServiceTypeId !== (ticket?.service_type_id || '')) {
                payload.service_type_id = editServiceTypeId
            }

            // Stage changes must go through StatusChangeModal → /api/status-transitions
            // to keep the timeline in sync. Always strip here.
            delete payload.current_stage_id

            // Non-workflow roles cannot change assignment or collection fields
            if (!canEditWorkflow) {
                delete payload.assigned_to
                delete payload.collection_location
                delete payload.collection_address
            }

            const response = await fetch(`/api/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()

            if (result.success) {
                // Patch per-diagnostic fields (label_code, sent_to_lab_id) for admin/manager
                if (canEditWorkflow && ticket?.diagnostics) {
                    const diagErrors: string[] = []
                    for (const diag of ticket.diagnostics) {
                        if (diag.is_cancelled) continue
                        const edit = diagnosticEdits[diag.id]
                        if (!edit) continue
                        const diagPatch: Record<string, any> = {}
                        if (edit.label_code !== (diag.label_code || '')) diagPatch.label_code = edit.label_code || null
                        if (edit.sent_to_lab_id !== (diag.sent_to_lab_id || '')) diagPatch.sent_to_lab_id = edit.sent_to_lab_id || null
                        if (Object.keys(diagPatch).length > 0) {
                            const diagRes = await fetch(`/api/ticket-diagnostics/${diag.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(diagPatch),
                            })
                            const diagData = await diagRes.json()
                            if (!diagData.success) {
                                diagErrors.push(`${diag.service_type?.name || diag.id}: ${diagData.error || 'Update failed'}`)
                            }
                        }
                    }
                    if (diagErrors.length > 0) {
                        setError(`Ticket saved, but some diagnostic updates failed: ${diagErrors.join('; ')}`)
                        await fetchData()
                        setSaving(false)
                        return
                    }
                }
                setIsEditing(false)
                setAddDiagnosticIds([])
                setRemoveDiagnosticIds([])
                setEditServiceTypeId('')
                setScreenshotFile(null)
                setScreenshotPreview(null)
                setNewTrfFiles([])
                setNewTrfPreviews([])
                setDeletedTrfUrls([])
                setIsScreenshotDeleted(false)
                await fetchData()
            } else {
                setError(result.error)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const response = await fetch(`/api/tickets/${id}`, {
                method: 'DELETE',
            })
            const result = await response.json()
            if (result.success) {
                router.push('/tickets')
                router.refresh()
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to delete ticket')
        } finally {
            setDeleting(false)
        }
    }

    const handleCancelTicket = async (reason: string) => {
        setCancelling(true)
        try {
            const response = await fetch(`/api/tickets/${id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            })
            const result = await response.json()
            if (result.success) {
                setTicket(result.data)
                setCancelModalOpen(false)
            } else {
                throw new Error(result.error || 'Failed to cancel ticket')
            }
        } catch (err: any) {
            throw err
        } finally {
            setCancelling(false)
        }
    }

    // --- Status Change Logic ---

    const openStatusModal = (targetStageId: string) => {
        const stage = stages.find(s => s.id === targetStageId)
        if (stage) {
            setTargetStage(stage)
            setStatusModalOpen(true)
        }
    }

    const handleConfirmStatusChange = async (data: StatusChangeData) => {
        try {
            const response = await fetch('/api/status-transitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (result.success) {
                // Refresh ticket data to show new status and timeline
                await fetchData()
                router.refresh()
            } else {
                const errMsg = result.error || 'Failed to update status'
                setError(errMsg)
                throw new Error(errMsg)
            }
        } catch (err: any) {
            console.error(err)
            if (!err.message?.includes('Failed to update status')) {
                setError('An error occurred while updating status')
            }
            throw err
        }
    }

    // Handler for posting a new comment
    const handlePostComment = async () => {
        if (!newComment.trim() || !canComment) return

        setIsPostingComment(true)
        try {
            const response = await fetch(`/api/tickets/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment.trim() }),
            })

            const result = await response.json()
            if (result.success) {
                // Add new comment to the beginning of the list
                setComments([result.data, ...comments])
                setNewComment('')
            } else {
                setError(result.error || 'Failed to post comment')
            }
        } catch (error) {
            setError('Failed to post comment')
            console.error('Error posting comment:', error)
        } finally {
            setIsPostingComment(false)
        }
    }

    // Handler for when download is required (triggered by StatusChangeModal)
    const handleDownloadRequired = (pdfData: DownloadPdfData) => {
        // Close the status change modal first
        setStatusModalOpen(false)
        setTargetStage(null)
        // Open the download required modal
        setDownloadPdfData(pdfData)
        setDownloadModalOpen(true)
    }

    // Handler for when download is complete
    const handleDownloadComplete = () => {
        setDownloadModalOpen(false)
        setDownloadPdfData(null)
        // Optionally refresh data to show the updated state
        fetchData()
    }

    // Handler for manual template download (for managers/admins)
    const handleDownloadTemplate = () => {
        const link = document.createElement('a')
        link.href = '/templates/test_requisition_form.pdf'
        link.download = `Test_Requisition_Form_${ticket?.uid || 'Template'}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // --- Helpers ---

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getSystemStatusTime = (stageId: string, stageName: string, t: Ticket) => {
        // Source 1: Check status transitions (The "Register" - most accurate for custom stages)
        const transition = t.status_transitions?.find(st => st.to_stage_id === stageId)
        if (transition) return transition.created_at // Or transition_date + time if stored separately

        // Source 2: Fallback to system status fields (For backward compatibility and core stages)
        const name = stageName.toLowerCase()
        if (name === 'new') return t.status_new_at
        if (name === 'sample collected') return t.status_sample_collected_at
        if (name === 'sample received') return t.status_sample_received_at
        if (name === 'sample sent to') return t.status_sample_sent_at
        if (name === 'analyzed') return t.status_analyzed_at
        if (name === 'report received') return t.status_report_received_at
        if (name === 'final report generated') return t.status_final_report_generated_at
        if (name === 'report submission') return t.status_report_submitted_at
        return null
    }

    const getCustomValue = (columnId: string) => {
        return formData.custom_values[columnId] || ''
    }

    const setCustomValue = (columnId: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            custom_values: { ...prev.custom_values, [columnId]: value },
        }))
    }

    const handleDiagnosticEdit = (diagId: string, field: 'label_code' | 'sent_to_lab_id', value: string) => {
        setDiagnosticEdits(prev => ({
            ...prev,
            [diagId]: { ...prev[diagId], [field]: value },
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="spinner spinner-lg" />
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ticket not found</h2>
                <Link href="/tickets" className="text-[var(--primary-600)] hover:underline mt-2 inline-block">
                    Back to tickets
                </Link>
            </div>
        )
    }

    const typeInfo = ticketTypeLabels[ticket.type]
    const filteredDoctors = formData.hospital_id
        ? doctors.filter(d => d.hospital_id === formData.hospital_id)
        : doctors

    // Find next likely stage
    const currentStageIndex = stages.findIndex(s => s.id === ticket.current_stage_id)
    const nextStage = currentStageIndex !== -1 && currentStageIndex < stages.length - 1
        ? stages[currentStageIndex + 1]
        : null

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-10">
            <StatusChangeModal
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                onConfirm={handleConfirmStatusChange}
                onDownloadRequired={handleDownloadRequired}
                targetStage={targetStage}
                currentStageId={ticket.current_stage_id}
                ticketId={ticket.id}
                ticketData={ticket}
                currentUserRole={currentUser?.role}
            />


            {/* Mandatory Download Modal - Cannot be dismissed until download is done */}
            <DownloadRequiredModal
                isOpen={downloadModalOpen}
                onComplete={handleDownloadComplete}
                onConfirmTransition={handleConfirmStatusChange}
                pdfData={downloadPdfData}
            />

            {/* Cancel Ticket Modal */}
            <CancelTicketModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleCancelTicket}
                ticketUid={ticket.uid}
            />

            {/* Back Link */}
            <Link href="/tickets" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
                <ArrowLeft size={18} />
                <span>Back to Tickets</span>
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight truncate">{ticket.uid}</h1>
                        {(() => {
                            const diagLabelCodes = ticket.diagnostics?.filter((d: any) => !d.is_cancelled && d.label_code).map((d: any) => d.label_code) || []
                            if (diagLabelCodes.length > 0) {
                                return diagLabelCodes.map((code: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                                        <Package size={14} />
                                        <span className="text-xs font-bold uppercase tracking-tight">Label: {code}</span>
                                    </div>
                                ))
                            }
                            if (ticket.label_code) {
                                return (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                                        <Package size={14} />
                                        <span className="text-xs font-bold uppercase tracking-tight">Label: {ticket.label_code}</span>
                                    </div>
                                )
                            }
                            return null
                        })()}
                        <div className="flex flex-wrap gap-2">
                            <Badge color={typeInfo.color} className="text-sm px-3 py-1">{typeInfo.label}</Badge>
                            {ticket.action_subtype && (
                                <Badge
                                    color={ticket.action_subtype === 'diagnostics' ? '#a855f7' : '#14b8a6'}
                                    className="text-sm px-3 py-1 capitalize"
                                >
                                    {ticket.action_subtype}
                                </Badge>
                            )}
                            {ticket.type === 'query' && ticket.query_category && (
                                <Badge
                                    color={
                                        ticket.query_category === 'report_related' ? '#3b82f6' :
                                            ticket.query_category === 'scientific' ? '#a855f7' :
                                                ticket.query_category === 'billing_related' ? '#10b981' :
                                                    '#6b7280'
                                    }
                                    className="text-sm px-3 py-1"
                                >
                                    {ticket.query_category === 'report_related' && '📄 Report Related'}
                                    {ticket.query_category === 'scientific' && '🔬 Scientific'}
                                    {ticket.query_category === 'billing_related' && '💰 Billing Related'}
                                    {ticket.query_category === 'others' && '📋 Others'}
                                </Badge>
                            )}
                            {ticket.current_stage && (
                                <Badge color={ticket.current_stage.color} className="text-sm px-3 py-1">{ticket.current_stage.name}</Badge>
                            )}
                            {ticket.is_cancelled && (
                                <Badge color="#dc2626" className="text-sm px-3 py-1 flex items-center gap-1">
                                    <Ban size={12} />
                                    Cancelled
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-[var(--text-secondary)] mt-2 flex items-center gap-2 text-sm">
                        <Clock size={14} /> Created {formatDate(ticket.created_at)}
                        {ticket.creator && <span className="hidden sm:inline text-[var(--text-muted)]">• by {ticket.creator.full_name}</span>}
                    </p>
                </div>
                {/* Edit Controls */}
                <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                    {(canEditMetadata || canEditWorkflow) ? (
                        isEditing ? (
                            <>
                                <Button variant="secondary" onClick={() => { setIsEditing(false); setAddDiagnosticIds([]); setRemoveDiagnosticIds([]); setEditServiceTypeId('') }}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} isLoading={saving} leftIcon={<Save size={16} />}>
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Download Template Button (Admin/Manager Only) */}
                                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                    <Button
                                        variant="secondary"
                                        className="justify-center whitespace-nowrap"
                                        onClick={handleDownloadTemplate}
                                        leftIcon={<FileDown size={16} />}
                                        title="Download test requisition form template"
                                    >
                                        TRF
                                    </Button>
                                )}
                                {/* Delete Button (Admin/Manager Only) */}
                                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                    <Button
                                        variant="danger"
                                        className="justify-center whitespace-nowrap"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
                                                handleDelete()
                                            }
                                        }}
                                        isLoading={deleting}
                                        leftIcon={<Trash2 size={16} />}
                                    >
                                        Delete
                                    </Button>
                                )}
                                {/* Cancel Button */}
                                {canCancel && !ticket.is_cancelled && (
                                    <Button
                                        variant="secondary"
                                        className="justify-center whitespace-nowrap !text-red-600 !border-red-300 hover:!bg-red-50"
                                        onClick={() => setCancelModalOpen(true)}
                                        leftIcon={<Ban size={16} />}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button className="justify-center whitespace-nowrap" onClick={() => {
                                    setIsEditing(true)
                                    setAddDiagnosticIds([])
                                    setRemoveDiagnosticIds([])
                                    setEditServiceTypeId(ticket.service_type_id || '')
                                    // Re-init diagnostic edits from current ticket state
                                    const initEdits: Record<string, { label_code: string; sent_to_lab_id: string }> = {}
                                    ticket.diagnostics?.forEach((d: TicketDiagnostic) => {
                                        initEdits[d.id] = { label_code: d.label_code || '', sent_to_lab_id: d.sent_to_lab_id || '' }
                                    })
                                    setDiagnosticEdits(initEdits)
                                }} leftIcon={<Edit2 size={16} />}>
                                    Edit Ticket
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--gray-100)] text-[var(--text-secondary)]">
                            <Eye size={16} />
                            <span className="text-sm font-medium">View Only</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20">
                    <AlertCircle className="w-5 h-5 text-[var(--error-600)] flex-shrink-0" />
                    <p className="text-sm text-[var(--error-600)]">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Metadata & Message */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Ticket Information (Metadata) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity size={20} className="text-[var(--primary-600)]" />
                                Ticket Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Patient Information - Dynamic based on service type */}
                            <div className="space-y-4">
                                {(() => {
                                    // Compute patient type visibility from diagnostics or single service type
                                    const isMultiDiag = ticket.diagnostics && ticket.diagnostics.length > 0
                                    const aggPt = isMultiDiag
                                        ? getAggregatePatientType(ticket.diagnostics!)
                                        : null
                                    const singlePt = ticket.service_type?.patient_type || 'couple'
                                    const detailShowMale = ticket.type !== 'action' || (isMultiDiag ? aggPt!.showMale : (singlePt === 'couple' || singlePt === 'male_only'))
                                    const detailShowFemale = ticket.type === 'action' && (isMultiDiag ? aggPt!.showFemale : (singlePt === 'couple' || singlePt === 'female_only'))
                                    const patientTypeLabel = isMultiDiag
                                        ? (aggPt!.showMale && aggPt!.showFemale ? 'Couple' : aggPt!.showMale ? 'Male Only' : aggPt!.showFemale ? 'Female Only' : null)
                                        : (ticket.service_type?.patient_type ? ticket.service_type.patient_type.replace('_', ' ') : null)

                                    return (<>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                                Patient Details
                                            </label>
                                            {patientTypeLabel && (
                                                <Badge variant="default" size="sm" className="capitalize">
                                                    {patientTypeLabel}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Husband / Patient 1 */}
                                            {detailShowMale && (
                                                <div className={`p-4 rounded-xl border ${isEditing ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-[var(--border-default)]'} hover:shadow-md transition-all duration-200 shadow-sm`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100/80 text-blue-600 shadow-sm">
                                                            <span className="text-sm font-bold">♂</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block leading-none">Primary</span>
                                                            <span className="text-xs font-semibold text-[var(--text-secondary)]">Husband / Patient</span>
                                                        </div>
                                                    </div>

                                                    {isEditing && canEditMetadata ? (
                                                        <div className="space-y-3">
                                                            <Input
                                                                label="Full Name"
                                                                value={formData.patient_name}
                                                                onChange={(e) => setFormData(p => ({ ...p, patient_name: e.target.value }))}
                                                                placeholder="Full Name"
                                                            />
                                                            <Input
                                                                label="Age"
                                                                type="number"
                                                                value={formData.patient_age_1}
                                                                onChange={(e) => setFormData(p => ({ ...p, patient_age_1: e.target.value }))}
                                                                placeholder="Age"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                                                                {ticket.patient_name || <span className="text-[var(--text-muted)] italic font-normal">Not provided</span>}
                                                            </p>
                                                            {ticket.patient_age_1 && (
                                                                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                                                    <Clock size={12} className="text-blue-400" />
                                                                    {ticket.patient_age_1} years old
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Wife / Patient 2 */}
                                            {detailShowFemale && (
                                                <div className={`p-4 rounded-xl border ${isEditing ? 'bg-pink-50/40 border-pink-200' : 'bg-white border-[var(--border-default)]'} hover:shadow-md transition-all duration-200 shadow-sm`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-100/80 text-pink-600 shadow-sm">
                                                            <span className="text-sm font-bold">♀</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider block leading-none">Secondary</span>
                                                            <span className="text-xs font-semibold text-[var(--text-secondary)]">Wife / Female Patient</span>
                                                        </div>
                                                    </div>

                                                    {isEditing && canEditMetadata ? (
                                                        <div className="space-y-3">
                                                            <Input
                                                                label="Full Name"
                                                                value={formData.patient_name_2}
                                                                onChange={(e) => setFormData(p => ({ ...p, patient_name_2: e.target.value }))}
                                                                placeholder="Full Name"
                                                            />
                                                            <Input
                                                                label="Age"
                                                                type="number"
                                                                value={formData.patient_age_2}
                                                                onChange={(e) => setFormData(p => ({ ...p, patient_age_2: e.target.value }))}
                                                                placeholder="Age"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                                                                {ticket.patient_name_2 || <span className="text-[var(--text-muted)] italic font-normal">Not provided</span>}
                                                            </p>
                                                            {ticket.patient_age_2 && (
                                                                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                                                    <Clock size={12} className="text-pink-400" />
                                                                    {ticket.patient_age_2} years old
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>)
                                })()}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Hospital */}
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Hospital</label>
                                    {isEditing && canEditMetadata ? (
                                        <SearchableSelect
                                            placeholder="Select hospital"
                                            options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                                            value={formData.hospital_id}
                                            onChange={(val) => setFormData(p => ({ ...p, hospital_id: val }))}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Building2 size={18} className="text-[var(--text-muted)]" />
                                            <span className="font-medium">{ticket.hospital?.name || '-'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Doctor */}
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Doctor</label>
                                    {isEditing && canEditMetadata ? (
                                        <Select
                                            placeholder="Select doctor"
                                            options={[{ value: '', label: 'No Doctor' }, ...filteredDoctors.map(d => ({ value: d.id, label: d.name }))]}
                                            value={formData.doctor_id}
                                            onChange={(e) => setFormData(p => ({ ...p, doctor_id: e.target.value }))}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Stethoscope size={18} className="text-[var(--text-muted)]" />
                                            <span className="font-medium">{ticket.doctor?.name || <span className="text-[var(--text-muted)] italic">No Doctor</span>}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Subtype & Type (Editable only for consistency if needed, usually fixed but adding for completeness) */}
                            {isEditing && canEditMetadata && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-default)]">
                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Ticket Type</label>
                                        <Select
                                            value={formData.type}
                                            onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                                            options={[
                                                { value: 'action', label: 'Action' },
                                                { value: 'query', label: 'Query' },
                                                { value: 'info', label: 'Info' },
                                            ]}
                                        />
                                    </div>
                                    {formData.type === 'action' && (
                                        <div>
                                            <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Action Subtype</label>
                                            <div className="flex gap-2">
                                                {['diagnostics', 'therapeutics'].map((st) => (
                                                    <button
                                                        key={st}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, action_subtype: st as any }))}
                                                        className={`px-3 py-2 rounded-md border text-sm capitalize transition-colors
                                                            ${formData.action_subtype === st
                                                                ? 'bg-[var(--primary-50)] border-[var(--primary-500)] text-[var(--primary-700)] font-medium'
                                                                : 'bg-white border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--gray-50)]'
                                                            }
                                                        `}
                                                    >
                                                        {st}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Service Type Details - Display when available */}
                            {/* Multi-diagnostic: show all diagnostic service types */}
                            {ticket.diagnostics && ticket.diagnostics.length > 0 ? (
                                <div className="pt-4 border-t border-[var(--border-default)]">
                                    <h4 className="font-semibold text-[var(--primary-800)] mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[var(--primary-600)]"></span>
                                        Diagnostic Services ({ticket.diagnostics.filter((d: TicketDiagnostic) => !d.is_cancelled && !removeDiagnosticIds.includes(d.id)).length}{addDiagnosticIds.length > 0 ? ` + ${addDiagnosticIds.length} new` : ''})
                                    </h4>
                                    <div className="space-y-3">
                                        {ticket.diagnostics.filter((d: TicketDiagnostic) => !d.is_cancelled).map((diag: TicketDiagnostic) => (
                                            <div key={diag.id} className={`bg-[var(--primary-50)]/30 rounded-lg p-4 border border-[var(--primary-200)] ${removeDiagnosticIds.includes(diag.id) ? 'opacity-40 line-through' : ''}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="font-medium text-[var(--primary-800)]">{diag.service_type?.name || 'Unknown'}</p>
                                                    {isEditing && canEditMetadata && (
                                                        removeDiagnosticIds.includes(diag.id) ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs text-[var(--primary-600)]"
                                                                onClick={() => setRemoveDiagnosticIds(prev => prev.filter(rid => rid !== diag.id))}
                                                            >
                                                                Undo Remove
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs text-[var(--error-600)] hover:bg-[var(--error-50)]"
                                                                onClick={() => setRemoveDiagnosticIds(prev => [...prev, diag.id])}
                                                                leftIcon={<X size={14} />}
                                                            >
                                                                Remove
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                                {!removeDiagnosticIds.includes(diag.id) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                        {diag.service_type?.kit && (
                                                            <div className="bg-white/60 rounded-md p-3">
                                                                <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Kit</span>
                                                                <p className="text-[var(--text-primary)]">{diag.service_type.kit}</p>
                                                            </div>
                                                        )}
                                                        {diag.service_type?.requirements && (
                                                            <div className="bg-white/60 rounded-md p-3">
                                                                <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Requirements</span>
                                                                <p className="text-[var(--text-primary)]">{diag.service_type.requirements}</p>
                                                            </div>
                                                        )}
                                                        {diag.service_type?.protocol && (
                                                            <div className="bg-white/60 rounded-md p-3">
                                                                <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Protocol</span>
                                                                <p className="text-[var(--text-primary)]">{diag.service_type.protocol}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Show newly added diagnostics */}
                                        {addDiagnosticIds.map(stId => {
                                            const st = serviceTypes.find(s => s.id === stId)
                                            return st ? (
                                                <div key={stId} className="bg-green-50/50 rounded-lg p-4 border border-green-300 border-dashed">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-green-800 flex items-center gap-2">
                                                            <Plus size={14} /> {st.name}
                                                            <span className="text-xs font-normal text-green-600">(new)</span>
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs text-[var(--error-600)] hover:bg-[var(--error-50)]"
                                                            onClick={() => setAddDiagnosticIds(prev => prev.filter(aid => aid !== stId))}
                                                            leftIcon={<X size={14} />}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null
                                        })}
                                    </div>

                                    {/* Add new diagnostics selector */}
                                    {isEditing && canEditMetadata && (
                                        <div className="mt-4">
                                            <SearchableMultiSelect
                                                label="Add Diagnostic Tests"
                                                placeholder="Search and select tests to add..."
                                                options={serviceTypes
                                                    .filter((st) => st.category === 'diagnostics' && st.is_active)
                                                    .filter((st) => {
                                                        // Exclude already existing active diagnostics and already queued additions
                                                        const existingIds = ticket.diagnostics
                                                            ?.filter((d: TicketDiagnostic) => !d.is_cancelled && !removeDiagnosticIds.includes(d.id))
                                                            .map((d: TicketDiagnostic) => d.service_type_id) || []
                                                        return !existingIds.includes(st.id)
                                                    })
                                                    .map((st) => ({
                                                        value: st.id,
                                                        label: st.name,
                                                        description: st.kit ? `Kit: ${st.kit}` : undefined,
                                                    }))}
                                                value={addDiagnosticIds}
                                                onChange={setAddDiagnosticIds}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : ticket.service_type || (isEditing && canEditMetadata && formData.type === 'action') ? (
                                <div className="pt-4 border-t border-[var(--border-default)]">
                                    {/* Editing mode: allow changing the service type */}
                                    {isEditing && canEditMetadata && formData.type === 'action' ? (
                                        <div>
                                            <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">
                                                {formData.action_subtype === 'therapeutics' ? 'Therapeutic Service' : 'Service Type'}
                                            </label>
                                            <Select
                                                value={editServiceTypeId}
                                                onChange={(e) => setEditServiceTypeId(e.target.value)}
                                                options={[
                                                    { value: '', label: 'Select a service...' },
                                                    ...serviceTypes
                                                        .filter((st) => st.category === (formData.action_subtype || 'therapeutics') && st.is_active)
                                                        .map((st) => ({ value: st.id, label: st.name }))
                                                ]}
                                            />
                                            {/* Show details of selected service */}
                                            {(() => {
                                                const selectedSt = serviceTypes.find(st => st.id === editServiceTypeId)
                                                if (!selectedSt) return null
                                                return (
                                                    <div className="mt-3 bg-[var(--primary-50)]/30 rounded-lg p-4 border border-[var(--primary-200)]">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            {selectedSt.kit && (
                                                                <div className="bg-white/60 rounded-md p-3">
                                                                    <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Kit to Carry</span>
                                                                    <p className="text-[var(--text-primary)]">{selectedSt.kit}</p>
                                                                </div>
                                                            )}
                                                            {selectedSt.requirements && (
                                                                <div className="bg-white/60 rounded-md p-3">
                                                                    <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Requirements</span>
                                                                    <p className="text-[var(--text-primary)]">{selectedSt.requirements}</p>
                                                                </div>
                                                            )}
                                                            {selectedSt.protocol && (
                                                                <div className="bg-white/60 rounded-md p-3">
                                                                    <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Protocol</span>
                                                                    <p className="text-[var(--text-primary)]">{selectedSt.protocol}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : ticket.service_type ? (
                                        <div className="bg-[var(--primary-50)]/30 rounded-lg p-4 border border-[var(--primary-200)]">
                                            <h4 className="font-semibold text-[var(--primary-800)] mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[var(--primary-600)]"></span>
                                                Selected Service: {ticket.service_type.name}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                {ticket.service_type.kit && (
                                                    <div className="bg-white/60 rounded-md p-3">
                                                        <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Kit to Carry</span>
                                                        <p className="text-[var(--text-primary)]">{ticket.service_type.kit}</p>
                                                    </div>
                                                )}
                                                {ticket.service_type.requirements && (
                                                    <div className="bg-white/60 rounded-md p-3">
                                                        <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Requirements</span>
                                                        <p className="text-[var(--text-primary)]">{ticket.service_type.requirements}</p>
                                                    </div>
                                                )}
                                                {ticket.service_type.protocol && (
                                                    <div className="bg-white/60 rounded-md p-3">
                                                        <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">Protocol</span>
                                                        <p className="text-[var(--text-primary)]">{ticket.service_type.protocol}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                        </CardContent>
                    </Card>

                    {/* Diagnostics Tracker — Multi-diagnostic tickets */}
                    {ticket.diagnostics && ticket.diagnostics.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FlaskConical size={20} className="text-[var(--primary-600)]" />
                                    Diagnostics Tracker ({ticket.diagnostics.filter((d: TicketDiagnostic) => !d.is_cancelled).length} active)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--border-default)]">
                                                <th className="text-left py-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Test</th>
                                                <th className="text-left py-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                                                <th className="text-left py-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Label Code</th>
                                                <th className="text-left py-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Lab</th>
                                                <th className="text-left py-2 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Raw Report</th>
                                                <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase">Final Report</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ticket.diagnostics.map((diag: TicketDiagnostic) => {
                                                const statusColor = diagnosticStatusColor(diag.status)
                                                return (
                                                    <tr key={diag.id} className={`border-b border-[var(--border-light)] ${diag.is_cancelled ? 'opacity-40' : ''}`}>
                                                        <td className="py-3 pr-3">
                                                            <span className="font-medium text-[var(--text-primary)]">
                                                                {diag.service_type?.name || 'Unknown'}
                                                            </span>
                                                            {diag.is_cancelled && (
                                                                <Badge color="#ef4444" size="sm" className="ml-2">Cancelled</Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <span
                                                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                                                            >
                                                                {diagnosticStatusLabel(diag.status)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            {isEditing && canEditWorkflow && !diag.is_cancelled ? (
                                                                <input
                                                                    type="text"
                                                                    value={diagnosticEdits[diag.id]?.label_code ?? ''}
                                                                    onChange={(e) => handleDiagnosticEdit(diag.id, 'label_code', e.target.value)}
                                                                    placeholder="Enter code..."
                                                                    className="w-28 text-xs font-mono px-2 py-1 border border-[var(--border-default)] rounded bg-white focus:outline-none focus:border-[var(--primary-400)]"
                                                                />
                                                            ) : (
                                                                <span className="text-[var(--text-secondary)] font-mono text-xs">
                                                                    {diag.label_code || '-'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            {isEditing && canEditWorkflow && !diag.is_cancelled ? (
                                                                <select
                                                                    value={diagnosticEdits[diag.id]?.sent_to_lab_id ?? ''}
                                                                    onChange={(e) => handleDiagnosticEdit(diag.id, 'sent_to_lab_id', e.target.value)}
                                                                    className="text-xs px-2 py-1 border border-[var(--border-default)] rounded bg-white focus:outline-none focus:border-[var(--primary-400)] max-w-[130px]"
                                                                >
                                                                    <option value="">Select lab...</option>
                                                                    {labs.map(lab => (
                                                                        <option key={lab.id} value={lab.id}>{lab.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-[var(--text-secondary)]">
                                                                    {diag.lab?.name || '-'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            {diag.raw_report_url ? (
                                                                <span className="inline-flex items-center gap-2 flex-wrap">
                                                                    <a
                                                                        href={diag.raw_report_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success-600)] hover:text-[var(--success-700)]"
                                                                    >
                                                                        <Download size={12} /> Download
                                                                    </a>
                                                                    {currentUser && canEditWorkflow && !diag.is_cancelled && (
                                                                        <>
                                                                            <ReplaceDocumentButton
                                                                                ticketId={id}
                                                                                documentType="raw_report"
                                                                                diagnosticId={diag.id}
                                                                                currentUserRole={currentUser.role}
                                                                                onReplaced={() => fetchData()}
                                                                                onError={setError}
                                                                                label="Replace"
                                                                                className="text-xs text-[var(--primary-600)] hover:underline"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                title="Delete raw report"
                                                                                onClick={async () => {
                                                                                    if (!confirm('Delete this raw report?')) return
                                                                                    const res = await fetch(`/api/ticket-diagnostics/${diag.id}`, {
                                                                                        method: 'PATCH',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ raw_report_url: null }),
                                                                                    })
                                                                                    const data = await res.json()
                                                                                    if (data.success) fetchData()
                                                                                    else setError(data.error || 'Failed to delete report')
                                                                                }}
                                                                                className="text-xs text-[var(--error-600)] hover:underline"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            ) : canEditWorkflow && !diag.is_cancelled && currentUser ? (
                                                                <ReplaceDocumentButton
                                                                    ticketId={id}
                                                                    documentType="raw_report"
                                                                    diagnosticId={diag.id}
                                                                    currentUserRole={currentUser.role}
                                                                    onReplaced={() => fetchData()}
                                                                    onError={setError}
                                                                    label="Upload"
                                                                    className="text-xs font-medium text-[var(--success-600)] hover:underline"
                                                                />
                                                            ) : (
                                                                <span className="text-[var(--text-muted)]">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3">
                                                            {diag.final_report_url ? (
                                                                <span className="inline-flex items-center gap-2 flex-wrap">
                                                                    <a
                                                                        href={diag.final_report_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                                                                    >
                                                                        <Download size={12} /> Download
                                                                    </a>
                                                                    {currentUser && canEditWorkflow && !diag.is_cancelled && (
                                                                        <>
                                                                            <ReplaceDocumentButton
                                                                                ticketId={id}
                                                                                documentType="final_report"
                                                                                diagnosticId={diag.id}
                                                                                currentUserRole={currentUser.role}
                                                                                onReplaced={() => fetchData()}
                                                                                onError={setError}
                                                                                label="Replace"
                                                                                className="text-xs text-[var(--primary-600)] hover:underline"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                title="Delete final report"
                                                                                onClick={async () => {
                                                                                    if (!confirm('Delete this final report?')) return
                                                                                    const res = await fetch(`/api/ticket-diagnostics/${diag.id}`, {
                                                                                        method: 'PATCH',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ final_report_url: null }),
                                                                                    })
                                                                                    const data = await res.json()
                                                                                    if (data.success) fetchData()
                                                                                    else setError(data.error || 'Failed to delete report')
                                                                                }}
                                                                                className="text-xs text-[var(--error-600)] hover:underline"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            ) : canEditWorkflow && !diag.is_cancelled && currentUser ? (
                                                                <ReplaceDocumentButton
                                                                    ticketId={id}
                                                                    documentType="final_report"
                                                                    diagnosticId={diag.id}
                                                                    currentUserRole={currentUser.role}
                                                                    onReplaced={() => fetchData()}
                                                                    onError={setError}
                                                                    label="Upload"
                                                                    className="text-xs font-medium text-[var(--primary-600)] hover:underline"
                                                                />
                                                            ) : (
                                                                <span className="text-[var(--text-muted)]">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Message Context */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare size={20} className="text-[var(--primary-600)]" />
                                Request Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Screenshot Display (Primary) */}
                            {((ticket.screenshot_url && !isScreenshotDeleted) || screenshotPreview) && (
                                <div className="mb-6">
                                    <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                        WhatsApp Screenshot
                                    </label>
                                    <div className="relative group max-w-2xl">
                                        <div
                                            className={`relative rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--gray-50)] shadow-sm ${!isEditing ? 'cursor-pointer' : ''}`}
                                            onClick={() => !isEditing && window.open(screenshotPreview || ticket.screenshot_url!, '_blank')}
                                        >
                                            <img
                                                src={screenshotPreview || ticket.screenshot_url!}
                                                alt="WhatsApp Screenshot"
                                                className="w-full max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                                            />
                                            {!isEditing && (
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-primary)] shadow-md flex items-center gap-2">
                                                        <Eye size={16} />
                                                        Click to view full size
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isEditing && canEditMetadata && (
                                            <div className="absolute top-2 right-2 flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="shadow-lg backdrop-blur-md bg-white/80"
                                                    onClick={() => screenshotInputRef.current?.click()}
                                                    isLoading={screenshotUploading}
                                                    leftIcon={<Upload size={14} />}
                                                >
                                                    Replace
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    className="shadow-lg"
                                                    onClick={() => {
                                                        setScreenshotFile(null)
                                                        setScreenshotPreview(null)
                                                        setIsScreenshotDeleted(true)
                                                    }}
                                                    leftIcon={<Trash2 size={14} />}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={screenshotInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleScreenshotSelect}
                                    />
                                </div>
                            )}

                            {isEditing && (isScreenshotDeleted || !ticket.screenshot_url) && !screenshotPreview && (
                                <div className="mb-6">
                                    <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                        WhatsApp Screenshot
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => screenshotInputRef.current?.click()}
                                        className="w-full py-8 border-2 border-dashed border-[var(--border-default)] rounded-xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--primary-300)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-50)]/30 transition-all group"
                                    >
                                        <div className="p-3 rounded-full bg-[var(--gray-50)] group-hover:bg-[var(--primary-100)] transition-colors">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <span className="font-medium">Upload WhatsApp Screenshot</span>
                                        <span className="text-xs">PNG, JPG or WEBP (Max 5MB)</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={screenshotInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleScreenshotSelect}
                                    />
                                </div>
                            )}

                            {/* TRF Document Display */}
                            {((ticket.trf_image_url || (ticket.trf_image_urls && ticket.trf_image_urls.length > 0)) || newTrfFiles.length > 0) && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                                            Test Requisition Form (TRF)
                                            {((ticket.trf_image_urls?.length || 0) - deletedTrfUrls.length + newTrfFiles.length) > 1 && (
                                                <span className="text-xs font-normal text-[var(--text-muted)]">
                                                    ({(ticket.trf_image_urls?.length || 0) - deletedTrfUrls.length + newTrfFiles.length} pages total)
                                                </span>
                                            )}
                                        </label>
                                        <span className="flex items-center gap-2">
                                            {!isEditing && currentUser && (ticket.trf_image_url || (ticket.trf_image_urls && ticket.trf_image_urls.length > 0)) && (
                                                <ReplaceDocumentButton
                                                    ticketId={id}
                                                    documentType="trf"
                                                    currentUserRole={currentUser.role}
                                                    onReplaced={() => fetchData()}
                                                    onError={setError}
                                                    label="Replace first page"
                                                    className="text-xs font-medium text-[var(--primary-600)] hover:underline"
                                                />
                                            )}
                                            {isEditing && canEditMetadata && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => trfInputRef.current?.click()}
                                                    isLoading={trfUploading}
                                                    leftIcon={<Plus size={14} />}
                                                >
                                                    Add Page
                                                </Button>
                                            )}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Existing TRF Uploads */}
                                        {ticket.trf_image_urls?.filter(url => !deletedTrfUrls.includes(url)).map((url, index) => (
                                            <div key={index} className="group relative flex flex-col gap-2 p-3 border border-[var(--border-default)] rounded-xl bg-[var(--gray-50)] shadow-sm hover:shadow-md transition-all">
                                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-[var(--border-default)] bg-white">
                                                    {url.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--error-50)] text-[var(--error-600)]">
                                                            <FileText size={40} />
                                                            <span className="text-xs font-bold mt-2 uppercase">PDF Document</span>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            alt={`TRF Page ${index + 1}`}
                                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                                            onClick={() => !isEditing && window.open(url, '_blank')}
                                                        />
                                                    )}

                                                    {!isEditing && (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <a href={url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                                <Download size={18} />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-2 mt-1 px-1">
                                                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Page {index + 1}</span>
                                                    {isEditing && canEditMetadata && (
                                                        <button
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            onClick={() => setDeletedTrfUrls(prev => [...prev, url])}
                                                            title="Delete this page"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* New TRF Uploads (Pending Save) */}
                                        {newTrfFiles.map((file, index) => (
                                            <div key={`new-${index}`} className="group relative flex flex-col gap-2 p-3 border border-dashed border-[var(--primary-300)] rounded-xl bg-[var(--primary-50)]/30 shadow-sm animate-pulse-subtle">
                                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-[var(--primary-100)] bg-white">
                                                    {file.type === 'application/pdf' ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--error-600)]">
                                                            <FileText size={40} />
                                                            <span className="text-xs font-bold mt-2 uppercase">New PDF</span>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={newTrfPreviews[index]}
                                                            alt={`New TRF Page ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">NEW</div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1 px-1">
                                                    <span className="text-xs font-medium text-[var(--primary-700)] truncate max-w-[120px]">{file.name}</span>
                                                    <button
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setNewTrfFiles(prev => prev.filter((_, i) => i !== index))
                                                            setNewTrfPreviews(prev => prev.filter((_, i) => i !== index))
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="file"
                                        ref={trfInputRef}
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        multiple
                                        onChange={handleTrfFileSelect}
                                    />
                                </div>
                            )}

                            {isEditing && !ticket.trf_image_url && (!ticket.trf_image_urls || ticket.trf_image_urls.length === 0) && newTrfFiles.length === 0 && (
                                <div className="mb-6">
                                    <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                        Test Requisition Form (TRF)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => trfInputRef.current?.click()}
                                        className="w-full py-8 border-2 border-dashed border-[var(--border-default)] rounded-xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--primary-300)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-50)]/30 transition-all group"
                                    >
                                        <div className="p-3 rounded-full bg-[var(--gray-50)] group-hover:bg-[var(--primary-100)] transition-colors">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <span className="font-medium">Upload TRF document</span>
                                        <span className="text-xs">Select one or more images/PDFs</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={trfInputRef}
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        multiple
                                        onChange={handleTrfFileSelect}
                                    />
                                </div>
                            )}

                            {/* Sample & Courier Images — Multi-diagnostic */}
                            {ticket.diagnostics && ticket.diagnostics.length > 0 ? (
                                (() => {
                                    const activeDiags = ticket.diagnostics.filter((d: TicketDiagnostic) => !d.is_cancelled)
                                    // In edit mode (admin/manager), show all active diagnostics so they can upload
                                    const diagsToShow = (isEditing && canEditWorkflow)
                                        ? activeDiags
                                        : activeDiags.filter((d: TicketDiagnostic) => d.sample_image_url || d.courier_image_url)
                                    if (diagsToShow.length === 0) return null
                                    return (
                                        <div className="mb-6 space-y-4">
                                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                                Sample Collection Images
                                            </label>
                                            {diagsToShow.map((diag: TicketDiagnostic) => (
                                                <div key={diag.id} className="p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--border-default)]">
                                                    <p className="text-sm font-semibold text-[var(--primary-700)] mb-3">{diag.service_type?.name || 'Unknown'}</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {diag.sample_image_url ? (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">Sample Image</p>
                                                                <div
                                                                    className="relative rounded-lg border border-[var(--border-default)] overflow-hidden bg-white cursor-pointer group"
                                                                    onClick={() => window.open(diag.sample_image_url!, '_blank')}
                                                                >
                                                                    <img src={diag.sample_image_url} alt="Sample" className="w-full h-auto object-contain max-h-[300px]" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-primary)] shadow-md">
                                                                            Click to view full size
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isEditing && canEditWorkflow && currentUser && (
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="sample_image"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Replace Image"
                                                                        className="mt-1.5 text-xs text-[var(--primary-600)] hover:underline"
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : isEditing && canEditWorkflow && currentUser ? (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">Sample Image</p>
                                                                <ReplaceDocumentButton
                                                                    ticketId={id}
                                                                    documentType="sample_image"
                                                                    diagnosticId={diag.id}
                                                                    currentUserRole={currentUser.role}
                                                                    onReplaced={() => fetchData()}
                                                                    onError={setError}
                                                                    label="Upload Sample Image"
                                                                    className="text-xs text-[var(--primary-600)] hover:underline"
                                                                />
                                                            </div>
                                                        ) : null}
                                                        {diag.courier_image_url ? (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">Courier Details</p>
                                                                <div
                                                                    className="relative rounded-lg border border-[var(--border-default)] overflow-hidden bg-white cursor-pointer group"
                                                                    onClick={() => window.open(diag.courier_image_url!, '_blank')}
                                                                >
                                                                    <img src={diag.courier_image_url} alt="Courier" className="w-full h-auto object-contain max-h-[300px]" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-primary)] shadow-md">
                                                                            Click to view full size
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isEditing && canEditWorkflow && currentUser && (
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="courier_image"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Replace Image"
                                                                        className="mt-1.5 text-xs text-[var(--primary-600)] hover:underline"
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : isEditing && canEditWorkflow && currentUser ? (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">Courier Details</p>
                                                                <ReplaceDocumentButton
                                                                    ticketId={id}
                                                                    documentType="courier_image"
                                                                    diagnosticId={diag.id}
                                                                    currentUserRole={currentUser.role}
                                                                    onReplaced={() => fetchData()}
                                                                    onError={setError}
                                                                    label="Upload Courier Image"
                                                                    className="text-xs text-[var(--primary-600)] hover:underline"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })()
                            ) : (
                                <>
                                    {/* Legacy: Sample Image Display */}
                                    {ticket.sample_image_url && (
                                        <div className="mb-6">
                                            <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                                Sample Image
                                            </label>
                                            <div
                                                className="relative rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--gray-50)] cursor-pointer group w-full max-w-md"
                                                onClick={() => window.open(ticket.sample_image_url!, '_blank')}
                                            >
                                                <img src={ticket.sample_image_url} alt="Sample" className="w-full h-auto object-contain max-h-[400px]" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-primary)] shadow-md">
                                                        Click to view full size
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Legacy: Courier Image Display */}
                                    {ticket.courier_image_url && (
                                        <div className="mb-6">
                                            <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                                Courier Details
                                            </label>
                                            <div
                                                className="relative rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--gray-50)] cursor-pointer group w-full max-w-md"
                                                onClick={() => window.open(ticket.courier_image_url!, '_blank')}
                                            >
                                                <img src={ticket.courier_image_url} alt="Courier Details" className="w-full h-auto object-contain max-h-[400px]" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-[var(--text-primary)] shadow-md">
                                                        Click to view full size
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Backoffice Lab Dispatch Images */}
                            {(() => {
                                // Multi-diagnostic: check per-diagnostic backoffice images
                                if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                                    const activeDiags = ticket.diagnostics.filter((d: TicketDiagnostic) => !d.is_cancelled)
                                    // In edit mode (admin/manager), show all active diagnostics so they can upload
                                    const diagsToShow = (isEditing && canEditWorkflow)
                                        ? activeDiags
                                        : activeDiags.filter((d: TicketDiagnostic) => d.tagged_sample_image_url || d.backoffice_courier_image_url)
                                    if (diagsToShow.length === 0) return null
                                    return (
                                        <Card className="mb-6">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Package size={20} className="text-[var(--primary-600)]" />
                                                    Lab Dispatch Documents
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {diagsToShow.map((diag: TicketDiagnostic) => (
                                                    <div key={diag.id} className="p-3 bg-[var(--gray-50)] rounded-lg border border-[var(--border-light)]">
                                                        <p className="text-sm font-semibold text-[var(--primary-700)] mb-3">{diag.service_type?.name || 'Unknown'}</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {diag.tagged_sample_image_url ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-xs font-medium text-[var(--text-muted)]">Sample After Tagging</p>
                                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-default)] bg-white">
                                                                        <img src={diag.tagged_sample_image_url} alt="Sample After Tagging" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(diag.tagged_sample_image_url!, '_blank')} />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <a href={diag.tagged_sample_image_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg" onClick={(e) => e.stopPropagation()}><Download size={18} /></a>
                                                                        </div>
                                                                    </div>
                                                                    {isEditing && canEditWorkflow && currentUser && (
                                                                        <ReplaceDocumentButton
                                                                            ticketId={id}
                                                                            documentType="tagged_sample"
                                                                            diagnosticId={diag.id}
                                                                            currentUserRole={currentUser.role}
                                                                            onReplaced={() => fetchData()}
                                                                            onError={setError}
                                                                            label="Replace Image"
                                                                            className="text-xs text-[var(--primary-600)] hover:underline self-start"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : isEditing && canEditWorkflow && currentUser ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="text-xs font-medium text-[var(--text-muted)]">Sample After Tagging</p>
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="tagged_sample"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Upload Image"
                                                                        className="text-xs text-[var(--primary-600)] hover:underline"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                            {diag.backoffice_courier_image_url ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-xs font-medium text-[var(--text-muted)]">Courier Details</p>
                                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-default)] bg-white">
                                                                        <img src={diag.backoffice_courier_image_url} alt="Courier Details" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(diag.backoffice_courier_image_url!, '_blank')} />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <a href={diag.backoffice_courier_image_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg" onClick={(e) => e.stopPropagation()}><Download size={18} /></a>
                                                                        </div>
                                                                    </div>
                                                                    {isEditing && canEditWorkflow && currentUser && (
                                                                        <ReplaceDocumentButton
                                                                            ticketId={id}
                                                                            documentType="backoffice_courier"
                                                                            diagnosticId={diag.id}
                                                                            currentUserRole={currentUser.role}
                                                                            onReplaced={() => fetchData()}
                                                                            onError={setError}
                                                                            label="Replace Image"
                                                                            className="text-xs text-[var(--primary-600)] hover:underline self-start"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : isEditing && canEditWorkflow && currentUser ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="text-xs font-medium text-[var(--text-muted)]">Courier Details</p>
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="backoffice_courier"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Upload Image"
                                                                        className="text-xs text-[var(--primary-600)] hover:underline"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )
                                }
                                // Legacy: ticket-level backoffice images
                                if (!ticket.tagged_sample_image_url && !ticket.backoffice_courier_image_url) return null
                                return (
                                    <Card className="mb-6">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Package size={20} className="text-[var(--primary-600)]" />
                                                Lab Dispatch Documents
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {ticket.tagged_sample_image_url && (
                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Sample After Tagging</p>
                                                        <div className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-default)] bg-white">
                                                            <img src={ticket.tagged_sample_image_url} alt="Sample After Tagging" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(ticket.tagged_sample_image_url!, '_blank')} />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <a href={ticket.tagged_sample_image_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg" onClick={(e) => e.stopPropagation()}><Download size={18} /></a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {ticket.backoffice_courier_image_url && (
                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Courier Details</p>
                                                        <div className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-default)] bg-white">
                                                            <img src={ticket.backoffice_courier_image_url} alt="Courier Details" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(ticket.backoffice_courier_image_url!, '_blank')} />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <a href={ticket.backoffice_courier_image_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg" onClick={(e) => e.stopPropagation()}><Download size={18} /></a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })()}

                            {/* Raw & Final Reports — Multi-diagnostic or Legacy */}
                            {(() => {
                                const canSeeRaw = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'officer_backoffice'
                                const canSeeFinal = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'customer_success'

                                // Multi-diagnostic: per-diagnostic reports
                                if (ticket.diagnostics && ticket.diagnostics.length > 0) {
                                    const diagsWithReports = ticket.diagnostics.filter((d: TicketDiagnostic) =>
                                        !d.is_cancelled && ((canSeeRaw && d.raw_report_url) || (canSeeFinal && d.final_report_url))
                                    )
                                    if (diagsWithReports.length === 0) return null
                                    return (
                                        <div className="mb-6 space-y-4">
                                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                                Diagnostic Reports
                                            </label>
                                            {diagsWithReports.map((diag: TicketDiagnostic) => (
                                                <div key={diag.id} className="p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--border-default)]">
                                                    <p className="text-sm font-semibold text-[var(--primary-700)] mb-3">{diag.service_type?.name || 'Unknown'}</p>
                                                    <div className="space-y-3">
                                                        {canSeeRaw && diag.raw_report_url && (
                                                            <div className="flex items-center gap-4 p-3 border border-[var(--success-default)] rounded-lg bg-[var(--success-50)]">
                                                                {diag.raw_report_url.toLowerCase().endsWith('.pdf') ? (
                                                                    <div className="w-14 h-14 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                                                        <FileText size={24} className="text-[var(--error-600)]" />
                                                                    </div>
                                                                ) : (
                                                                    <img src={diag.raw_report_url} alt="Raw Report" className="w-14 h-14 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(diag.raw_report_url!, '_blank')} />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-[var(--success-900)]">Raw Lab Report</p>
                                                                    <p className="text-xs text-[var(--success-700)]">{diag.raw_report_url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'}</p>
                                                                </div>
                                                                <a href={diag.raw_report_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--success-700)] bg-white border border-[var(--success-300)] rounded-lg hover:bg-[var(--success-50)] transition-colors">
                                                                    <Download size={14} /> Download
                                                                </a>
                                                                {currentUser && (
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="raw_report"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Replace"
                                                                        className="px-3 py-1.5 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)]"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                        {canSeeFinal && diag.final_report_url && (
                                                            <div className="flex items-center gap-4 p-3 border border-[var(--primary-100)] rounded-lg bg-white">
                                                                {diag.final_report_url.toLowerCase().endsWith('.pdf') ? (
                                                                    <div className="w-14 h-14 flex items-center justify-center bg-[var(--primary-50)] text-[var(--primary-600)] rounded-lg border border-[var(--primary-100)]">
                                                                        <FileText size={24} />
                                                                    </div>
                                                                ) : (
                                                                    <img src={diag.final_report_url} alt="Final Report" className="w-14 h-14 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(diag.final_report_url!, '_blank')} />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Final Report</p>
                                                                    <p className="text-xs text-[var(--text-muted)]">{diag.final_report_url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'}</p>
                                                                </div>
                                                                <a href={diag.final_report_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)] transition-colors">
                                                                    <Download size={14} /> Download
                                                                </a>
                                                                {currentUser && (
                                                                    <ReplaceDocumentButton
                                                                        ticketId={id}
                                                                        documentType="final_report"
                                                                        diagnosticId={diag.id}
                                                                        currentUserRole={currentUser.role}
                                                                        onReplaced={() => fetchData()}
                                                                        onError={setError}
                                                                        label="Replace"
                                                                        className="px-3 py-1.5 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)]"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }

                                // Legacy: ticket-level reports
                                return (
                                    <>
                                        {canSeeRaw && ticket.raw_report_url && (
                                            <div className="mb-4">
                                                <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                                    Raw Lab Report (Restricted)
                                                </label>
                                                <div className="flex items-center gap-4 p-4 border border-[var(--success-default)] rounded-lg bg-[var(--success-50)]">
                                                    {ticket.raw_report_url.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="w-20 h-20 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                                            <FileText size={32} className="text-[var(--error-600)]" />
                                                        </div>
                                                    ) : (
                                                        <img src={ticket.raw_report_url} alt="Raw Report" className="w-20 h-20 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer" onClick={() => window.open(ticket.raw_report_url!, '_blank')} />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[var(--success-900)] truncate">Raw Laboratory Report</p>
                                                        <p className="text-xs text-[var(--success-700)] mt-1">{ticket.raw_report_url.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Image Document'}</p>
                                                    </div>
                                                    <a href={ticket.raw_report_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--success-700)] bg-white border border-[var(--success-300)] rounded-lg hover:bg-[var(--success-50)] transition-colors">
                                                        <Download size={16} /> Download
                                                    </a>
                                                    {currentUser && (
                                                        <ReplaceDocumentButton
                                                            ticketId={id}
                                                            documentType="raw_report"
                                                            currentUserRole={currentUser.role}
                                                            onReplaced={() => fetchData()}
                                                            onError={setError}
                                                            label="Replace"
                                                            className="px-4 py-2 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)]"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {canSeeFinal && ticket.final_report_url && (
                                            <div className="mb-6">
                                                <label className="block mb-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                                                    Final Diagnostic Report
                                                </label>
                                                <div className="group relative flex items-center gap-5 p-5 bg-white border border-[var(--primary-100)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--primary-300)] transition-all duration-300">
                                                    {ticket.final_report_url.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="w-16 h-16 flex items-center justify-center bg-[var(--primary-50)] text-[var(--primary-600)] rounded-xl border border-[var(--primary-100)] group-hover:bg-[var(--primary-100)] transition-colors">
                                                            <FileText size={32} />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border-default)] shadow-inner">
                                                            <img src={ticket.final_report_url} alt="Final Report" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500" onClick={() => window.open(ticket.final_report_url!, '_blank')} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Final Diagnostic Report</p>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                            <p className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                                                                <FileDown size={12} className="text-[var(--primary-500)]" />
                                                                {ticket.final_report_url.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Image Document'}
                                                            </p>
                                                            {ticket.status_final_report_generated_at && (
                                                                <p className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                                                                    <Clock size={12} />
                                                                    {formatDate(ticket.status_final_report_generated_at)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <a href={ticket.final_report_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)] transition-colors">
                                                        <Download size={16} /> Download
                                                    </a>
                                                    {currentUser && (
                                                        <ReplaceDocumentButton
                                                            ticketId={id}
                                                            documentType="final_report"
                                                            currentUserRole={currentUser.role}
                                                            onReplaced={() => fetchData()}
                                                            onError={setError}
                                                            label="Replace"
                                                            className="px-4 py-2 text-sm font-medium text-[var(--primary-600)] bg-white border border-[var(--primary-200)] rounded-lg hover:bg-[var(--primary-50)]"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}

                            {/* Text Message (Fallback or Additional) */}
                            {ticket.original_message && (
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                        {ticket.screenshot_url ? 'Additional Notes' : 'Original WhatsApp Message'}
                                    </label>
                                    {isEditing && canEditMetadata ? (
                                        <Textarea
                                            value={formData.original_message}
                                            onChange={(e) => setFormData(p => ({ ...p, original_message: e.target.value }))}
                                            rows={6}
                                            placeholder="Edit message..."
                                        />
                                    ) : (
                                        <div className="bg-[var(--gray-50)] p-4 rounded-lg border border-[var(--border-default)]">
                                            <p className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                                {ticket.original_message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* No content message */}
                            {!ticket.screenshot_url && !ticket.original_message && (
                                <p className="text-[var(--text-muted)] italic">No message or screenshot available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Custom Columns (Bottom Left) */}
                    {columns.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Additional Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    {columns.map((column) => {
                                        // Check if this column is workflow-related
                                        const displayNameLower = column.display_name.toLowerCase()
                                        const workflowKeywords = ['assigned', 'scheduled', 'visit', 'collection', 'status', 'stage']
                                        const isWorkflowColumn = workflowKeywords.some(keyword => displayNameLower.includes(keyword))

                                        // Can edit this column if: editing, can edit metadata, and (can edit workflow OR not a workflow column)
                                        const canEditThisColumn = isEditing && canEditMetadata && (canEditWorkflow || !isWorkflowColumn)

                                        return (
                                            <div key={column.id}>
                                                <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">
                                                    {column.display_name}
                                                </label>
                                                {canEditThisColumn ? (
                                                    column.column_type === 'tag' || column.column_type === 'dropdown' ? (
                                                        <Select
                                                            value={getCustomValue(column.id)}
                                                            onChange={(e) => setCustomValue(column.id, e.target.value)}
                                                            options={column.options?.map((opt) => ({ value: opt.value, label: opt.label })) || []}
                                                            placeholder={`Select option`}
                                                        />
                                                    ) : column.column_type === 'date' ? (
                                                        <Input type="date" value={getCustomValue(column.id)} onChange={(e) => setCustomValue(column.id, e.target.value)} />
                                                    ) : column.column_type === 'number' ? (
                                                        <Input type="number" value={getCustomValue(column.id)} onChange={(e) => setCustomValue(column.id, e.target.value)} />
                                                    ) : (
                                                        <Input type="text" value={getCustomValue(column.id)} onChange={(e) => setCustomValue(column.id, e.target.value)} />
                                                    )
                                                ) : (
                                                    <div className="py-1">
                                                        {column.column_type === 'tag' && getCustomValue(column.id) ? (
                                                            <Badge color={column.options?.find((o) => o.value === getCustomValue(column.id))?.color}>
                                                                {column.options?.find((o) => o.value === getCustomValue(column.id))?.label || getCustomValue(column.id)}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[var(--text-primary)] font-medium">
                                                                {getCustomValue(column.id) || <span className="text-[var(--text-muted)]">-</span>}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>

                {/* RIGHT COLUMN: Workflow & Logistics */}
                <div className="space-y-6">
                    {/* Logistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Logistics & Scheduling</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Scheduled Pickup Details */}
                            <div className="p-4 bg-[var(--primary-50)]/30 rounded-xl border border-[var(--primary-100)]">
                                <label className="block mb-3 text-[10px] font-bold text-[var(--primary-700)] uppercase tracking-widest">Scheduled Pickup</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-[var(--text-secondary)]">Date</label>
                                        {isEditing && canEditWorkflow ? (
                                            <Input
                                                type="date"
                                                value={formData.scheduled_date}
                                                onChange={(e) => setFormData(p => ({ ...p, scheduled_date: e.target.value }))}
                                                className="h-9 text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 py-1.5">
                                                <Calendar size={16} className="text-[var(--primary-500)]" />
                                                <span className="font-semibold text-sm">
                                                    {ticket?.scheduled_date ? new Date(ticket.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-[var(--text-muted)] italic font-normal">Not scheduled</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-[var(--text-secondary)]">Time</label>
                                        {isEditing && canEditWorkflow ? (
                                            <Input
                                                type="time"
                                                value={formData.scheduled_time}
                                                onChange={(e) => setFormData(p => ({ ...p, scheduled_time: e.target.value }))}
                                                className="h-9 text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 py-1.5">
                                                <Clock size={16} className="text-[var(--primary-500)]" />
                                                <span className="font-semibold text-sm">
                                                    {ticket?.scheduled_time ? (() => {
                                                        const [h, m] = ticket.scheduled_time.split(':')
                                                        const hour = parseInt(h)
                                                        const ampm = hour >= 12 ? 'PM' : 'AM'
                                                        const hour12 = hour % 12 || 12
                                                        return `${hour12}:${m} ${ampm}`
                                                    })() : <span className="text-[var(--text-muted)] italic font-normal">Not scheduled</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Collection Location</label>
                                    {isEditing && canEditWorkflow ? (
                                        <Select
                                            value={formData.collection_location}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, collection_location: e.target.value }))}
                                            options={[
                                                { value: 'hospital', label: 'Hospital' },
                                                { value: 'home', label: "Patient's Home" },
                                            ]}
                                            placeholder="Select location"
                                        />
                                    ) : (
                                        <div className="py-1 capitalize font-medium">
                                            {ticket?.collection_location || <span className="text-[var(--text-muted)]">-</span>}
                                        </div>
                                    )}
                                </div>

                                {(formData.collection_location === 'home' || ticket?.collection_location === 'home') && (
                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]">Address</label>
                                        {isEditing && canEditWorkflow ? (
                                            <Textarea
                                                value={formData.collection_address}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, collection_address: e.target.value }))}
                                                rows={2}
                                                placeholder="Enter address"
                                            />
                                        ) : (
                                            <div className="py-1 text-sm text-[var(--text-secondary)]">
                                                {ticket?.collection_address || <span className="text-[var(--text-muted)]">-</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    {/* Internal Comments Section - Minimalist Redesign */}
                    <div className="bg-white rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                        <div className="p-4 border-b border-[var(--border-light)] bg-[var(--gray-50)]/50">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={14} className="text-[var(--primary-600)]" />
                                Internal Notes
                                {comments.length > 0 && (
                                    <span className="ml-auto bg-[var(--primary-100)] text-[var(--primary-700)] px-2 py-0.5 rounded-full text-[10px]">
                                        {comments.length}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {/* Comments Display - Scrollable List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white custom-scrollbar">
                            {comments.length > 0 ? (
                                comments.map((comment) => (
                                    <div key={comment.id} className="group relative pl-3 border-l-2 border-[var(--gray-100)] hover:border-[var(--primary-200)] transition-colors py-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-[var(--text-primary)]">
                                                {comment.author?.full_name}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                {formatDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] leading-snug whitespace-pre-wrap break-words">
                                            {comment.comment}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-xs text-[var(--text-muted)] italic">No internal notes yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Streamlined Input Area */}
                        {canComment && (
                            <div className="p-3 border-t border-[var(--border-default)] bg-white">
                                <div className="relative flex items-end gap-2">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => {
                                            setNewComment(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                        }}
                                        placeholder="Type a note..."
                                        rows={1}
                                        className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-3 text-sm border border-[var(--border-default)] focus:border-[var(--primary-300)] focus:ring-1 focus:ring-[var(--primary-100)] bg-[var(--gray-50)]/50 focus:bg-white transition-all rounded-lg placeholder:text-[var(--text-muted)] focus:outline-none resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handlePostComment()
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim() || isPostingComment}
                                        className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg transition-all shadow-sm ${newComment.trim()
                                            ? 'bg-[var(--primary-600)] text-white hover:bg-[var(--primary-700)] active:scale-95'
                                            : 'bg-[var(--gray-200)] text-[var(--text-muted)] cursor-not-allowed opacity-70'
                                            }`}
                                    >
                                        {isPostingComment ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send size={16} className={newComment.trim() ? "ml-0.5" : ""} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Status & Assignment */}
                    <Card className="border-[var(--primary-100)] shadow-md">
                        <CardHeader className="bg-[var(--primary-50)]/50 pb-4">
                            <CardTitle className="text-[var(--primary-800)]">Workflow</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">

                            {/* Current Status With Change Controls */}
                            <div className="space-y-4">
                                <div className="p-4 bg-[var(--primary-50)]/30 rounded-2xl border border-[var(--primary-100)] shadow-sm">
                                    <label className="block mb-2 text-[10px] font-bold text-[var(--primary-700)] uppercase tracking-widest">Current Status</label>
                                    <div className="flex items-center justify-between">
                                        {ticket.current_stage ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ticket.current_stage.color }}></div>
                                                <span className="text-lg font-bold text-[var(--text-primary)]">{ticket.current_stage.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[var(--text-muted)] italic">No status set</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons for Next Steps */}
                                {canEditWorkflow && (
                                    <div className="space-y-2">
                                        <label className="block px-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Available Actions</label>
                                        <div className="flex flex-col gap-2">
                                            {/* Primary "Next" Action */}
                                            {nextStage && (
                                                <Button
                                                    className="w-full justify-center h-11 text-sm font-semibold shadow-sm hover:translate-y-[-1px] transition-all"
                                                    onClick={() => openStatusModal(nextStage.id)}
                                                    rightIcon={<ArrowRight size={16} />}
                                                >
                                                    Move to {nextStage.name}
                                                </Button>
                                            )}

                                            {/* Jump to Dropdown */}
                                            <div className="grid grid-cols-1">
                                                <Select
                                                    className="w-full h-10 text-sm bg-white border-[var(--border-default)] hover:border-[var(--primary-300)] transition-colors"
                                                    value=""
                                                    onChange={(e) => e.target.value && openStatusModal(e.target.value)}
                                                    options={[
                                                        { value: '', label: 'Jump to different stage...' },
                                                        ...stages.filter(s => s.id !== ticket.current_stage_id && s.id !== nextStage?.id).map(s => ({ value: s.id, label: s.name }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Field Executive - Display only (set via status change workflow) */}
                            <div className="pt-4 border-t border-[var(--border-default)]">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-sm font-semibold text-[var(--text-secondary)]">Assigned To</label>
                                    {/* Make sure "Assign" is part of the workflow, or allow manual override if absolutely needed */}
                                    {isEditing && canEditWorkflow && (
                                        <Select
                                            className="w-[150px] h-8 text-xs"
                                            value={formData.assigned_to}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, assigned_to: e.target.value }))}
                                            options={users.map((u) => ({ value: u.id, label: u.full_name }))}
                                            placeholder="Override Assign"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[var(--border-default)] shadow-sm group hover:border-[var(--primary-200)] transition-all">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${ticket.assigned_user ? 'bg-[var(--primary-50)] text-[var(--primary-600)]' : 'bg-[var(--gray-50)] text-[var(--text-muted)]'}`}>
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-none mb-1">Assigned Executive</p>
                                        <p className="font-bold text-[var(--text-primary)] truncate">
                                            {ticket.assigned_user?.full_name || <span className="text-[var(--text-muted)] italic font-normal">Unassigned</span>}
                                        </p>
                                        {ticket.assigned_user && (
                                            <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">{ticket.assigned_user.role?.replace('_', ' ')}</p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1.5 text-right">
                                    {ticket.assigned_user ? 'Can be changed via status workflow' : 'Assign via status change'}
                                </p>
                            </div>

                            {/* Diagnostics Center - Shown when sample has been sent to a lab */}
                            {(() => {
                                const diagsWithLab = ticket.diagnostics?.filter((d: any) => !d.is_cancelled && d.lab) || []
                                const diagsWithCode = ticket.diagnostics?.filter((d: any) => !d.is_cancelled && d.label_code) || []
                                const hasMultiDiagData = diagsWithLab.length > 0 || diagsWithCode.length > 0

                                if (hasMultiDiagData) {
                                    return (
                                        <div className="pt-4 border-t border-[var(--border-default)]">
                                            <label className="block mb-1.5 text-sm font-semibold text-[var(--text-secondary)]">Diagnostics Center</label>
                                            <div className="space-y-3">
                                                {diagsWithLab.map((d: any) => (
                                                    <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--success-50)] rounded-lg border border-[var(--success-200)]">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--success-100)] text-[var(--success-700)]">
                                                            <Building2 size={16} />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-[var(--text-primary)]">{d.lab.name}</span>
                                                            <p className="text-xs text-[var(--text-muted)]">{d.service_type?.name || 'Diagnostic'} — sent to this lab</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {diagsWithCode.map((d: any) => (
                                                    <div key={d.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700">
                                                            <Package size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none mb-1">
                                                                {d.service_type?.name || 'Diagnostic'} — Label Code
                                                            </p>
                                                            <span className="font-bold text-blue-900">{d.label_code}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                }

                                if (ticket.lab) {
                                    return (
                                        <div className="pt-4 border-t border-[var(--border-default)]">
                                            <label className="block mb-1.5 text-sm font-semibold text-[var(--text-secondary)]">Diagnostics Center</label>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-3 bg-[var(--success-50)] rounded-lg border border-[var(--success-200)]">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--success-100)] text-[var(--success-700)]">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-[var(--text-primary)]">{ticket.lab.name}</span>
                                                        <p className="text-xs text-[var(--text-muted)]">Sample sent to this lab</p>
                                                    </div>
                                                </div>
                                                {ticket.label_code && (
                                                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700">
                                                            <Package size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none mb-1">Secret Label Code</p>
                                                            <span className="font-bold text-blue-900">{ticket.label_code}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                return null
                            })()}

                        </CardContent>
                    </Card>

                    {/* System Status Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Process Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="relative space-y-4 before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--primary-200)] before:via-[var(--gray-100)] before:to-transparent">
                                {stages.map((stage, idx) => {
                                    const time = getSystemStatusTime(stage.id, stage.name, ticket)
                                    const transition = ticket.status_transitions?.find(st => st.to_stage_id === stage.id)
                                    const isSampleSent = stage.name.toLowerCase() === 'sample sent to'

                                    return (
                                        <div key={stage.id} className="relative flex items-start gap-4 pl-8">
                                            <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${time ? 'bg-[var(--primary-500)]' : 'bg-[var(--gray-200)]'}`}>
                                                {time && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold ${time ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                                    {stage.name}
                                                </p>
                                                {time ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[var(--primary-600)] font-mono text-xs">{formatDate(time)}</span>
                                                        {transition?.changer && (
                                                            <span className="text-[10px] text-[var(--text-muted)]">by {transition.changer.full_name}</span>
                                                        )}
                                                        {isSampleSent && ticket.lab?.name && (
                                                            <span className="text-xs font-semibold text-[var(--success-700)] bg-[var(--success-50)] px-2 py-0.5 rounded mt-1 w-fit">
                                                                {ticket.lab.name}
                                                            </span>
                                                        )}
                                                        {stage.name.toLowerCase() === 'assigned' && transition?.field_data?.collection_date && (
                                                            <div className="mt-2 p-2 bg-[var(--primary-50)]/50 rounded-lg border border-[var(--primary-100)] w-fit">
                                                                <p className="text-[10px] font-bold text-[var(--primary-700)] uppercase tracking-wider mb-1">Scheduled Pickup</p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary-600)]">
                                                                        <Calendar size={12} />
                                                                        {(() => {
                                                                            const [y, m, d] = transition.field_data.collection_date.split('-')
                                                                            return `${d}/${m}/${y}`
                                                                        })()}
                                                                    </div>
                                                                    {transition.field_data.collection_time && (
                                                                        <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary-600)]">
                                                                            <Clock size={12} />
                                                                            {(() => {
                                                                                const [h, m] = transition.field_data.collection_time.split(':')
                                                                                const hour = parseInt(h)
                                                                                const ampm = hour >= 12 ? 'PM' : 'AM'
                                                                                const hour12 = hour % 12 || 12
                                                                                return `${hour12}:${m} ${ampm}`
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {stage.name.toLowerCase() === 'sample collected' && transition?.field_data?.actual_collection_date && (
                                                            <div className="mt-2 p-2 bg-[var(--success-50)]/50 rounded-lg border border-[var(--success-100)] w-fit">
                                                                <p className="text-[10px] font-bold text-[var(--success-700)] uppercase tracking-wider mb-1">Collection Details</p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--success-600)]">
                                                                        <Calendar size={12} />
                                                                        {(() => {
                                                                            const [y, m, d] = transition.field_data.actual_collection_date.split('-')
                                                                            return `${d}/${m}/${y}`
                                                                        })()}
                                                                    </div>
                                                                    {transition.field_data.actual_collection_time && (
                                                                        <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--success-600)]">
                                                                            <Clock size={12} />
                                                                            {(() => {
                                                                                const [h, m] = transition.field_data.actual_collection_time.split(':')
                                                                                const hour = parseInt(h)
                                                                                const ampm = hour >= 12 ? 'PM' : 'AM'
                                                                                const hour12 = hour % 12 || 12
                                                                                return `${hour12}:${m} ${ampm}`
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[var(--text-muted)] italic">Pending</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logistics */}



                </div>
            </div>
        </div>
    )
}
