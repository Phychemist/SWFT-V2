'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Clock,
    FileText,
    FileDown,
    Image as ImageIcon,
    Loader2,
    MapPin,
    Package,
    Plus,
    Stethoscope,
    Trash2,
    User,
    X,
    AlertCircle,
    Phone,
    ExternalLink,
    MessageSquare,
    Send,
    ChevronDown,
    ChevronUp,
    Save
} from 'lucide-react'
import { generateAssignmentPDF } from '@/lib/pdf-utils'
import type { SessionUser } from '@/lib/types'
import { ReplaceDocumentButton } from '@/components/ReplaceDocumentButton'

type DiagnosticImages = Record<string, { sample: string | null; courier: string | null }>

export default function FieldExecutiveTicketDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [ticket, setTicket] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Legacy single-diagnostic state
    const [trfImages, setTrfImages] = useState<string[]>([])
    const [sampleImage, setSampleImage] = useState<string | null>(null)
    const [courierImage, setCourierImage] = useState<string | null>(null)

    // Multi-diagnostic state: keyed by diagnostic id
    const [diagnosticImages, setDiagnosticImages] = useState<DiagnosticImages>({})

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [comments, setComments] = useState<any[]>([])
    const [newComment, setNewComment] = useState('')
    const [isPostingComment, setIsPostingComment] = useState(false)
    const [showAllComments, setShowAllComments] = useState(false)

    // Patient name editing state
    const [editPatientName, setEditPatientName] = useState('')
    const [editPatientName2, setEditPatientName2] = useState('')
    const [editPatientAge1, setEditPatientAge1] = useState('')
    const [editPatientAge2, setEditPatientAge2] = useState('')
    const [isSavingPatient, setIsSavingPatient] = useState(false)

    const isMultiDiagnostic = ticket?.diagnostics && ticket.diagnostics.length > 0
    const activeDiagnostics = isMultiDiagnostic
        ? ticket.diagnostics.filter((d: any) => !d.is_cancelled)
        : []

    // Determine if this ticket is purely therapeutics (no sample collection needed)
    const isTherapeutics = isMultiDiagnostic
        ? activeDiagnostics.every((d: any) => d.service_type?.category === 'therapeutics')
        : ticket?.service_type?.category === 'therapeutics'

    // Derive which patient fields to show based on service type patient_type
    let showMaleFields = false
    let showFemaleFields = false
    if (isMultiDiagnostic && activeDiagnostics.length > 0) {
        for (const d of activeDiagnostics) {
            const pt = d.service_type?.patient_type || 'couple'
            if (pt === 'couple' || pt === 'male_only') showMaleFields = true
            if (pt === 'couple' || pt === 'female_only') showFemaleFields = true
        }
    } else if (ticket?.service_type?.patient_type) {
        const pt = ticket.service_type.patient_type
        showMaleFields = pt === 'couple' || pt === 'male_only'
        showFemaleFields = pt === 'couple' || pt === 'female_only'
    } else {
        // Fallback: show both fields
        showMaleFields = true
        showFemaleFields = true
    }

    const patientDetailsMissing = ticket && (
        (showMaleFields && (!ticket.patient_name?.trim() || ticket.patient_age_1 == null)) ||
        (showFemaleFields && (!ticket.patient_name_2?.trim() || ticket.patient_age_2 == null))
    )

    const savePatientNames = async () => {
        try {
            setIsSavingPatient(true)
            setError(null)

            const updates: Record<string, any> = {}
            if (showMaleFields) {
                updates.patient_name = editPatientName.trim() || null
                updates.patient_age_1 = editPatientAge1 ? parseInt(editPatientAge1) : null
            }
            if (showFemaleFields) {
                updates.patient_name_2 = editPatientName2.trim() || null
                updates.patient_age_2 = editPatientAge2 ? parseInt(editPatientAge2) : null
            }

            const res = await fetch(`/api/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })

            const data = await res.json()
            if (data.success) {
                setTicket((prev: any) => ({ ...prev, ...updates }))
                setSuccess('Patient details saved successfully')
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || 'Failed to save patient details')
            }
        } catch (err) {
            setError('Failed to save patient details')
        } finally {
            setIsSavingPatient(false)
        }
    }

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/tickets/${id}/comments`)
            const data = await res.json()
            if (data.success) {
                setComments(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err)
        }
    }

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const [meRes, ticketRes] = await Promise.all([
                    fetch('/api/auth/me'),
                    fetch(`/api/tickets/${id}`),
                ])
                const meData = await meRes.json()
                const data = await ticketRes.json()
                if (meData.success) setCurrentUser(meData.data)
                if (data.success) {
                    setTicket(data.data)
                    setTrfImages(data.data.trf_image_urls || [])
                    setEditPatientName(data.data.patient_name || '')
                    setEditPatientName2(data.data.patient_name_2 || '')
                    setEditPatientAge1(data.data.patient_age_1 != null ? String(data.data.patient_age_1) : '')
                    setEditPatientAge2(data.data.patient_age_2 != null ? String(data.data.patient_age_2) : '')

                    // Initialize multi-diagnostic images from server data
                    if (data.data.diagnostics && data.data.diagnostics.length > 0) {
                        const imgMap: DiagnosticImages = {}
                        for (const diag of data.data.diagnostics) {
                            if (!diag.is_cancelled) {
                                imgMap[diag.id] = {
                                    sample: diag.sample_image_url || null,
                                    courier: diag.courier_image_url || null,
                                }
                            }
                        }
                        setDiagnosticImages(imgMap)
                    } else {
                        // Legacy single-diagnostic
                        setSampleImage(data.data.sample_image_url || null)
                        setCourierImage(data.data.courier_image_url || null)
                    }
                    fetchComments()
                } else {
                    setError(data.error)
                }
            } catch (err) {
                setError('Failed to load ticket')
            } finally {
                setLoading(false)
            }
        }
        fetchTicket()
    }, [id])

    const refetchTicket = async () => {
        try {
            const [meRes, ticketRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch(`/api/tickets/${id}`),
            ])
            const meData = await meRes.json()
            const data = await ticketRes.json()
            if (meData.success) setCurrentUser(meData.data)
            if (data.success) {
                setTicket(data.data)
                setTrfImages(data.data.trf_image_urls || [])
                if (data.data.diagnostics && data.data.diagnostics.length > 0) {
                    const imgMap: DiagnosticImages = {}
                    for (const diag of data.data.diagnostics) {
                        if (!diag.is_cancelled) {
                            imgMap[diag.id] = {
                                sample: diag.sample_image_url || null,
                                courier: diag.courier_image_url || null,
                            }
                        }
                    }
                    setDiagnosticImages(imgMap)
                } else {
                    setSampleImage(data.data.sample_image_url || null)
                    setCourierImage(data.data.courier_image_url || null)
                }
            }
        } catch (_) {}
    }

    const persistImageUpdate = async (field: string, value: any) => {
        try {
            await fetch(`/api/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            })
        } catch (e) {
            console.error('Failed to persist image:', e)
        }
    }

    const persistDiagnosticImageUpdate = async (diagnosticId: string, field: string, value: string) => {
        try {
            await fetch(`/api/ticket-diagnostics/${diagnosticId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            })
        } catch (e) {
            console.error('Failed to persist diagnostic image:', e)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string, diagnosticId?: string) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            const uploadKey = diagnosticId ? `${type}-${diagnosticId}` : type
            setUploading(uploadKey)
            setError(null)

            const formData = new FormData()
            formData.append('file', file)
            formData.append('ticketId', id)
            formData.append('type', type === 'sample' || type === 'courier' ? type : type)

            const res = await fetch('/api/field-executive/upload', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (data.success) {
                const newUrl = data.data.url
                if (type === 'trf') {
                    const newImages = [...trfImages, newUrl]
                    setTrfImages(newImages)
                    await persistImageUpdate('trf_image_urls', newImages)
                } else if (diagnosticId) {
                    // Multi-diagnostic: update per-diagnostic image
                    setDiagnosticImages(prev => ({
                        ...prev,
                        [diagnosticId]: {
                            ...prev[diagnosticId],
                            [type === 'sample' ? 'sample' : 'courier']: newUrl,
                        }
                    }))
                    const field = type === 'sample' ? 'sample_image_url' : 'courier_image_url'
                    await persistDiagnosticImageUpdate(diagnosticId, field, newUrl)
                } else {
                    // Legacy single-diagnostic
                    if (type === 'sample') {
                        setSampleImage(newUrl)
                        await persistImageUpdate('sample_image_url', newUrl)
                    } else if (type === 'courier') {
                        setCourierImage(newUrl)
                        await persistImageUpdate('courier_image_url', newUrl)
                    }
                }
                setSuccess(`${type.toUpperCase()} uploaded successfully`)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error)
            }
        } catch (err) {
            setError('Upload failed. Please try again.')
        } finally {
            setUploading(null)
        }
    }

    const removeTrfImage = async (index: number) => {
        const newImages = trfImages.filter((_, i) => i !== index)
        setTrfImages(newImages)
        await persistImageUpdate('trf_image_urls', newImages)
    }

    const handleDownloadTRF = async () => {
        if (!ticket) return

        try {
            setDownloading(true)
            setError(null)

            const patientName = [ticket.patient_name, ticket.patient_name_2]
                .filter(Boolean)
                .join(' & ') || 'Unknown Patient'

            const hospitalName = ticket.hospital?.name || ticket.collection_address || 'N/A'
            const assignedToName = ticket.assigned_user?.full_name || 'Field Executive'

            // For multi-diagnostic, show all test types
            let testType: string
            if (isMultiDiagnostic) {
                testType = activeDiagnostics
                    .map((d: any) => d.service_type?.name)
                    .filter(Boolean)
                    .join(', ') || 'N/A'
            } else {
                testType = ticket.service_type?.name || ticket.action_subtype || ticket.type || 'N/A'
            }

            const rawDate = ticket.collection_date || ticket.scheduled_date || new Date().toISOString().split('T')[0]
            const collectionDate = (() => {
                const [y, m, d] = rawDate.split('-')
                return `${d}/${m}/${y}`
            })()
            const rawTime = ticket.collection_time || ticket.scheduled_time || new Date().toTimeString().split(' ')[0].slice(0, 5)
            const collectionTime = (() => {
                const [h, m] = rawTime.split(':')
                const hour = parseInt(h)
                const ampm = hour >= 12 ? 'PM' : 'AM'
                const hour12 = hour % 12 || 12
                return `${hour12}:${m} ${ampm}`
            })()

            await generateAssignmentPDF({
                ticketUid: ticket.uid || id,
                patientName,
                hospitalName,
                assignedToName,
                transitionDate: new Date().toISOString().split('T')[0],
                testType,
                collectionDate,
                collectionTime
            })

            setSuccess('TRF form downloaded successfully!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            console.error('Failed to download TRF:', err)
            setError(err.message || 'Failed to download TRF form. Please try again.')
        } finally {
            setDownloading(false)
        }
    }

    // Check if all mandatory fields are complete (for enabling the submit button)
    const allMandatoryFieldsComplete = (): boolean => {
        // Patient names and ages are mandatory based on service type patient_type
        if (showMaleFields && !ticket?.patient_name?.trim()) return false
        if (showMaleFields && ticket?.patient_age_1 == null) return false
        if (showFemaleFields && !ticket?.patient_name_2?.trim()) return false
        if (showFemaleFields && ticket?.patient_age_2 == null) return false

        // For diagnostics, TRF is mandatory. For therapeutics, it's optional.
        if (!isTherapeutics && !trfImages.length) return false

        // Sample images are mandatory for both diagnostics and therapeutics.
        // Courier images are mandatory for diagnostics, but typically not required for therapeutics.
        if (isMultiDiagnostic) {
            return activeDiagnostics.every((d: any) => {
                const imgs = diagnosticImages[d.id]
                const sampleReady = !!imgs?.sample
                const courierReady = isTherapeutics || !!imgs?.courier
                return sampleReady && courierReady
            })
        } else {
            const sampleReady = !!sampleImage
            const courierReady = isTherapeutics || !!courierImage
            return sampleReady && courierReady
        }
    }

    // Backward-compatible alias
    const allUploadsComplete = allMandatoryFieldsComplete

    const handleStatusUpdate = async () => {
        if (!allMandatoryFieldsComplete()) {
            const missing: string[] = []
            if (showMaleFields && !ticket?.patient_name?.trim()) missing.push("husband's name")
            if (showMaleFields && ticket?.patient_age_1 == null) missing.push("husband's age")
            if (showFemaleFields && !ticket?.patient_name_2?.trim()) missing.push("wife's name")
            if (showFemaleFields && ticket?.patient_age_2 == null) missing.push("wife's age")
            if (!isTherapeutics && !trfImages.length) missing.push('TRF form')
            if (missing.length > 0) {
                setError(`Please fill in all mandatory fields: ${missing.join(', ')}.`)
            } else {
                setError('Please upload all mandatory documents first.')
            }
            return
        }

        try {
            setIsUpdatingStatus(true)
            setError(null)

            const stagesRes = await fetch('/api/workflow-stages')
            const stagesData = await stagesRes.json()
            const sampleCollectedStage = stagesData.data?.find((s: any) => s.name.toLowerCase() === 'sample collected')

            if (!sampleCollectedStage) {
                throw new Error('Sample Collected stage not found')
            }

            const transitionData: any = {
                ticket_id: id,
                from_stage_id: ticket.current_stage_id,
                to_stage_id: sampleCollectedStage.id,
                transition_date: new Date().toISOString().split('T')[0],
                field_data: {
                    trf_image_urls: trfImages,
                    actual_collection_date: new Date().toISOString().split('T')[0],
                    actual_collection_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
                }
            }

            // For single-diagnostic tickets, include sample image (always) and courier image (diagnostics only)
            if (!isMultiDiagnostic) {
                transitionData.field_data.sample_image_url = sampleImage
                if (!isTherapeutics) {
                    transitionData.field_data.courier_image_url = courierImage
                }
            }

            const res = await fetch('/api/status-transitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transitionData)
            })

            const data = await res.json()
            if (data.success) {
                const successMessage = isTherapeutics ? 'Task completed successfully!' : 'Status marked as Sample Collected!'
                setSuccess(successMessage)
                setTimeout(() => router.push('/field-executive'), 1500)
            } else {
                setError(data.error)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update status')
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handlePostComment = async () => {
        if (!newComment.trim()) return

        try {
            setIsPostingComment(true)
            const res = await fetch(`/api/tickets/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment.trim() })
            })
            const data = await res.json()
            if (data.success) {
                setNewComment('')
                setComments(prev => [data.data, ...prev])
                setSuccess('Note added successfully')
                setTimeout(() => setSuccess(null), 2000)
            } else {
                setError(data.error)
            }
        } catch (err) {
            setError('Failed to add note')
        } finally {
            setIsPostingComment(false)
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-[var(--primary-600)] animate-spin" />
            <p className="text-[var(--text-muted)] mt-4">Loading ticket details...</p>
        </div>
    )

    if (!ticket) return (
        <div className="p-8 text-center">
            <h1 className="text-xl font-bold">Ticket not found</h1>
            <Link href="/field-executive" className="text-[var(--primary-600)] mt-4 block">Back to Dashboard</Link>
        </div>
    )

    const isSampleCollected = ticket.current_stage?.name.toLowerCase() === 'sample collected'

    // Build progress items
    const buildProgress = () => {
        const items = []

        if (!isTherapeutics) {
            items.push({
                label: 'TRF Form',
                completed: trfImages.length > 0
            })
        }

        // For diagnostics or therapeutics, include sample images
        if (isMultiDiagnostic) {
            for (const diag of activeDiagnostics) {
                const imgs = diagnosticImages[diag.id]
                const name = diag.service_type?.name || 'Test'
                items.push({
                    label: isTherapeutics ? `${name} - Photo` : `${name} - Sample`,
                    completed: !!imgs?.sample
                })
                if (!isTherapeutics) {
                    items.push({
                        label: `${name} - Courier`,
                        completed: !!imgs?.courier
                    })
                }
            }
        } else {
            // Legacy single-diagnostic
            items.push({
                label: isTherapeutics ? 'Procedure Photo' : 'Sample Image',
                completed: !!sampleImage
            })
            if (!isTherapeutics) {
                items.push({
                    label: 'Courier Image',
                    completed: !!courierImage
                })
            }
        }

        return items
    }

    const progress = buildProgress()

    return (
        <div className="animate-fade-in bg-[var(--gray-50)] min-h-full">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-[var(--border-light)] sticky top-0 z-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-[var(--gray-50)]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-[var(--text-primary)]" style={{ fontSize: '16px' }}>{ticket.uid}</h1>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-medium">{ticket.current_stage?.name}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Status/Error Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-xl text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {success}
                    </div>
                )}

                {/* Patient Info Card */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                    <h2 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Patient Details</h2>

                    {patientDetailsMissing && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
                            <AlertCircle size={14} />
                            Patient names and ages are required to proceed.
                        </div>
                    )}

                    <div className="space-y-3">
                        {showMaleFields && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">Husband</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editPatientName}
                                        onChange={(e) => setEditPatientName(e.target.value)}
                                        placeholder="Name"
                                        className="flex-1 px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] focus:border-[var(--primary-400)]"
                                        maxLength={200}
                                    />
                                    <input
                                        type="number"
                                        value={editPatientAge1}
                                        onChange={(e) => setEditPatientAge1(e.target.value)}
                                        placeholder="Age"
                                        min={0}
                                        max={150}
                                        className="w-20 px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] focus:border-[var(--primary-400)]"
                                    />
                                </div>
                            </div>
                        )}
                        {showFemaleFields && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">Wife</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editPatientName2}
                                        onChange={(e) => setEditPatientName2(e.target.value)}
                                        placeholder="Name"
                                        className="flex-1 px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] focus:border-[var(--primary-400)]"
                                        maxLength={200}
                                    />
                                    <input
                                        type="number"
                                        value={editPatientAge2}
                                        onChange={(e) => setEditPatientAge2(e.target.value)}
                                        placeholder="Age"
                                        min={0}
                                        max={150}
                                        className="w-20 px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-200)] focus:border-[var(--primary-400)]"
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={savePatientNames}
                            disabled={isSavingPatient}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-xl disabled:opacity-50 transition-colors"
                        >
                            {isSavingPatient ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSavingPatient ? 'Saving...' : 'Save Patient Details'}
                        </button>
                    </div>

                    <div className="space-y-4 mt-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                <MapPin size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">{ticket.hospital?.name || ticket.collection_address || 'N/A'}</p>
                                <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>
                                    {ticket.hospital?.address ? `${ticket.hospital.address}, ${ticket.hospital.city || ''}`.trim() : 'Location'}
                                </p>
                                {ticket.hospital?.contact && (
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1" style={{ fontSize: '11px' }}>
                                        <Phone size={11} /> {ticket.hospital.contact}
                                    </p>
                                )}
                                {ticket.hospital?.location && (
                                    <a href={ticket.hospital.location} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary-600)] mt-1 flex items-center gap-1 hover:underline" style={{ fontSize: '11px' }} onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink size={11} /> Open in Maps
                                    </a>
                                )}
                            </div>
                        </div>
                        {ticket.doctor?.name && (
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                    <Stethoscope size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">Dr. {ticket.doctor.name}</p>
                                    {ticket.doctor.phone && (
                                        <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>{ticket.doctor.phone}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pickup Information */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                    <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Pickup Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                <MapPin size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">
                                    {ticket.collection_location === 'hospital'
                                        ? 'Hospital'
                                        : ticket.collection_location === 'home'
                                            ? 'Patient Home'
                                            : 'Not specified'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>
                                    {ticket.collection_location === 'hospital'
                                        ? ticket.hospital?.name || 'Hospital location'
                                        : ticket.collection_address || 'Address not provided'}
                                </p>
                                {ticket.collection_location === 'hospital' && ticket.hospital?.address && (
                                    <p className="text-xs text-[var(--text-muted)] mt-1" style={{ fontSize: '11px' }}>
                                        {ticket.hospital.address}{ticket.hospital.city ? `, ${ticket.hospital.city}` : ''}
                                    </p>
                                )}
                                {ticket.collection_location === 'hospital' && ticket.hospital?.contact && (
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1" style={{ fontSize: '11px' }}>
                                        <Phone size={11} /> {ticket.hospital.contact}
                                    </p>
                                )}
                                {ticket.collection_location === 'hospital' && ticket.hospital?.location && (
                                    <a href={ticket.hospital.location} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary-600)] mt-1 flex items-center gap-1 hover:underline" style={{ fontSize: '11px' }} onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink size={11} /> Open in Maps
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                <Clock size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                {ticket.scheduled_date ? (
                                    <>
                                        <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">
                                            {(() => {
                                                try {
                                                    const [y, m, d] = ticket.scheduled_date.split('-')
                                                    return `${d}/${m}/${y}`
                                                } catch {
                                                    return ticket.scheduled_date
                                                }
                                            })()}
                                            {ticket.scheduled_time && (() => {
                                                try {
                                                    const [h, m] = ticket.scheduled_time.split(':')
                                                    const hour = parseInt(h)
                                                    const ampm = hour >= 12 ? 'PM' : 'AM'
                                                    const hour12 = hour % 12 || 12
                                                    return ` at ${hour12}:${m} ${ampm}`
                                                } catch {
                                                    return ` ${ticket.scheduled_time}`
                                                }
                                            })()}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>Scheduled Pickup</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">
                                            {new Date(ticket.created_at).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>Created Date</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Internal Notes Section - Minimalist Redesign */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-4 border-b border-[var(--border-light)] bg-[var(--gray-50)]/50">
                        <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontSize: '13px', letterSpacing: '0.05em' }}>
                            <MessageSquare size={16} className="text-[var(--primary-600)]" />
                            INTERNAL NOTES
                            {comments.length > 0 && (
                                <span className="ml-auto bg-[var(--primary-100)] text-[var(--primary-700)] px-2 py-0.5 rounded-full text-[10px]">
                                    {comments.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {/* Comments Display - Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white custom-scrollbar">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="group relative pl-3 border-l-2 border-[var(--gray-100)] hover:border-[var(--primary-200)] transition-colors py-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                            {new Date(comment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at {new Date(comment.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] leading-snug whitespace-pre-wrap break-words">
                                        {comment.comment}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-xs text-[var(--text-muted)] italic">No notes added yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Streamlined Input Area */}
                    <div className="p-4 border-t border-[var(--border-light)] bg-white">
                        <div className="relative flex items-end gap-2">
                            <textarea
                                value={newComment}
                                onChange={(e) => {
                                    setNewComment(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                                placeholder="Add a note..."
                                rows={1}
                                className="flex-1 min-h-[44px] max-h-[120px] py-3 px-4 text-sm border border-[var(--border-default)] focus:border-[var(--primary-300)] focus:ring-1 focus:ring-[var(--primary-100)] bg-[var(--gray-50)]/50 focus:bg-white transition-all rounded-xl placeholder:text-[var(--text-muted)] focus:outline-none resize-none"
                            />
                            <button
                                onClick={handlePostComment}
                                disabled={!newComment.trim() || isPostingComment}
                                className={`flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-xl transition-all shadow-sm ${newComment.trim()
                                    ? 'bg-[var(--primary-600)] text-white hover:bg-[var(--primary-700)] active:scale-95'
                                    : 'bg-[var(--gray-200)] text-[var(--text-muted)] cursor-not-allowed opacity-70'
                                    }`}
                            >
                                {isPostingComment ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} className={newComment.trim() ? "ml-0.5" : ""} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Service Instructions — multi-diagnostic version */}
                {isMultiDiagnostic && activeDiagnostics.some((d: any) => d.service_type?.kit || d.service_type?.requirements || d.service_type?.protocol) && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Service Instructions</h2>
                        <div className="space-y-5">
                            {activeDiagnostics.map((diag: any) => {
                                const st = diag.service_type
                                if (!st || (!st.kit && !st.requirements && !st.protocol)) return null
                                return (
                                    <div key={diag.id} className="border-b border-[var(--border-light)] pb-4 last:border-0 last:pb-0">
                                        <p className="text-sm font-bold text-[var(--primary-600)] mb-3">{st.name}</p>
                                        {st.kit && (
                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Package size={14} className="text-[var(--primary-600)]" />
                                                    <p className="text-xs font-bold text-[var(--text-primary)]">Kit to Carry</p>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{st.kit}</p>
                                            </div>
                                        )}
                                        {st.requirements && (
                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-[var(--primary-600)]" />
                                                    <p className="text-xs font-bold text-[var(--text-primary)]">Requirements</p>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{st.requirements}</p>
                                            </div>
                                        )}
                                        {st.protocol && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-[var(--primary-600)]" />
                                                    <p className="text-xs font-bold text-[var(--text-primary)]">Protocol</p>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{st.protocol}</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Service Instructions — legacy single-diagnostic */}
                {!isMultiDiagnostic && ticket.service_type && (ticket.service_type.kit || ticket.service_type.requirements || ticket.service_type.protocol) && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Service Instructions</h2>
                        <div className="space-y-4">
                            {ticket.service_type.kit && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package size={16} className="text-[var(--primary-600)]" />
                                        <p className="text-sm font-bold text-[var(--text-primary)]">Kit to Carry</p>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{ticket.service_type.kit}</p>
                                </div>
                            )}
                            {ticket.service_type.requirements && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={16} className="text-[var(--primary-600)]" />
                                        <p className="text-sm font-bold text-[var(--text-primary)]">Requirements</p>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{ticket.service_type.requirements}</p>
                                </div>
                            )}
                            {ticket.service_type.protocol && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={16} className="text-[var(--primary-600)]" />
                                        <p className="text-sm font-bold text-[var(--text-primary)]">Protocol</p>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{ticket.service_type.protocol}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress Tracking */}
                {!isSampleCollected && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Upload Progress</h2>
                        <div className="flex flex-wrap gap-3">
                            {progress.map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${p.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {p.completed ? <CheckCircle2 size={14} /> : <span className="font-bold" style={{ fontSize: '9px' }}>{i + 1}</span>}
                                    </div>
                                    <span className={`text-[10px] font-bold ${p.completed ? 'text-green-600' : 'text-gray-400'}`}>{p.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                <div className="space-y-4">
                    {/* 1. TRF Upload (Multipager) — Only for diagnostics */}
                    {!isTherapeutics && (
                        <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-[var(--text-primary)]" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>1. TRF Form Images (Multipager)</h2>
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Mandatory</span>
                            </div>

                            {/* Download TRF Button */}
                            {!isSampleCollected && (
                                <div className="mb-4">
                                    <button
                                        onClick={handleDownloadTRF}
                                        disabled={downloading}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-[var(--primary-600)] text-[var(--primary-600)] font-bold flex items-center justify-center gap-2 hover:bg-[var(--primary-50)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {downloading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <FileDown size={18} />
                                                Download TRF Form (PDF)
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
                                        Download the form to print, fill manually, and then upload the filled images
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {trfImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-light)] bg-[var(--gray-50)] group">
                                        <img src={img} className="w-full h-full object-cover" alt={`TRF ${idx + 1}`} />
                                        {!isSampleCollected && (
                                            <button
                                                onClick={() => removeTrfImage(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {!isSampleCollected && (
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] active:bg-[var(--gray-50)] cursor-pointer">
                                        {uploading === 'trf' ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                        <span className="text-[10px] font-medium">Add Page</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'trf')} disabled={!!uploading} />
                                    </label>
                                )}
                            </div>
                            {trfImages.length > 0 && currentUser && (
                                <p className="text-xs text-[var(--text-muted)]">
                                    <ReplaceDocumentButton
                                        ticketId={id}
                                        documentType="trf"
                                        currentUserRole={currentUser.role}
                                        onReplaced={() => refetchTicket()}
                                        onError={setError}
                                        label="Replace first page"
                                        className="text-[var(--primary-600)] hover:underline"
                                    />
                                </p>
                            )}
                        </div>
                    )}

                    {/* Per-Diagnostic Upload Cards (multi-diagnostic) */}
                    {isMultiDiagnostic && activeDiagnostics.map((diag: any, diagIndex: number) => {
                        const imgs = diagnosticImages[diag.id] || { sample: null, courier: null }
                        const diagName = diag.service_type?.name || `Test ${diagIndex + 1}`

                        return (
                            <div key={diag.id} className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-[var(--text-primary)]" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
                                        {isTherapeutics ? (diagIndex + 1) : (diagIndex + 2)}. {diagName}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {imgs.sample && (isTherapeutics || imgs.courier) && (
                                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase">Done</span>
                                        )}
                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Mandatory</span>
                                    </div>
                                </div>

                                {/* Sample Image */}
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">Sample Image</p>
                                    {imgs.sample ? (
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                            <img src={imgs.sample} className="w-full h-full object-cover" alt={`${diagName} Sample`} />
                                            {!isSampleCollected && (
                                                <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer">
                                                    <ImageIcon size={14} /> Upload
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'sample', diag.id)} disabled={!!uploading} />
                                                </label>
                                            )}
                                            {currentUser && (
                                                <span className="absolute bottom-2 left-2">
                                                    <ReplaceDocumentButton
                                                        ticketId={id}
                                                        documentType="sample_image"
                                                        diagnosticId={diag.id}
                                                        currentUserRole={currentUser.role}
                                                        onReplaced={() => refetchTicket()}
                                                        onError={setError}
                                                        label="Replace"
                                                        className="px-2 py-1 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg hover:underline"
                                                    />
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        !isSampleCollected && (
                                            <label className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-6 active:bg-[var(--gray-50)] cursor-pointer">
                                                {uploading === `sample-${diag.id}` ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={28} />}
                                                <span className="text-xs font-medium">Upload Sample Image</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'sample', diag.id)} disabled={!!uploading} />
                                            </label>
                                        )
                                    )}
                                </div>

                                {/* Courier Image - Only for diagnostics */}
                                {!isTherapeutics && (
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">Courier Details</p>
                                        {imgs.courier ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                                <img src={imgs.courier} className="w-full h-full object-cover" alt={`${diagName} Courier`} />
                                                {!isSampleCollected && (
                                                    <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer">
                                                        <ImageIcon size={14} /> Upload
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'courier', diag.id)} disabled={!!uploading} />
                                                    </label>
                                                )}
                                                {currentUser && (
                                                    <span className="absolute bottom-2 left-2">
                                                        <ReplaceDocumentButton
                                                            ticketId={id}
                                                            documentType="courier_image"
                                                            diagnosticId={diag.id}
                                                            currentUserRole={currentUser.role}
                                                            onReplaced={() => refetchTicket()}
                                                            onError={setError}
                                                            label="Replace"
                                                            className="px-2 py-1 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg hover:underline"
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            !isSampleCollected && (
                                                <label className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-6 active:bg-[var(--gray-50)] cursor-pointer">
                                                    {uploading === `courier-${diag.id}` ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={28} />}
                                                    <span className="text-xs font-medium">Upload Courier Receipt</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'courier', diag.id)} disabled={!!uploading} />
                                                </label>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Legacy Single-Diagnostic Upload Sections */}
                    {!isMultiDiagnostic && (
                        <>
                            {/* 2. Sample Image */}
                            <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>{isTherapeutics ? '1' : '2'}. Sample Image</h2>
                                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Mandatory</span>
                                </div>

                                {sampleImage ? (
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                        <img src={sampleImage} className="w-full h-full object-cover" alt="Sample" />
                                        {!isSampleCollected && (
                                            <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer">
                                                <ImageIcon size={14} /> Upload
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'sample')} disabled={!!uploading} />
                                            </label>
                                        )}
                                        {currentUser && (
                                            <span className="absolute bottom-2 left-2">
                                                <ReplaceDocumentButton
                                                    ticketId={id}
                                                    documentType="sample_image"
                                                    currentUserRole={currentUser.role}
                                                    onReplaced={() => refetchTicket()}
                                                    onError={setError}
                                                    label="Replace"
                                                    className="px-2 py-1 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg hover:underline"
                                                />
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <label className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-8 active:bg-[var(--gray-50)] cursor-pointer">
                                        {uploading === 'sample' ? <Loader2 size={32} className="animate-spin" /> : <ImageIcon size={32} />}
                                        <span className="text-sm font-medium">Upload Sample Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'sample')} disabled={!!uploading} />
                                    </label>
                                )}
                            </div>

                            {/* 3. Courier Details - Only for diagnostics */}
                            {!isTherapeutics && (
                                <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-bold text-[var(--text-primary)]" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>3. Courier Details Image</h2>
                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Mandatory</span>
                                    </div>

                                    {courierImage ? (
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                            <img src={courierImage} className="w-full h-full object-cover" alt="Courier" />
                                            {!isSampleCollected && (
                                                <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer">
                                                    <ImageIcon size={14} /> Upload
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'courier')} disabled={!!uploading} />
                                                </label>
                                            )}
                                            {currentUser && (
                                                <span className="absolute bottom-2 left-2">
                                                    <ReplaceDocumentButton
                                                        ticketId={id}
                                                        documentType="courier_image"
                                                        currentUserRole={currentUser.role}
                                                        onReplaced={() => refetchTicket()}
                                                        onError={setError}
                                                        label="Replace"
                                                        className="px-2 py-1 bg-white/90 text-[var(--primary-600)] rounded-lg text-xs font-bold shadow-lg hover:underline"
                                                    />
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-8 active:bg-[var(--gray-50)] cursor-pointer">
                                            {uploading === 'courier' ? <Loader2 size={32} className="animate-spin" /> : <ImageIcon size={32} />}
                                            <span className="text-sm font-medium">Upload Courier Receipt/Details</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'courier')} disabled={!!uploading} />
                                        </label>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Final Action Button */}
                {!isSampleCollected && (
                    <div className="pt-4 pb-8">
                        <button
                            onClick={handleStatusUpdate}
                            disabled={!allUploadsComplete() || isUpdatingStatus}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${allUploadsComplete()
                                ? 'bg-[var(--primary-600)] text-white active:scale-95'
                                : 'bg-[var(--gray-200)] text-[var(--text-muted)] cursor-not-allowed'
                                }`}
                        >
                            {isUpdatingStatus ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Package size={20} />
                                    {isTherapeutics ? 'Mark as Completed' : 'Mark as Sample Collected'}
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-[var(--text-muted)] text-center mt-3 px-4">
                            {isTherapeutics
                                ? 'By clicking this button, you confirm that all required documents have been collected successfully.'
                                : 'By clicking this button, you confirm that all samples and documents have been collected successfully.'
                            }
                        </p>
                    </div>
                )}

                {isSampleCollected && (
                    <div className="bg-green-100 text-green-700 p-5 rounded-2xl border border-green-200 text-center space-y-2">
                        <CheckCircle2 size={32} className="mx-auto mb-2" />
                        <h3 className="font-bold text-lg">{isTherapeutics ? 'Task Completed' : 'Sample Collected'}</h3>
                        <p className="text-sm">
                            {isTherapeutics
                                ? 'This ticket has been successfully processed and all required documents have been collected.'
                                : 'This ticket has been successfully processed and the sample has been collected.'
                            }
                        </p>
                        <Link href="/field-executive" className="inline-block px-6 py-2 bg-green-600 text-white rounded-xl font-bold mt-2">
                            Back to Tasks
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
