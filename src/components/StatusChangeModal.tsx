'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, X, Download, Camera, Plus, Clock } from 'lucide-react'
import { Modal, ModalFooter, Button, Input, Select, Badge } from '@/components/ui'
import type { WorkflowStage, ModalFieldConfig, User, Lab, Ticket, UserRole } from '@/lib/types'
import { generateAssignmentPDF } from '@/lib/pdf-utils'
import { FileDown, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

// Client-side helper function to check if role is officer_backoffice
const isOfficerBackoffice = (role: UserRole): boolean => {
    return role === 'officer_backoffice'
}

const isAdmin = (role: UserRole): boolean => {
    return role === 'admin'
}

const isManager = (role: UserRole): boolean => {
    return role === 'manager'
}

interface StatusChangeModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: StatusChangeData) => Promise<void>
    onDownloadRequired: (pdfData: DownloadPdfData) => void // Callback to parent when download is needed
    targetStage: WorkflowStage | null
    currentStageId: string | null
    ticketId: string
    ticketData?: Ticket | null // Pass the full ticket object for PDF data
    currentUserRole?: UserRole // Current user's role to determine field requirements
}

export interface DownloadPdfData {
    ticketUid: string
    patientName: string
    hospitalName: string
    assignedToName: string
    transitionDate: string
    testType: string
    collectionDate: string
    collectionTime: string
    // Pending transition data - status will only be committed after download is complete
    pendingTransition?: StatusChangeData
}

export interface StatusChangeData {
    ticket_id: string
    from_stage_id: string | null
    to_stage_id: string
    transition_date: string
    transition_time?: string
    field_data: Record<string, any>
}

