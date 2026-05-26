'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, AlertCircle, Upload, X, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import {
    Button,
    Input,
    Select,
    SearchableSelect,
    SearchableMultiSelect,
    Textarea,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui'
import type { Doctor, Hospital, ServiceType, PatientType, QueryCategory } from '@/lib/types'

const ticketSchema = z.object({
    type: z.enum(['action', 'query', 'info'], { message: 'Please select a ticket type' }),
    action_subtype: z.enum(['diagnostics', 'therapeutics']).optional(),
    query_category: z.enum(['report_related', 'scientific', 'billing_related', 'others']).optional(),
    service_type_id: z.string().optional(),          // For therapeutics (single)
    service_type_ids: z.array(z.string()).optional(), // For diagnostics (multiple)
    patient_name: z.string().optional(),
    patient_name_2: z.string().optional(),
    patient_age_1: z.string().optional(),
    patient_age_2: z.string().optional(),
    original_message: z.string().max(5000).optional(), // Now optional, screenshot is primary
    doctor_id: z.string().optional(),
    hospital_id: z.string().optional(),
    screenshot_url: z.string().optional(), // Added for screenshot
    scheduled_date: z.string().optional(),
    scheduled_time: z.string().optional(),
}).refine((data) => {
    // If ticket type is 'action', action_subtype is required
    if (data.type === 'action' && !data.action_subtype) {
        return false
    }
    // For diagnostics: at least one service type must be selected
    if (data.action_subtype === 'diagnostics') {
        if (!data.service_type_ids || data.service_type_ids.length === 0) {
            return false
        }
    }
    // For therapeutics: single service_type_id is required
    if (data.action_subtype === 'therapeutics' && !data.service_type_id) {
        return false
    }
    // If ticket type is 'query', query_category is required
    if (data.type === 'query' && !data.query_category) {
        return false
    }
    return true
}, {
    message: 'At least one service type is required',
    path: ['service_type_ids']
}).refine((data) => {
    // For query tickets: hospital_id and at least one patient name is required
    if (data.type === 'query') {
        if (!data.hospital_id) {
            return false
        }
        if (!data.patient_name?.trim() && !data.patient_name_2?.trim()) {
            return false
        }
    }
    // For action tickets: hospital_id and scheduled date/time are required
    if (data.type === 'action') {
        if (!data.hospital_id) {
            return false
        }
        if (!data.scheduled_date || !data.scheduled_time) {
            return false
        }
    }
    // For info tickets: hospital_id is required
    if (data.type === 'info') {
        if (!data.hospital_id) {
            return false
        }
    }
    return true
}, {
    message: 'Hospital is required for query and info tickets, and for query tickets at least one patient name is required',
    path: ['hospital_id']
})

type TicketFormData = z.infer<typeof ticketSchema>

export default function CreateTicketPage() {
    const router = useRouter()
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<{ uid: string } | null>(null)

    // Screenshot Upload State
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const [isCompressing, setIsCompressing] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<TicketFormData>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            type: 'action',
            original_message: '',
            patient_name: '',
            patient_name_2: '',
            doctor_id: '',
            hospital_id: '',
            screenshot_url: '',
            scheduled_date: '',
            scheduled_time: '',
            query_category: undefined,
            service_type_ids: [],
        },
    })

    const selectedHospitalId = watch('hospital_id')
    const selectedType = watch('type')
    const selectedActionSubtype = watch('action_subtype')
    const selectedServiceTypeId = watch('service_type_id')
    const selectedServiceTypeIds = watch('service_type_ids') || []
    const selectedQueryCategory = watch('query_category')

    // Derive patient_type from selected service type(s)
    // For diagnostics multi-select, compute the UNION of all selected tests' patient types
    // If ANY test needs male fields, show male. If ANY test needs female fields, show female.
    let showMaleFields = false
    let showFemaleFields = false
    let aggregatePatientTypeLabel: string = 'couple'

    if (selectedActionSubtype === 'diagnostics' && selectedServiceTypeIds.length > 0) {
        const selectedTypes = serviceTypes.filter(st => selectedServiceTypeIds.includes(st.id))
        for (const st of selectedTypes) {
            const pt = st.patient_type || 'couple'
            if (pt === 'couple' || pt === 'male_only') showMaleFields = true
            if (pt === 'couple' || pt === 'female_only') showFemaleFields = true
        }
        if (showMaleFields && showFemaleFields) aggregatePatientTypeLabel = 'Couple'
        else if (showMaleFields) aggregatePatientTypeLabel = 'Male Only'
        else if (showFemaleFields) aggregatePatientTypeLabel = 'Female Only'
    } else if (selectedActionSubtype === 'therapeutics' && selectedServiceTypeId) {
        const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId)
        const patientType: PatientType = selectedServiceType?.patient_type || 'couple'
        showMaleFields = patientType === 'couple' || patientType === 'male_only'
        showFemaleFields = patientType === 'couple' || patientType === 'female_only'
        aggregatePatientTypeLabel = patientType === 'couple' ? 'Couple' : patientType === 'female_only' ? 'Female Only' : 'Male Only'
    }

    useEffect(() => {
        // Fetch hospitals and service types
        fetch('/api/hospitals')
            .then((res) => res.json())
            .then((result) => {
                if (result.success) setHospitals(result.data)
            })

        fetch('/api/service-types')
            .then((res) => res.json())
            .then((result) => {
                if (result.success) setServiceTypes(result.data)
            })
    }, [])

    useEffect(() => {
        // Fetch doctors (optionally filtered by hospital)
        const params = selectedHospitalId ? `?hospital_id=${selectedHospitalId}` : ''
        fetch(`/api/doctors${params}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.success) setDoctors(result.data)
            })
    }, [selectedHospitalId])

    // Reset form fields when ticket type changes
    useEffect(() => {
        if (selectedType === 'query') {
            // Clear action-specific fields
            setValue('action_subtype', undefined, { shouldValidate: false })
            setValue('service_type_id', '', { shouldValidate: false })
            setValue('service_type_ids', [], { shouldValidate: false })
            setValue('scheduled_date', '', { shouldValidate: false })
            setValue('scheduled_time', '', { shouldValidate: false })
        } else if (selectedType === 'action') {
            // Clear query-specific fields
            setValue('query_category', undefined, { shouldValidate: false })
        } else if (selectedType === 'info') {
            // Clear both action and query fields
            setValue('action_subtype', undefined, { shouldValidate: false })
            setValue('service_type_id', '', { shouldValidate: false })
            setValue('service_type_ids', [], { shouldValidate: false })
            setValue('query_category', undefined, { shouldValidate: false })
            setValue('scheduled_date', '', { shouldValidate: false })
            setValue('scheduled_time', '', { shouldValidate: false })
        }
    }, [selectedType, setValue])

    // ============================================
    // SCREENSHOT HANDLING
    // ============================================

    const compressImage = async (file: File): Promise<File> => {
        setIsCompressing(true)
        setUploadProgress('Compressing image...')

        try {
            const options = {
                maxSizeMB: 0.5, // Max 500KB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/webp' as const,
            }

            const compressedFile = await imageCompression(file, options)
            return compressedFile
        } finally {
            setIsCompressing(false)
            setUploadProgress(null)
        }
    }

    const handleFileSelect = async (file: File) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload a JPG, PNG, or WebP image')
            return
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image is too large. Maximum size is 10MB')
            return
        }

        setError(null)

        // Compress the image
        const compressedFile = await compressImage(file)
        setScreenshotFile(compressedFile)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setScreenshotPreview(e.target?.result as string)
        }
        reader.readAsDataURL(compressedFile)
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const removeScreenshot = () => {
        setScreenshotFile(null)
        setScreenshotPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const uploadScreenshot = async (): Promise<string | null> => {
        if (!screenshotFile) return null

        setUploadProgress('Uploading screenshot...')

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
                throw new Error(result.error || 'Upload failed')
            }
        } finally {
            setUploadProgress(null)
        }
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    const onSubmit = async (data: TicketFormData) => {
        // Validate: must have either screenshot or message (except for query tickets which have different requirements)
        if (data.type !== 'query' && !screenshotFile && !data.original_message?.trim()) {
            setError('Please upload a WhatsApp screenshot or enter the message text')
            return
        }

        // For query tickets, screenshot/message is optional
        // No action needed - query tickets can proceed without screenshot/message

        setIsSubmitting(true)
        setError(null)

        try {
            // Step 1: Upload screenshot if present
            let screenshotUrl: string | null = null
            if (screenshotFile) {
                screenshotUrl = await uploadScreenshot()
                if (!screenshotUrl) {
                    setError('Failed to upload screenshot')
                    setIsSubmitting(false)
                    return
                }
            }

            // Step 2: Create ticket with screenshot URL
            const ticketData = {
                ...data,
                query_category: data.type === 'query' ? data.query_category : undefined,
                screenshot_url: screenshotUrl || undefined,
                // For diagnostics multi-select, send service_type_ids instead of service_type_id
                service_type_id: data.action_subtype === 'diagnostics' ? undefined : data.service_type_id,
                service_type_ids: data.action_subtype === 'diagnostics' ? data.service_type_ids : undefined,
            }

            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData),
            })

            const result = await response.json()

            if (result.success) {
                setSuccess({ uid: result.data.uid })
                // Redirect after 2 seconds
                setTimeout(() => {
                    router.push(`/tickets/${result.data.id}`)
                }, 2000)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to create ticket')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in">
                <Card padding="lg">
                    <CardContent className="text-center py-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success-50)] flex items-center justify-center"
                        >
                            <CheckCircle size={32} className="text-[var(--success-600)]" />
                        </motion.div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Ticket Created Successfully!
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-4">
                            Your ticket ID is: <span className="font-mono font-bold text-[var(--primary-600)]">{success.uid}</span>
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">Redirecting to ticket details...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Back Link */}
            <Link href="/tickets" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
                <ArrowLeft size={18} />
                <span>Back to Tickets</span>
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Ticket</CardTitle>
                    <CardDescription>
                        Convert a WhatsApp message into a structured, trackable ticket
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20">
                            <AlertCircle className="w-5 h-5 text-[var(--error-600)] flex-shrink-0" />
                            <p className="text-sm text-[var(--error-600)]">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Ticket Type */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">
                                Ticket Type <span className="text-[var(--error-500)]">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'action', label: 'Action', desc: 'Diagnostic/Therapeutic request' },
                                    { value: 'query', label: 'Query', desc: 'Question or clarification' },
                                    { value: 'info', label: 'Info', desc: 'FYI, non-actionable' },
                                ].map((type) => (
                                    <label
                                        key={type.value}
                                        className={`
                      relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${watch('type') === type.value
                                                ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                                                : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'
                                            }
                    `}
                                    >
                                        <input
                                            type="radio"
                                            value={type.value}
                                            {...register('type')}
                                            className="sr-only"
                                        />
                                        <span className="font-medium text-[var(--text-primary)]">{type.label}</span>
                                        <span className="text-xs text-[var(--text-muted)] mt-1">{type.desc}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.type && (
                                <p className="mt-1.5 text-sm text-[var(--error-600)]">{errors.type.message}</p>
                            )}
                        </div>

                        {/* Action Subtype - Only show when type is 'action' */}
                        {selectedType === 'action' && (
                            <div>
                                <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">
                                    Action Subtype <span className="text-[var(--error-500)]">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'diagnostics', label: 'Diagnostics' },
                                        { value: 'therapeutics', label: 'Therapeutics' },
                                    ].map((subtype) => (
                                        <button
                                            key={subtype.value}
                                            type="button"
                                            onClick={() => {
                                                setValue('action_subtype', subtype.value as 'diagnostics' | 'therapeutics', { shouldValidate: true })
                                                setValue('service_type_id', '')
                                                setValue('service_type_ids', [])
                                            }}
                                            className={`
                        relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedActionSubtype === subtype.value
                                                    ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                                                    : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'
                                                }
                      `}
                                        >
                                            <span className="font-medium text-[var(--text-primary)]">{subtype.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.action_subtype && (
                                    <p className="mt-1.5 text-sm text-[var(--error-600)]">{errors.action_subtype.message}</p>
                                )}
                            </div>
                        )}

                        {/* Service Type - Only show when action_subtype is selected */}
                        {selectedActionSubtype === 'therapeutics' && (
                            <Select
                                label="Select Therapeutic Service"
                                placeholder="Choose therapeutics service..."
                                options={serviceTypes
                                    .filter((st) => st.category === 'therapeutics' && st.is_active)
                                    .map((st) => ({ value: st.id, label: st.name }))}
                                {...register('service_type_id')}
                                error={errors.service_type_id?.message}
                                required
                            />
                        )}

                        {/* Multi-select dropdown for diagnostics */}
                        {selectedActionSubtype === 'diagnostics' && (
                            <SearchableMultiSelect
                                label="Select Diagnostic Tests"
                                placeholder="Search and select tests..."
                                required
                                options={serviceTypes
                                    .filter((st) => st.category === 'diagnostics' && st.is_active)
                                    .map((st) => ({
                                        value: st.id,
                                        label: st.name,
                                        description: st.kit ? `Kit: ${st.kit}` : undefined,
                                    }))}
                                value={selectedServiceTypeIds}
                                onChange={(ids) => setValue('service_type_ids', ids, { shouldValidate: true })}
                                error={(errors as any).service_type_ids?.message}
                            />
                        )}

                        {/* Patient Information - Dynamic based on service type */}
                        {selectedType === 'action' && (selectedServiceTypeId || selectedServiceTypeIds.length > 0) && (
                            <div className="space-y-4 p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--border-light)]">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        👥 Patient Information
                                        <span className="text-xs font-normal text-[var(--text-muted)]">(Optional - can be filled later)</span>
                                    </h3>
                                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)]">
                                        {aggregatePatientTypeLabel}
                                    </span>
                                </div>

                                {/* Male Patient (Husband) */}
                                {showMaleFields && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                                            ♂️ Husband&apos;s Details
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Name"
                                                placeholder="Husband's full name"
                                                {...register('patient_name')}
                                            />
                                            <Input
                                                label="Age"
                                                type="number"
                                                placeholder="Age in years"
                                                {...register('patient_age_1')}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Female Patient (Wife) */}
                                {showFemaleFields && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                                            ♀️ Wife&apos;s Details
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Name"
                                                placeholder="Wife's full name"
                                                {...register('patient_name_2')}
                                            />
                                            <Input
                                                label="Age"
                                                type="number"
                                                placeholder="Age in years"
                                                {...register('patient_age_2')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Query Category - Only show when type is 'query' */}
                        {selectedType === 'query' && (
                            <div>
                                <label className="block mb-3 text-sm font-medium text-[var(--text-primary)]">
                                    Query Category <span className="text-[var(--error-500)]">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'report_related', label: 'Report Related', icon: '📄' },
                                        { value: 'scientific', label: 'Scientific', icon: '🔬' },
                                        { value: 'billing_related', label: 'Billing Related', icon: '💰' },
                                        { value: 'others', label: 'Others', icon: '📋' },
                                    ].map((category) => (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => {
                                                setValue('query_category', category.value as QueryCategory, { shouldValidate: true })
                                            }}
                                            className={`
                                                relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all
                                                ${selectedQueryCategory === category.value
                                                    ? 'border-[var(--primary-500)] bg-[var(--primary-50)] shadow-sm'
                                                    : 'border-[var(--border-default)] hover:border-[var(--primary-300)] hover:bg-[var(--gray-50)]'
                                                }
                                            `}
                                        >
                                            <span className="text-2xl mb-2">{category.icon}</span>
                                            <span className="font-medium text-sm text-[var(--text-primary)]">{category.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.query_category && (
                                    <p className="mt-1.5 text-sm text-[var(--error-600)]">{errors.query_category.message}</p>
                                )}
                            </div>
                        )}

                        {/* Query Ticket Fields - Clean, Modern Design */}
                        {selectedType === 'query' && (
                            <div className="space-y-5 p-6 bg-gradient-to-br from-[var(--primary-50)]/50 to-[var(--gray-50)] rounded-xl border border-[var(--primary-200)]/30">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-6 bg-[var(--primary-600)] rounded-full"></div>
                                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                        Query Details
                                    </h3>
                                </div>

                                {/* Patient Names - Mandatory (at least one) */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">
                                            Patient Name(s) <span className="text-[var(--error-500)]">*</span>
                                            <span className="text-xs font-normal text-[var(--text-muted)] ml-2">(At least one required)</span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Patient Name 1"
                                                placeholder="Enter patient name"
                                                {...register('patient_name')}
                                                error={selectedType === 'query' && !watch('patient_name')?.trim() && !watch('patient_name_2')?.trim() ? 'At least one patient name is required' : undefined}
                                            />
                                            <Input
                                                label="Patient Name 2"
                                                placeholder="Enter second patient name (optional)"
                                                {...register('patient_name_2')}
                                            />
                                        </div>
                                    </div>

                                    {/* Hospital - Mandatory */}
                                    <SearchableSelect
                                        label="Hospital"
                                        placeholder="Search and select hospital..."
                                        options={hospitals.map((h) => ({ value: h.id, label: h.name }))}
                                        value={watch('hospital_id')}
                                        onChange={(value) => setValue('hospital_id', value, { shouldValidate: true })}
                                        error={errors.hospital_id?.message}
                                        required
                                    />

                                    {/* Doctor - Optional */}
                                    <Select
                                        label="Doctor"
                                        placeholder="Select doctor (optional)"
                                        options={doctors.map((d) => ({ value: d.id, label: d.name }))}
                                        {...register('doctor_id')}
                                        error={errors.doctor_id?.message}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Info Ticket Fields */}
                        {selectedType === 'info' && (
                            <SearchableSelect
                                label="Hospital"
                                placeholder="Search and select hospital..."
                                options={hospitals.map((h) => ({ value: h.id, label: h.name }))}
                                value={watch('hospital_id')}
                                onChange={(value) => setValue('hospital_id', value, { shouldValidate: true })}
                                error={errors.hospital_id?.message}
                                required
                            />
                        )}

                        {/* Hospital - Required for Action tickets */}
                        {selectedType === 'action' && (
                            <SearchableSelect
                                label="Hospital"
                                placeholder="Search and select hospital..."
                                options={hospitals.map((h) => ({ value: h.id, label: h.name }))}
                                value={watch('hospital_id')}
                                onChange={(value) => setValue('hospital_id', value, { shouldValidate: true })}
                                error={errors.hospital_id?.message}
                                required
                            />
                        )}

                        {/* Doctor - For Action tickets */}
                        {selectedType === 'action' && (
                            <Select
                                label="Doctor"
                                placeholder="Select doctor (optional)"
                                options={doctors.map((d) => ({ value: d.id, label: d.name }))}
                                {...register('doctor_id')}
                                error={errors.doctor_id?.message}
                            />
                        )}

                        {/* Scheduled Pickup Date & Time - Only for Action tickets */}
                        {selectedType === 'action' && (
                            <div className="space-y-4 p-4 bg-[var(--primary-50)]/30 rounded-lg border border-[var(--primary-200)]/50">
                                <h3 className="text-sm font-semibold text-[var(--primary-700)] flex items-center gap-2">
                                    📅 Scheduled Pickup Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Pickup Date"
                                        type="date"
                                        {...register('scheduled_date')}
                                        error={errors.scheduled_date?.message}
                                        required
                                    />
                                    <Input
                                        label="Pickup Time"
                                        type="time"
                                        {...register('scheduled_time')}
                                        error={errors.scheduled_time?.message}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* WhatsApp Screenshot Upload */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">
                                WhatsApp Screenshot <span className="text-[var(--error-500)]">*</span>
                            </label>

                            {/* Upload Progress Indicator */}
                            {(isCompressing || uploadProgress) && (
                                <div className="mb-3 p-3 rounded-lg bg-[var(--primary-50)] border border-[var(--primary-200)]">
                                    <div className="flex items-center gap-2 text-sm text-[var(--primary-700)]">
                                        <div className="animate-spin w-4 h-4 border-2 border-[var(--primary-600)] border-t-transparent rounded-full" />
                                        <span>{uploadProgress || 'Processing...'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Preview or Upload Zone */}
                            {screenshotPreview ? (
                                <div className="relative rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--gray-50)]">
                                    <img
                                        src={screenshotPreview}
                                        alt="WhatsApp Screenshot Preview"
                                        className="w-full max-h-[400px] object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeScreenshot}
                                        className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-[var(--text-secondary)] hover:text-[var(--error-600)] transition-colors"
                                        title="Remove screenshot"
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                                        {screenshotFile && `${(screenshotFile.size / 1024).toFixed(1)} KB`}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)]/30 transition-colors"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />
                                    <ImageIcon size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
                                    <p className="text-[var(--text-primary)] font-medium mb-1">
                                        Drop your WhatsApp screenshot here
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                                        or click to browse
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Supports JPG, PNG, WebP • Max 10MB • Auto-compressed
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Optional: Original Message Text (Fallback) */}
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                <span>Or type the message instead (optional)</span>
                            </summary>
                            <div className="mt-2">
                                <Textarea
                                    placeholder="Paste the WhatsApp message here if you don't have a screenshot..."
                                    rows={4}
                                    {...register('original_message')}
                                    error={errors.original_message?.message}
                                />
                            </div>
                        </details>

                        {/* Submit */}
                        <div className="flex items-center gap-3 pt-4">
                            <Button type="submit" isLoading={isSubmitting} className="flex-1">
                                Create Ticket
                            </Button>
                            <Link href="/tickets">
                                <Button variant="secondary" type="button">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