export function StatusChangeModal({
    isOpen,
    onClose,
    onConfirm,
    onDownloadRequired,
    targetStage,
    currentStageId,
    ticketId,
    ticketData,
    currentUserRole,
}: StatusChangeModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [users, setUsers] = useState<User[]>([])
    const [labs, setLabs] = useState<Lab[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})

    // TRF Upload State
    const [trfFiles, setTrfFiles] = useState<File[]>([])
    const [trfPreviews, setTrfPreviews] = useState<string[]>([])
    const [trfUploading, setTrfUploading] = useState(false)
    const trfInputRef = useRef<HTMLInputElement>(null)
    const trfCameraInputRef = useRef<HTMLInputElement>(null)

    // Raw Report Upload State (single-diagnostic)
    const [rawReportFile, setRawReportFile] = useState<File | null>(null)
    const [rawReportPreview, setRawReportPreview] = useState<string | null>(null)
    const [rawReportUploading, setRawReportUploading] = useState(false)
    const rawReportInputRef = useRef<HTMLInputElement>(null)

    // Per-diagnostic raw report state (multi-diagnostic tickets)
    const [diagReportFiles, setDiagReportFiles] = useState<Record<string, File | null>>({})
    const [diagReportPreviews, setDiagReportPreviews] = useState<Record<string, string | null>>({})

    // Final Report Upload State (for scientist)
    const [finalReportFile, setFinalReportFile] = useState<File | null>(null)
    const [finalReportPreview, setFinalReportPreview] = useState<string | null>(null)
    const [finalReportUploading, setFinalReportUploading] = useState(false)
    const finalReportInputRef = useRef<HTMLInputElement>(null)

    // Sample After Tagging & Courier Details Upload State (for backoffice when sending to lab)
    const [taggedSampleFile, setTaggedSampleFile] = useState<File | null>(null)
    const [taggedSamplePreview, setTaggedSamplePreview] = useState<string | null>(null)
    const [taggedSampleUploading, setTaggedSampleUploading] = useState(false)
    const taggedSampleInputRef = useRef<HTMLInputElement>(null)
    const taggedSampleCameraInputRef = useRef<HTMLInputElement>(null)

    const [courierDetailsFile, setCourierDetailsFile] = useState<File | null>(null)
    const [courierDetailsPreview, setCourierDetailsPreview] = useState<string | null>(null)
    const [courierDetailsUploading, setCourierDetailsUploading] = useState(false)
    const courierDetailsInputRef = useRef<HTMLInputElement>(null)
    const courierDetailsCameraInputRef = useRef<HTMLInputElement>(null)

    // Field Executive Allocation Preview State
    interface FieldExecutiveAllocation {
        id: string
        uid: string
        scheduled_time: string | null
        patient_name: string | null
        hospital_name: string | null
        current_stage_name: string | null
        current_stage_color: string | null
    }
    const [feAllocations, setFeAllocations] = useState<FieldExecutiveAllocation[]>([])
    const [allocationsLoading, setAllocationsLoading] = useState(false)

    // Initialize form with today's date and current time
    useEffect(() => {
        if (isOpen && targetStage) {
            const now = new Date()
            const today = now.toISOString().split('T')[0]
            const currentTime = now.toTimeString().split(' ')[0].slice(0, 5)

            setFormData({
                transition_date: today,
                transition_time: currentTime,
            })
            setErrors({})
            // Reset TRF state
            setTrfFiles([])
            setTrfPreviews([])
            // Reset Raw Report state
            setRawReportFile(null)
            setRawReportPreview(null)
            setDiagReportFiles({})
            setDiagReportPreviews({})
            // Reset Final Report state
            setFinalReportFile(null)
            setFinalReportPreview(null)
            // Reset Sample After Tagging & Courier Details state
            setTaggedSampleFile(null)
            setTaggedSamplePreview(null)
            setCourierDetailsFile(null)
            setCourierDetailsPreview(null)
        }
    }, [isOpen, targetStage, ticketData])

    // Fetch users and labs for system dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/assignable-users')
                const result = await response.json()
                if (result.success) {
                    setUsers(result.data)
                }
            } catch (error) {
                console.error('Error fetching assignable users:', error)
            }
        }

        const fetchLabs = async () => {
            try {
                const response = await fetch('/api/labs')
                const result = await response.json()
                if (result.success) {
                    setLabs(result.data)
                }
            } catch (error) {
                console.error('Error fetching labs:', error)
            }
        }

        fetchUsers()
        fetchLabs()
    }, [])

    // Fetch field executive allocations when assignment changes
    useEffect(() => {
        const fetchAllocations = async () => {
            const selectedFE = formData.assigned_to
            const scheduledDate = ticketData?.scheduled_date

            // Only fetch if we have both field executive and scheduled date
            // and only for 'Assigned' stage
            if (!selectedFE || !scheduledDate || targetStage?.name.toLowerCase() !== 'assigned') {
                setFeAllocations([])
                return
            }

            setAllocationsLoading(true)
            try {
                const response = await fetch(
                    `/api/field-executive-allocations?user_id=${selectedFE}&date=${scheduledDate}`
                )
                const result = await response.json()
                if (result.success) {
                    // Filter out the current ticket from allocations
                    const otherAllocations = result.data.filter(
                        (a: FieldExecutiveAllocation) => a.id !== ticketId
                    )
                    setFeAllocations(otherAllocations)
                } else {
                    console.error('Failed to fetch allocations:', result.error)
                    setFeAllocations([])
                }
            } catch (error) {
                console.error('Error fetching field executive allocations:', error)
                setFeAllocations([])
            } finally {
                setAllocationsLoading(false)
            }
        }

        fetchAllocations()
    }, [formData.assigned_to, ticketData?.scheduled_date, targetStage?.name, ticketId])

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }))
        // Clear error when field is changed
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[fieldId]
                return newErrors
            })
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        // Date is always required
        if (!formData.transition_date) {
            newErrors.transition_date = 'Date is required'
        }

        // Validate configured fields (skip date/time/datetime since those are handled by pre-filled Status Date/Time)
        if (targetStage?.modal_fields) {
            for (const field of targetStage.modal_fields) {
                // Skip date/time/datetime validation - these fields are not shown in the UI
                if (['date', 'time', 'datetime'].includes(field.type)) {
                    continue
                }
                if (field.required && !formData[field.id]) {
                    newErrors[field.id] = `${field.label} is required`
                }
            }
        }

        // Require final report file for "Final Report Generated" stage
        if (targetStage?.name.toLowerCase() === 'final report generated' && !finalReportFile) {
            newErrors.final_report = 'Final report file is required'
        }

        // TRF is already uploaded by Field Executive, no need to require it from backoffice

        // Require Raw Report for "Report Received" stage.
        const isReportReceived = targetStage?.name.toLowerCase().trim() === 'report received'
        const activeDiagsForValidation = (ticketData?.diagnostics ?? []).filter((d: any) => !d.is_cancelled)
        const isMultiDiagForValidation = activeDiagsForValidation.length > 1
        if (isReportReceived) {
            if (isMultiDiagForValidation) {
                // At least one diagnostic must have a file selected
                const anyUploaded = activeDiagsForValidation.some((d: any) => diagReportFiles[d.id])
                if (!anyUploaded) {
                    newErrors.raw_report = 'Upload a raw report for at least one diagnostic to proceed'
                }
            } else if (currentUserRole && isOfficerBackoffice(currentUserRole) && !rawReportFile) {
                newErrors.raw_report = 'Raw Report (Final/Lab Report) is required'
            }
        }

        // Require Courier Details (only) for "Sample Sent To" stage when user is officer_backoffice
        // Sample after tagging is now optional
        const isSampleSentTo = targetStage?.name.toLowerCase().trim() === 'sample sent to'
        if (isSampleSentTo && currentUserRole && isOfficerBackoffice(currentUserRole)) {
            if (!formData.label_code) {
                newErrors.label_code = 'Label Code is required'
            }
            if (!courierDetailsFile) {
                newErrors.courier_details = 'Courier details image is required'
            }
        }

        // Require Actual Collection Date/Time for "Sample Collected" stage
        if (targetStage?.name.toLowerCase() === 'sample collected') {
            if (!formData.actual_collection_date) newErrors.actual_collection_date = 'Actual Collection Date is required'
            if (!formData.actual_collection_time) newErrors.actual_collection_time = 'Actual Collection Time is required'
        }


        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle TRF file selection (multiple)
    const handleTrfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        const validFiles: File[] = []
        const newPreviews: string[] = []

        files.forEach(file => {
            // Validate file type
            if (!allowedTypes.includes(file.type)) {
                setErrors(prev => ({ ...prev, trf: `Invalid file type for ${file.name}. Allowed: Images (JPEG, PNG, WebP) and PDF` }))
                return
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, trf: `File ${file.name} too large. Maximum size: 10MB` }))
                return
            }
            validFiles.push(file)
        })

        if (validFiles.length > 0) {
            setTrfFiles(prev => [...prev, ...validFiles])
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors.trf
                return newErrors
            })

            validFiles.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        setTrfPreviews(prev => [...prev, e.target?.result as string])
                    }
                    reader.readAsDataURL(file)
                } else {
                    setTrfPreviews(prev => [...prev, 'pdf-placeholder']) // Marker for PDF
                }
            })
        }

        if (trfInputRef.current) trfInputRef.current.value = ''
        if (trfCameraInputRef.current) trfCameraInputRef.current.value = ''
    }

    const removeTrfFile = (index: number) => {
        setTrfFiles(prev => prev.filter((_, i) => i !== index))
        setTrfPreviews(prev => prev.filter((_, i) => i !== index))
    }

    // Handle Raw Report file selection
    const handleRawReportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, raw_report: 'Invalid file type. Allowed: Images (JPEG, PNG, WebP) and PDF' }))
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, raw_report: 'File too large. Maximum size: 10MB' }))
            return
        }

        setRawReportFile(file)
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.raw_report
            return newErrors
        })

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => setRawReportPreview(e.target?.result as string)
            reader.readAsDataURL(file)
        } else {
            setRawReportPreview(null) // PDF - no preview
        }
    }

    const removeRawReportFile = () => {
        setRawReportFile(null)
        setRawReportPreview(null)
        if (rawReportInputRef.current) {
            rawReportInputRef.current.value = ''
        }
    }

    // Handle Tagged Sample file selection (for backoffice when sending to lab)
    const handleTaggedSampleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type (images only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, tagged_sample: 'Invalid file type. Allowed: Images (JPEG, PNG, WebP)' }))
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, tagged_sample: 'File too large. Maximum size: 10MB' }))
            return
        }

        setTaggedSampleFile(file)
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.tagged_sample
            return newErrors
        })

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => setTaggedSamplePreview(e.target?.result as string)
        reader.readAsDataURL(file)

        if (taggedSampleInputRef.current) taggedSampleInputRef.current.value = ''
        if (taggedSampleCameraInputRef.current) taggedSampleCameraInputRef.current.value = ''
    }

    const removeTaggedSampleFile = () => {
        setTaggedSampleFile(null)
        setTaggedSamplePreview(null)
        if (taggedSampleInputRef.current) taggedSampleInputRef.current.value = ''
        if (taggedSampleCameraInputRef.current) taggedSampleCameraInputRef.current.value = ''
    }

    // Handle Courier Details file selection (for backoffice when sending to lab)
    const handleCourierDetailsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type (images only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, courier_details: 'Invalid file type. Allowed: Images (JPEG, PNG, WebP)' }))
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, courier_details: 'File too large. Maximum size: 10MB' }))
            return
        }

        setCourierDetailsFile(file)
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.courier_details
            return newErrors
        })

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => setCourierDetailsPreview(e.target?.result as string)
        reader.readAsDataURL(file)

        if (courierDetailsInputRef.current) courierDetailsInputRef.current.value = ''
        if (courierDetailsCameraInputRef.current) courierDetailsCameraInputRef.current.value = ''
    }

    const removeCourierDetailsFile = () => {
        setCourierDetailsFile(null)
        setCourierDetailsPreview(null)
        if (courierDetailsInputRef.current) courierDetailsInputRef.current.value = ''
        if (courierDetailsCameraInputRef.current) courierDetailsCameraInputRef.current.value = ''
    }

    // Handle Final Report file selection (for scientist)
    const handleFinalReportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, final_report: 'Invalid file type. Allowed: Images (JPEG, PNG, WebP) and PDF' }))
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, final_report: 'File too large. Maximum size: 10MB' }))
            return
        }

        setFinalReportFile(file)
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.final_report
            return newErrors
        })

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => setFinalReportPreview(e.target?.result as string)
            reader.readAsDataURL(file)
        } else {
            setFinalReportPreview(null) // PDF - no preview
        }
    }

    const removeFinalReportFile = () => {
        setFinalReportFile(null)
        setFinalReportPreview(null)
        if (finalReportInputRef.current) {
            finalReportInputRef.current.value = ''
        }
    }

    const handleSubmit = async () => {
        if (!validateForm() || !targetStage) return

        setIsSubmitting(true)
        try {
            const { transition_date, transition_time, ...fieldData } = formData

            // Upload TRF files if selected (for Sample Received stage)
            if (trfFiles.length > 0 && targetStage.name.toLowerCase() === 'sample received') {
                setTrfUploading(true)
                const uploadedUrls: string[] = []

                for (const file of trfFiles) {
                    const trfFormData = new FormData()
                    trfFormData.append('file', file)
                    trfFormData.append('ticketId', ticketId)

                    const uploadRes = await fetch('/api/upload-trf', {
                        method: 'POST',
                        body: trfFormData,
                    })
                    const uploadResult = await uploadRes.json()

                    if (uploadResult.success) {
                        uploadedUrls.push(uploadResult.data.url)
                    } else {
                        setErrors(prev => ({ ...prev, trf: uploadResult.error || 'Failed to upload one or more TRF images' }))
                        setTrfUploading(false)
                        setIsSubmitting(false)
                        return
                    }
                }

                setTrfUploading(false)
                if (uploadedUrls.length > 0) {
                    fieldData.trf_image_url = uploadedUrls[0] // For backward compatibility
                    fieldData.trf_image_urls = uploadedUrls
                }
            }

            // Upload Raw Report file(s) for "Report Received" stage.
            if (targetStage.name.toLowerCase() === 'report received') {
                const activeDiagsForUpload = (ticketData?.diagnostics ?? []).filter((d: any) => !d.is_cancelled)
                const isMultiDiagnosticUpload = activeDiagsForUpload.length > 1

                if (isMultiDiagnosticUpload) {
                    // Upload each file that was selected and collect per-diagnostic URLs
                    const perDiagnosticReports: { diagnostic_id: string; raw_report_url: string }[] = []

                    for (const diag of activeDiagsForUpload) {
                        const file = diagReportFiles[diag.id]
                        if (!file) continue // skip — this diagnostic won't be updated

                        const uploadForm = new FormData()
                        uploadForm.append('file', file)
                        uploadForm.append('ticketId', ticketId)

                        const uploadRes = await fetch('/api/upload-raw-report', { method: 'POST', body: uploadForm })
                        const uploadResult = await uploadRes.json()

                        if (uploadResult.success) {
                            perDiagnosticReports.push({ diagnostic_id: diag.id, raw_report_url: uploadResult.data.url })
                        } else {
                            setErrors(prev => ({ ...prev, raw_report: `Failed to upload report for ${diag.service_type?.name || diag.id}: ${uploadResult.error}` }))
                            setIsSubmitting(false)
                            return
                        }
                    }

                    // Pass as structured array so the API can update each diagnostic individually
                    if (perDiagnosticReports.length > 0) {
                        fieldData.per_diagnostic_raw_reports = perDiagnosticReports
                    }
                } else {
                    // Single diagnostic — existing single-file upload path
                    if (currentUserRole && isOfficerBackoffice(currentUserRole) && !rawReportFile) {
                        setErrors(prev => ({ ...prev, raw_report: 'Raw Report (Final/Lab Report) is required for officer - backoffice' }))
                        setIsSubmitting(false)
                        return
                    }

                    if (rawReportFile) {
                        setRawReportUploading(true)
                        const rawReportFormData = new FormData()
                        rawReportFormData.append('file', rawReportFile)
                        rawReportFormData.append('ticketId', ticketId)

                        const uploadRes = await fetch('/api/upload-raw-report', { method: 'POST', body: rawReportFormData })
                        const uploadResult = await uploadRes.json()
                        setRawReportUploading(false)

                        if (uploadResult.success) {
                            fieldData.raw_report_url = uploadResult.data.url
                        } else {
                            setErrors(prev => ({ ...prev, raw_report: uploadResult.error || 'Failed to upload raw report' }))
                            setIsSubmitting(false)
                            return
                        }
                    }
                }
            }

            // Upload Tagged Sample and Courier Details images for "Sample Sent To" stage
            // Tagged Sample is now optional, Courier Details is still required for officer_backoffice
            if (targetStage.name.toLowerCase() === 'sample sent to') {
                // Check if courier details is required but not provided
                if (currentUserRole && isOfficerBackoffice(currentUserRole)) {
                    if (!courierDetailsFile) {
                        setErrors(prev => ({ ...prev, courier_details: 'Courier details image is required' }))
                        setIsSubmitting(false)
                        return
                    }
                }

                // Upload Tagged Sample image
                if (taggedSampleFile) {
                    setTaggedSampleUploading(true)
                    const taggedSampleFormData = new FormData()
                    taggedSampleFormData.append('file', taggedSampleFile)
                    taggedSampleFormData.append('ticketId', ticketId)
                    taggedSampleFormData.append('type', 'tagged_sample')

                    const uploadRes = await fetch('/api/upload-backoffice-image', {
                        method: 'POST',
                        body: taggedSampleFormData,
                    })
                    const uploadResult = await uploadRes.json()
                    setTaggedSampleUploading(false)

                    if (uploadResult.success) {
                        fieldData.tagged_sample_image_url = uploadResult.data.url
                    } else {
                        setErrors(prev => ({ ...prev, tagged_sample: uploadResult.error || 'Failed to upload tagged sample image' }))
                        setIsSubmitting(false)
                        return
                    }
                }

                // Upload Courier Details image
                if (courierDetailsFile) {
                    setCourierDetailsUploading(true)
                    const courierDetailsFormData = new FormData()
                    courierDetailsFormData.append('file', courierDetailsFile)
                    courierDetailsFormData.append('ticketId', ticketId)
                    courierDetailsFormData.append('type', 'courier_details')

                    const uploadRes = await fetch('/api/upload-backoffice-image', {
                        method: 'POST',
                        body: courierDetailsFormData,
                    })
                    const uploadResult = await uploadRes.json()
                    setCourierDetailsUploading(false)

                    if (uploadResult.success) {
                        fieldData.backoffice_courier_image_url = uploadResult.data.url
                    } else {
                        setErrors(prev => ({ ...prev, courier_details: uploadResult.error || 'Failed to upload courier details image' }))
                        setIsSubmitting(false)
                        return
                    }
                }
            }

            // Upload Final Report file if selected (for Final Report Generated stage)
            if (finalReportFile && targetStage.name.toLowerCase() === 'final report generated') {
                setFinalReportUploading(true)
                const finalReportFormData = new FormData()
                finalReportFormData.append('file', finalReportFile)
                finalReportFormData.append('ticketId', ticketId)

                const uploadRes = await fetch('/api/upload-final-report', {
                    method: 'POST',
                    body: finalReportFormData,
                })
                const uploadResult = await uploadRes.json()
                setFinalReportUploading(false)

                if (uploadResult.success) {
                    fieldData.final_report_url = uploadResult.data.url
                } else {
                    setErrors(prev => ({ ...prev, final_report: uploadResult.error || 'Failed to upload final report' }))
                    setIsSubmitting(false)
                    return
                }
            }

            // Auto-calculate current time if not provided
            const timeToSend = transition_time || new Date().toTimeString().split(' ')[0].slice(0, 5)

            // Build the transition data
            const transitionData: StatusChangeData = {
                ticket_id: ticketId,
                from_stage_id: currentStageId,
                to_stage_id: targetStage.id,
                transition_date,
                transition_time: timeToSend,
                field_data: fieldData,
            }

            // Check if this is an "Assigned" stage transition that requires mandatory download
            const stageName = targetStage.name.toLowerCase().trim()
            const isAssignedTransition = stageName === 'assigned' || stageName.includes('assignment') || stageName.includes('assign to')

            // Skip mandatory download for management roles (Admin/Manager) as Field Executives now have their own login
            const isManagementRole = currentUserRole === 'admin' || currentUserRole === 'manager'

            if (isAssignedTransition && !isManagementRole) {
                // For Assigned transitions: DO NOT commit status yet
                // Pass the pending transition data to the download modal
                // Status will only be committed AFTER download is completed
                const assignedToId = fieldData.assigned_to
                const assignedUser = users.find(u => u.id === assignedToId)

                // Build PDF data from ticket information

                onDownloadRequired({
                    // Use ticketData.uid if available, otherwise fallback to ticketId (but simpler format preferred if possible)
                    ticketUid: ticketData?.uid || ticketId,

                    // Prioritize patient name 1, then 2, or both
                    patientName: [ticketData?.patient_name, ticketData?.patient_name_2].filter(Boolean).join(' & ') || 'Unknown Patient',

                    // Use hospital name, or collection address if hospital is missing (e.g. home collection)
                    hospitalName: ticketData?.hospital?.name || ticketData?.collection_address || 'N/A',

                    assignedToName: assignedUser?.full_name || 'Field Executive',
                    transitionDate: formData.transition_date || new Date().toISOString().split('T')[0],

                    // Use service type name, or fallback to ticket type/subtype
                    testType: ticketData?.service_type?.name || ticketData?.action_subtype || ticketData?.type || 'N/A',

                    // These now come consistently from the ticketData
                    collectionDate: ticketData?.scheduled_date ? (() => {
                        const [y, m, d] = ticketData.scheduled_date.split('-')
                        return `${d}/${m}/${y}`
                    })() : 'N/A',
                    collectionTime: ticketData?.scheduled_time ? (() => {
                        const [h, m] = ticketData.scheduled_time.split(':')
                        const hour = parseInt(h)
                        const ampm = hour >= 12 ? 'PM' : 'AM'
                        const hour12 = hour % 12 || 12
                        return `${hour12}:${m} ${ampm}`
                    })() : 'N/A',

                    // Pass the pending transition - will be committed after download
                    pendingTransition: transitionData,
                })
                // Close this modal - the download modal will handle the rest
                onClose()
            } else {
                // For non-Assigned transitions: commit immediately as before
                await onConfirm(transitionData)
                onClose()
            }
        } catch (error) {
            console.error('Error submitting status change:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderField = (field: ModalFieldConfig) => {
        switch (field.type) {
            case 'date':
                return (
                    <Input
                        key={field.id}
                        label={field.label}
                        type="date"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        error={errors[field.id]}
                        required={field.required}
                    />
                )

            case 'time':
                return (
                    <Input
                        key={field.id}
                        label={field.label}
                        type="time"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        error={errors[field.id]}
                        required={field.required}
                    />
                )

            case 'datetime':
                return (
                    <Input
                        key={field.id}
                        label={field.label}
                        type="datetime-local"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        error={errors[field.id]}
                        required={field.required}
                    />
                )

            case 'text':
                return (
                    <Input
                        key={field.id}
                        label={field.label}
                        type="text"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        error={errors[field.id]}
                        required={field.required}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                )

            case 'system_dropdown':
                if (field.source === 'users') {
                    return (
                        <Select
                            key={field.id}
                            label={field.label}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            options={[
                                { value: '', label: `Select ${field.label}...` },
                                ...users
                                    .filter(u => {
                                        // If the label is "Field Executive", filter by role
                                        if (field.label.toLowerCase().includes('field executive')) {
                                            return u.role === 'field_executive'
                                        }
                                        return true // Show all roles for other user dropdowns
                                    })
                                    .map(u => ({ value: u.id, label: u.full_name }))
                            ]}
                            error={errors[field.id]}
                            required={field.required}
                        />
                    )
                }
                if (field.source === 'labs') {
                    return (
                        <Select
                            key={field.id}
                            label={field.label}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            options={[
                                { value: '', label: `Select ${field.label}...` },
                                ...labs.map(l => ({ value: l.id, label: l.name }))
                            ]}
                            error={errors[field.id]}
                            required={field.required}
                        />
                    )
                }
                return null

            default:
                return null
        }
    }

    if (!targetStage) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Change Status to: ${targetStage.name}`}
            description="Please provide the required information for this status change."
        >
            <div className="space-y-4">
                {/* Status Date & Time - Hidden from UI but automatically recorded */}

                {/* Configured Modal Fields - Filter out date/time fields since we have pre-filled Status Date/Time above */}
                {targetStage.modal_fields
                    ?.filter(field => !['date', 'time', 'datetime'].includes(field.type))
                    .map(field => renderField(field))}

                {/* Robustness Fallback: If stage is 'Assigned' but no fields configured, show Assignment dropdown */}
                {targetStage.name.toLowerCase() === 'assigned' &&
                    !targetStage.modal_fields?.some(f => f.id === 'assigned_to') &&
                    renderField({ id: 'assigned_to', label: 'Field Executive', type: 'system_dropdown', source: 'users', required: true })}

                {/* Field Executive Allocations Preview - Show when assigning a ticket */}
                {targetStage.name.toLowerCase() === 'assigned' && formData.assigned_to && ticketData?.scheduled_date && (
                    <div className="mt-3 p-3 rounded-lg bg-[var(--gray-50)] border border-[var(--border-light)]">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                                <Clock size={14} className="text-[var(--primary-500)]" />
                                Existing Allocations on {new Date(ticketData.scheduled_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </h4>
                            {allocationsLoading && (
                                <div className="spinner spinner-sm" />
                            )}
                        </div>

                        {!allocationsLoading && feAllocations.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)] italic">
                                No other tickets assigned to this executive on this date.
                            </p>
                        )}

                        {!allocationsLoading && feAllocations.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-[var(--warning-600)] font-medium">
                                    ⚠️ {feAllocations.length} ticket{feAllocations.length > 1 ? 's' : ''} already assigned on this date:
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1.5">
                                    {feAllocations.map((allocation) => (
                                        <div
                                            key={allocation.id}
                                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white border border-[var(--border-default)] text-xs"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-mono font-semibold text-[var(--primary-700)] whitespace-nowrap">
                                                    {allocation.scheduled_time
                                                        ? (() => {
                                                            const [h, m] = allocation.scheduled_time.split(':')
                                                            const hour = parseInt(h)
                                                            const ampm = hour >= 12 ? 'PM' : 'AM'
                                                            const hour12 = hour % 12 || 12
                                                            return `${hour12}:${m} ${ampm}`
                                                        })()
                                                        : 'No time'}
                                                </span>
                                                <span className="text-[var(--text-muted)]">•</span>
                                                <span className="font-medium text-[var(--text-primary)] truncate">
                                                    {allocation.uid}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[var(--text-secondary)] truncate max-w-[100px]">
                                                    {allocation.patient_name || 'Unknown'}
                                                </span>
                                                {allocation.current_stage_name && (
                                                    <Badge
                                                        color={allocation.current_stage_color || '#6b7280'}
                                                        size="sm"
                                                        className="text-[10px] px-1.5 py-0.5"
                                                    >
                                                        {allocation.current_stage_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* Actual Collection Date/Time Inputs - Only for Sample Collected stage */}
                {targetStage.name.toLowerCase() === 'sample collected' && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-light)] mt-2">
                        <div className="col-span-2 text-sm font-medium text-[var(--primary-700)] mb-1">
                            Actual Collection Details
                        </div>
                        <Input
                            label="Actual Date of Collection"
                            type="date"
                            value={formData.actual_collection_date || ''}
                            onChange={(e) => handleFieldChange('actual_collection_date', e.target.value)}
                            error={errors.actual_collection_date}
                            required
                        />
                        <Input
                            label="Actual Time of Collection"
                            type="time"
                            value={formData.actual_collection_time || ''}
                            onChange={(e) => handleFieldChange('actual_collection_time', e.target.value)}
                            error={errors.actual_collection_time}
                            required
                        />
                    </div>
                )}

                {/* Robustness Fallback: If stage is 'Sample Sent To' but no fields configured, show Lab dropdown */}
                {targetStage.name.toLowerCase() === 'sample sent to' &&
                    !targetStage.modal_fields?.some(f => f.id === 'lab_id') &&
                    renderField({ id: 'lab_id', label: 'Laboratory', type: 'system_dropdown', source: 'labs', required: true })}

                {/* TRF Document Upload - Only for Sample Received stage (Hidden for backoffice as Field Executive already uploads it) */}
                {targetStage.name.toLowerCase() === 'sample received' && !(currentUserRole && isOfficerBackoffice(currentUserRole)) && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-[var(--text-secondary)]">
                                Test Requisition Form (TRF)
                                <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
                            </label>
                            {trfFiles.length > 0 && (
                                <Badge color="var(--primary-600)" size="sm">
                                    {trfFiles.length} {trfFiles.length === 1 ? 'Page' : 'Pages'}
                                </Badge>
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                onClick={() => trfInputRef.current?.click()}
                            >
                                <input
                                    ref={trfInputRef}
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleTrfFileSelect}
                                    className="hidden"
                                />
                                <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                <span className="text-xs font-medium text-[var(--text-secondary)]">Upload Files</span>
                            </button>

                            <button
                                type="button"
                                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                onClick={() => trfCameraInputRef.current?.click()}
                            >
                                <input
                                    ref={trfCameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleTrfFileSelect}
                                    className="hidden"
                                />
                                <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                <span className="text-xs font-medium text-[var(--text-secondary)]">Take Photo</span>
                            </button>
                        </div>

                        {/* Previews List */}
                        {trfFiles.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[var(--gray-50)] rounded-xl border border-[var(--border-default)]">
                                {trfFiles.map((file, index) => (
                                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--border-default)] bg-white shadow-sm">
                                        {trfPreviews[index] === 'pdf-placeholder' ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--error-50)] text-[var(--error-600)]">
                                                <FileText size={20} />
                                                <span className="text-[10px] font-bold mt-1 uppercase">PDF</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={trfPreviews[index]}
                                                alt={`TRF Page ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeTrfFile(index)}
                                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                title="Remove image"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 py-1 px-2 bg-black/60 text-white text-[9px] font-medium">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                ))}

                                {/* Quick Add button in the list */}
                                <button
                                    type="button"
                                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-default)] rounded-lg hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-all"
                                    onClick={() => trfCameraInputRef.current?.click()}
                                >
                                    <Plus size={20} />
                                    <span className="text-[9px] font-bold uppercase mt-1">Add More</span>
                                </button>
                            </div>
                        )}

                        {errors.trf && (
                            <p className="text-sm text-[var(--error-600)]">{errors.trf}</p>
                        )}

                        {trfUploading && (
                            <div className="flex items-center gap-2 text-sm text-[var(--primary-600)] animate-pulse">
                                <div className="spinner spinner-xs" />
                                <span>Uploading {trfFiles.length} TRF document{trfFiles.length !== 1 ? 's' : ''}...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Raw Report Upload - Report Received stage */}
                {targetStage.name.toLowerCase() === 'report received' && (() => {
                    const activeDiags = (ticketData?.diagnostics ?? []).filter((d: any) => !d.is_cancelled)
                    const isMultiDiag = activeDiags.length > 1

                    if (isMultiDiag) {
                        // ── Multi-diagnostic: one upload slot per diagnostic ──
                        return (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                                        Raw Reports
                                        <span className="text-red-500 ml-1">*</span>
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        At least one report is required. Upload for each diagnostic individually.
                                    </p>
                                </div>
                                {activeDiags.map((diag: any) => {
                                    const file = diagReportFiles[diag.id] ?? null
                                    const preview = diagReportPreviews[diag.id] ?? null
                                    const inputId = `diag-raw-report-${diag.id}`
                                    const label = diag.service_type?.name || `Diagnostic ${diag.id.slice(0, 6)}`
                                    return (
                                        <div key={diag.id} className="rounded-lg border border-[var(--border-default)] p-3 space-y-2">
                                            <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
                                            {file ? (
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {preview ? (
                                                            <img src={preview} alt="" className="w-10 h-10 object-cover rounded border border-[var(--border-default)] shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 flex items-center justify-center bg-[var(--error-50)] rounded border border-[var(--error-200)] shrink-0">
                                                                <FileText size={18} className="text-[var(--error-600)]" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                                                            <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        title="Remove"
                                                        onClick={() => {
                                                            setDiagReportFiles(prev => ({ ...prev, [diag.id]: null }))
                                                            setDiagReportPreviews(prev => ({ ...prev, [diag.id]: null }))
                                                        }}
                                                        className="p-1 rounded-full hover:bg-[var(--error-100)] text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors shrink-0"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label
                                                    htmlFor={inputId}
                                                    className="flex items-center gap-2 cursor-pointer border border-dashed border-[var(--border-default)] rounded p-3 hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-colors"
                                                >
                                                    <Upload size={16} className="text-[var(--text-muted)] shrink-0" />
                                                    <span className="text-xs text-[var(--text-secondary)]">Click to upload</span>
                                                    <input
                                                        id={inputId}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0]
                                                            if (!f) return
                                                            setDiagReportFiles(prev => ({ ...prev, [diag.id]: f }))
                                                            if (f.type.startsWith('image/')) {
                                                                const reader = new FileReader()
                                                                reader.onload = (ev) => setDiagReportPreviews(prev => ({ ...prev, [diag.id]: ev.target?.result as string }))
                                                                reader.readAsDataURL(f)
                                                            } else {
                                                                setDiagReportPreviews(prev => ({ ...prev, [diag.id]: null }))
                                                            }
                                                            e.target.value = ''
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )
                                })}
                                {errors.raw_report && (
                                    <p className="text-sm text-[var(--error-600)]">{errors.raw_report}</p>
                                )}
                            </div>
                        )
                    }

                    // ── Single diagnostic: existing single upload field ──
                    return (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Raw Report (Final/Lab Report)
                                {currentUserRole && isOfficerBackoffice(currentUserRole) ? (
                                    <span className="text-red-500 ml-1">*</span>
                                ) : (
                                    <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
                                )}
                            </label>
                            {!rawReportFile ? (
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${currentUserRole && isOfficerBackoffice(currentUserRole)
                                        ? 'border-[var(--error-400)] hover:border-[var(--error-600)] hover:bg-[var(--error-50)]'
                                        : 'border-[var(--border-default)] hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)]'
                                    }`}
                                    onClick={() => rawReportInputRef.current?.click()}
                                >
                                    <input
                                        ref={rawReportInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        onChange={handleRawReportFileSelect}
                                        className="hidden"
                                    />
                                    <Upload size={32} className={`mx-auto mb-2 ${currentUserRole && isOfficerBackoffice(currentUserRole) ? 'text-[var(--error-600)]' : 'text-[var(--text-muted)]'}`} />
                                    <p className="text-sm text-[var(--text-secondary)]">Click to upload raw report</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Supports: Images (JPEG, PNG, WebP) or PDF • Max 10MB</p>
                                </div>
                            ) : (
                                <div className="border border-[var(--border-default)] rounded-lg p-4 bg-[var(--gray-50)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {rawReportPreview ? (
                                                <img src={rawReportPreview} alt="Raw Report Preview" className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]" />
                                            ) : (
                                                <div className="w-16 h-16 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                                    <FileText size={24} className="text-[var(--error-600)]" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">{rawReportFile.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{(rawReportFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            title="Remove raw report"
                                            onClick={removeRawReportFile}
                                            className="p-1 rounded-full hover:bg-[var(--error-100)] text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {errors.raw_report && (
                                <p className="text-sm text-[var(--error-600)]">{errors.raw_report}</p>
                            )}
                            {rawReportUploading && (
                                <p className="text-sm text-[var(--primary-600)]">Uploading raw report...</p>
                            )}
                        </div>
                    )
                })()}

                {/* Sample After Tagging & Courier Details Upload - Only for Sample Sent To stage when user is backoffice/admin/manager */}
                {targetStage.name.toLowerCase() === 'sample sent to' && currentUserRole && (isOfficerBackoffice(currentUserRole) || isAdmin(currentUserRole) || isManager(currentUserRole)) && (
                    <div className="space-y-4 pt-2 border-t border-[var(--border-light)]">
                        {/* Label Code */}
                        <div className="space-y-2">
                            <Input
                                label="Label Code"
                                placeholder="Enter secret label code (e.g. LAB-123)"
                                value={formData.label_code || ''}
                                onChange={(e) => handleFieldChange('label_code', e.target.value)}
                                error={errors.label_code}
                                required
                            />
                            <p className="text-[10px] text-[var(--text-muted)] italic px-1">
                                * This code will be used to identify the sample at the laboratory.
                            </p>
                        </div>

                        {/* Sample After Tagging */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Sample After Tagging
                            </label>

                            {!taggedSampleFile ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => taggedSampleInputRef.current?.click()}
                                    >
                                        <input
                                            ref={taggedSampleInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleTaggedSampleFileSelect}
                                            className="hidden"
                                        />
                                        <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Upload Image</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => taggedSampleCameraInputRef.current?.click()}
                                    >
                                        <input
                                            ref={taggedSampleCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleTaggedSampleFileSelect}
                                            className="hidden"
                                        />
                                        <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Take Photo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-[var(--primary-300)] rounded-lg p-4 bg-[var(--primary-50)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {taggedSamplePreview && (
                                                <img
                                                    src={taggedSamplePreview}
                                                    alt="Tagged Sample Preview"
                                                    className="w-20 h-20 object-cover rounded-lg border border-[var(--border-default)]"
                                                />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                                                    {taggedSampleFile.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {(taggedSampleFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeTaggedSampleFile}
                                            className="p-1 rounded-full hover:bg-[var(--error-100)] text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {errors.tagged_sample && (
                                <p className="text-sm text-[var(--error-600)]">{errors.tagged_sample}</p>
                            )}

                            {taggedSampleUploading && (
                                <p className="text-sm text-[var(--primary-600)]">Uploading tagged sample image...</p>
                            )}
                        </div>

                        {/* Courier Details */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Courier Details
                                <span className="text-red-500 ml-1">*</span>
                            </label>

                            {!courierDetailsFile ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => courierDetailsInputRef.current?.click()}
                                    >
                                        <input
                                            ref={courierDetailsInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleCourierDetailsFileSelect}
                                            className="hidden"
                                        />
                                        <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Upload Image</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] transition-all group"
                                        onClick={() => courierDetailsCameraInputRef.current?.click()}
                                    >
                                        <input
                                            ref={courierDetailsCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleCourierDetailsFileSelect}
                                            className="hidden"
                                        />
                                        <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--primary-600)] mb-1" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Take Photo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-[var(--primary-300)] rounded-lg p-4 bg-[var(--primary-50)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {courierDetailsPreview && (
                                                <img
                                                    src={courierDetailsPreview}
                                                    alt="Courier Details Preview"
                                                    className="w-20 h-20 object-cover rounded-lg border border-[var(--border-default)]"
                                                />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                                                    {courierDetailsFile.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {(courierDetailsFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeCourierDetailsFile}
                                            className="p-1 rounded-full hover:bg-[var(--error-100)] text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {errors.courier_details && (
                                <p className="text-sm text-[var(--error-600)]">{errors.courier_details}</p>
                            )}

                            {courierDetailsUploading && (
                                <p className="text-sm text-[var(--primary-600)]">Uploading courier details image...</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Final Report Document Upload - Only for Final Report Generated stage */}
                {targetStage.name.toLowerCase() === 'final report generated' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                            Final Report
                            <span className="text-[var(--error-600)] ml-1">*</span>
                        </label>

                        {!finalReportFile ? (
                            <div
                                className="border-2 border-dashed border-[var(--success-400)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--success-600)] hover:bg-[var(--success-50)] transition-colors"
                                onClick={() => finalReportInputRef.current?.click()}
                            >
                                <input
                                    ref={finalReportInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleFinalReportFileSelect}
                                    className="hidden"
                                />
                                <Upload size={32} className="mx-auto text-[var(--success-600)] mb-2" />
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Click to upload final report
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Supports: Images (JPEG, PNG, WebP) or PDF • Max 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="border border-[var(--success-300)] rounded-lg p-4 bg-[var(--success-50)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {finalReportPreview ? (
                                            <img
                                                src={finalReportPreview}
                                                alt="Final Report Preview"
                                                className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 flex items-center justify-center bg-[var(--success-100)] rounded-lg border border-[var(--success-300)]">
                                                <FileText size={24} className="text-[var(--success-700)]" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                                                {finalReportFile.name}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {(finalReportFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFinalReportFile}
                                        className="p-1 rounded-full hover:bg-[var(--error-100)] text-[var(--text-muted)] hover:text-[var(--error-600)] transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {errors.final_report && (
                            <p className="text-sm text-[var(--error-600)]">{errors.final_report}</p>
                        )}

                        {finalReportUploading && (
                            <p className="text-sm text-[var(--success-600)]">Uploading final report...</p>
                        )}
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} isLoading={isSubmitting}>
                    Confirm Status Change
                </Button>
            </ModalFooter>
        </Modal>
    )
}
