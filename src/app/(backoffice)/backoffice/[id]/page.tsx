'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    User,
    Stethoscope,
    AlertCircle,
    FlaskConical,
    CheckCircle2,
    ChevronRight,
    Download,
    FileText,
    Activity,
    MapPin,
    X,
    Loader2,
    Package,
} from 'lucide-react'
import { StatusChangeModal, type StatusChangeData, type DownloadPdfData } from '@/components/StatusChangeModal'
import { DiagnosticActionModal, type DiagnosticAction } from '@/components/DiagnosticActionModal'
import { DownloadRequiredModal } from '@/components/DownloadRequiredModal'
import { ReplaceDocumentButton } from '@/components/ReplaceDocumentButton'
import type { AssignmentPDFData } from '@/lib/pdf-utils'
import type { Ticket, WorkflowStage, SessionUser, TicketDiagnostic } from '@/lib/types'
import { diagnosticStatusLabel, diagnosticStatusColor } from '@/lib/diagnostic-helpers'

// Stages that backoffice can transition TO
const BACKOFFICE_TARGET_STAGES = ['sample received', 'sample sent to', 'report received']

// Map current stage to next allowed action for backoffice
const getNextBackofficeAction = (stageName: string, stages: WorkflowStage[]): WorkflowStage | null => {
    const stage = stageName.toLowerCase()
    let targetStageName = ''

    if (stage === 'sample collected') {
        targetStageName = 'sample received'
    } else if (stage === 'sample received') {
        targetStageName = 'sample sent to'
    } else if (stage === 'sample sent to') {
        targetStageName = 'report received'
    }

    if (targetStageName) {
        return stages.find(s => s.name.toLowerCase() === targetStageName) || null
    }
    return null
}

const getActionLabel = (stageName: string): string => {
    const stage = stageName.toLowerCase()
    if (stage === 'sample received') return 'Mark Sample Received'
    if (stage === 'sample sent to') return 'Send to Lab'
    if (stage === 'report received') return 'Mark Report Received'
    return `Move to ${stageName}`
}

// Map diagnostic status to the next backoffice action
const getDiagnosticNextAction = (status: string): DiagnosticAction | null => {
    if (status === 'sample_collected') return 'sample_received'
    if (status === 'sample_received') return 'send_to_lab'
    if (status === 'sent_to_lab') return 'upload_raw_report'
    return null
}

const getDiagnosticActionLabel = (action: DiagnosticAction): string => {
    if (action === 'sample_received') return 'Mark Sample Received'
    if (action === 'send_to_lab') return 'Send to Lab'
    if (action === 'upload_raw_report') return 'Upload Raw Report'
    return ''
}

export default function BackofficeTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
    const [ticket, setTicket] = useState<Ticket | null>(null)
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Status Change Modal State (legacy single-diagnostic)
    const [statusModalOpen, setStatusModalOpen] = useState(false)
    const [targetStage, setTargetStage] = useState<WorkflowStage | null>(null)

    // Diagnostic Action Modal State (multi-diagnostic)
    const [diagModalOpen, setDiagModalOpen] = useState(false)
    const [diagModalDiag, setDiagModalDiag] = useState<TicketDiagnostic | null>(null)
    const [diagModalAction, setDiagModalAction] = useState<DiagnosticAction | null>(null)

    // Download Required Modal State
    const [downloadModalOpen, setDownloadModalOpen] = useState(false)
    const [downloadPdfData, setDownloadPdfData] = useState<AssignmentPDFData | null>(null)

    const isMultiDiagnostic = ticket?.diagnostics && ticket.diagnostics.length > 0
    const activeDiagnostics = isMultiDiagnostic
        ? ticket!.diagnostics!.filter(d => !d.is_cancelled)
        : []

    const fetchData = async () => {
        try {
            const [meRes, ticketRes, stagesRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch(`/api/tickets/${id}`),
                fetch('/api/workflow-stages'),
            ])

            const meData = await meRes.json()
            const ticketData = await ticketRes.json()
            const stagesData = await stagesRes.json()

            if (meData.success) setCurrentUser(meData.data)

            if (ticketData.success) {
                setTicket(ticketData.data)
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

        } catch (err) {
            setError('Failed to load ticket data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [id])

    const openStatusModal = (stage: WorkflowStage) => {
        setTargetStage(stage)
        setStatusModalOpen(true)
    }

    const openDiagnosticModal = (diag: TicketDiagnostic, action: DiagnosticAction) => {
        setDiagModalDiag(diag)
        setDiagModalAction(action)
        setDiagModalOpen(true)
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
                await fetchData()
                router.refresh()
            } else {
                setError(result.error || 'Failed to update status')
                throw new Error(result.error)
            }
        } catch (err: any) {
            console.error(err)
            throw err
        }
    }

    const handleDiagnosticActionSuccess = () => {
        // Refresh to pick up new diagnostic statuses + potentially advanced ticket status
        fetchData()
    }

    // Handler for when download is required (triggered by StatusChangeModal)
    const handleDownloadRequired = (pdfData: DownloadPdfData) => {
        setStatusModalOpen(false)
        setTargetStage(null)
        setDownloadPdfData(pdfData)
        setDownloadModalOpen(true)
    }

    // Handler for when download is complete
    const handleDownloadComplete = () => {
        setDownloadModalOpen(false)
        setDownloadPdfData(null)
        fetchData()

        const nextStageName = targetStage?.name.toLowerCase() || ''
        if (!BACKOFFICE_TARGET_STAGES.includes(nextStageName)) {
            setTimeout(() => {
                router.push('/backoffice')
            }, 500)
        }
    }

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getSystemStatusTime = (stageId: string, stageName: string, t: Ticket) => {
        const transition = t.status_transitions?.find(st => st.to_stage_id === stageId)
        if (transition) return transition.created_at

        const name = stageName.toLowerCase()
        if (name === 'new') return t.status_new_at
        if (name === 'sample collected') return t.status_sample_collected_at
        if (name === 'sample received') return t.status_sample_received_at
        if (name === 'sample sent to') return t.status_sample_sent_at
        if (name === 'analyzed') return t.status_analyzed_at
        if (name === 'report received') return t.status_report_received_at
        if (name === 'report submission') return t.status_report_submitted_at
        return null
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-[var(--primary-600)] animate-spin" />
                <p className="text-[var(--text-muted)] mt-4">Loading ticket details...</p>
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold">Ticket not found</h1>
                <Link href="/backoffice" className="text-[var(--primary-600)] mt-4 block">Back to My Tasks</Link>
            </div>
        )
    }

    const nextAction = getNextBackofficeAction(ticket.current_stage?.name || '', stages)

    return (
        <div className="animate-fade-in bg-[var(--gray-50)] min-h-full">
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

            <DiagnosticActionModal
                isOpen={diagModalOpen}
                onClose={() => setDiagModalOpen(false)}
                onSuccess={handleDiagnosticActionSuccess}
                diagnostic={diagModalDiag}
                action={diagModalAction}
                ticketId={ticket.id}
            />

            <DownloadRequiredModal
                isOpen={downloadModalOpen}
                onComplete={handleDownloadComplete}
                onConfirmTransition={handleConfirmStatusChange}
                pdfData={downloadPdfData}
            />

            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-[var(--border-light)] sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-[var(--gray-50)]">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-[var(--text-primary)]" style={{ fontSize: '16px' }}>{ticket.uid}</h1>
                            {ticket.label_code && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight">
                                    Label Code: {ticket.label_code}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-medium">{ticket.current_stage?.name}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
                {/* Error Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                    </div>
                )}

                {/* Action Button - For legacy single-diagnostic tickets only */}
                {!isMultiDiagnostic && nextAction && (
                    <div className="bg-gradient-to-r from-[var(--primary-50)] to-white border-2 border-[var(--primary-200)] p-5 rounded-2xl shadow-sm">
                        <div className="mb-4">
                            <p className="text-xs text-[var(--text-muted)] mb-1" style={{ fontSize: '11px' }}>Your Next Action</p>
                            <p className="text-base font-bold text-[var(--primary-800)]">
                                {getActionLabel(nextAction.name)}
                            </p>
                        </div>
                        <button
                            onClick={() => openStatusModal(nextAction)}
                            className="w-full py-3 px-4 bg-[var(--primary-600)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--primary-700)] active:scale-95 transition-all shadow-md"
                        >
                            <Activity size={18} />
                            {getActionLabel(nextAction.name)}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* Multi-Diagnostic Cards */}
                {isMultiDiagnostic && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>DIAGNOSTICS ({activeDiagnostics.length})</h2>
                        <div className="space-y-3">
                            {activeDiagnostics.map((diag: TicketDiagnostic, idx: number) => {
                                const diagAction = getDiagnosticNextAction(diag.status)
                                const statusColor = diagnosticStatusColor(diag.status)
                                return (
                                    <div key={diag.id} className="border border-[var(--border-light)] rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <FlaskConical size={16} className="text-[var(--primary-600)]" />
                                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                                    {diag.service_type?.name || `Test ${idx + 1}`}
                                                </p>
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                                            >
                                                {diagnosticStatusLabel(diag.status)}
                                            </span>
                                        </div>

                                        {/* Show existing info */}
                                        <div className="space-y-1 mb-3">
                                            {diag.label_code && (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Label: <span className="font-bold text-blue-600">{diag.label_code}</span>
                                                </p>
                                            )}
                                            {diag.lab?.name && (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Lab: <span className="font-semibold text-[var(--text-primary)]">{diag.lab.name}</span>
                                                </p>
                                            )}
                                            {diag.sample_received_at && (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Received: {formatDateTime(diag.sample_received_at)}
                                                </p>
                                            )}
                                            {diag.raw_report_url && (
                                                <span className="inline-flex items-center gap-2">
                                                    <a
                                                        href={diag.raw_report_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                                                    >
                                                        <Download size={12} /> Raw Report
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
                                                            className="text-xs text-[var(--primary-600)] hover:underline"
                                                        />
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action button for this diagnostic */}
                                        {diagAction && (
                                            <button
                                                onClick={() => openDiagnosticModal(diag, diagAction)}
                                                className="w-full py-2 px-3 bg-[var(--primary-600)] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[var(--primary-700)] active:scale-95 transition-all"
                                            >
                                                <Activity size={14} />
                                                {getDiagnosticActionLabel(diagAction)}
                                            </button>
                                        )}

                                        {/* Completed state */}
                                        {diag.status === 'raw_report_received' && (
                                            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                                                <CheckCircle2 size={14} />
                                                Raw report uploaded — awaiting scientist review
                                            </div>
                                        )}
                                        {diag.status === 'final_report_generated' && (
                                            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                                                <CheckCircle2 size={14} />
                                                Final report generated
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Patient Info Card */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                    <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>PATIENT DETAILS</h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                <User size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="mb-0.5">
                                    {ticket.patient_name && (
                                        <p className="text-base font-bold text-[var(--text-primary)]">{ticket.patient_name}</p>
                                    )}
                                    {ticket.patient_name_2 && (
                                        <p className="text-base font-bold text-[var(--text-primary)]">{ticket.patient_name_2}</p>
                                    )}
                                    {!ticket.patient_name && !ticket.patient_name_2 && (
                                        <p className="text-base font-bold text-[var(--text-primary)]">Anonymous</p>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>
                                    {ticket.patient_name_2 ? 'Patient Names' : 'Patient Name'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                <MapPin size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">
                                    {ticket.hospital?.name || ticket.collection_address || 'N/A'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>
                                    {ticket.hospital?.address ? `${ticket.hospital.address}, ${ticket.hospital.city || ''}`.trim() : 'Location'}
                                </p>
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
                        {/* Show service type for legacy single-diagnostic */}
                        {!isMultiDiagnostic && ticket.service_type && (
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] flex-shrink-0">
                                    <FlaskConical size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">{ticket.service_type.name}</p>
                                    {ticket.service_type.kit && (
                                        <p className="text-xs text-[var(--text-muted)]" style={{ fontSize: '11px' }}>Kit: {ticket.service_type.kit}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* TRF Document */}
                {(ticket.trf_image_url || (ticket.trf_image_urls && ticket.trf_image_urls.length > 0)) && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>TRF DOCUMENT</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {ticket.trf_image_urls && ticket.trf_image_urls.length > 0 ? (
                                ticket.trf_image_urls.map((url, index) => (
                                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-[var(--border-light)] bg-[var(--gray-50)]">
                                        {url.toLowerCase().endsWith('.pdf') ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--error-50)] text-[var(--error-600)]">
                                                <FileText size={20} />
                                                <span className="text-[10px] font-bold mt-1 uppercase">PDF</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={url}
                                                alt={`TRF Page ${index + 1}`}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => window.open(url, '_blank')}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a
                                                href={url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 bg-white text-[var(--primary-600)] rounded-full hover:bg-[var(--primary-50)] shadow-lg"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 py-0.5 px-2 bg-black/60 text-white text-[9px] font-medium">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex items-center gap-3">
                                    {ticket.trf_image_url!.toLowerCase().endsWith('.pdf') ? (
                                        <div className="w-16 h-16 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                            <FileText size={24} className="text-[var(--error-600)]" />
                                        </div>
                                    ) : (
                                        <img
                                            src={ticket.trf_image_url}
                                            alt="TRF Document"
                                            className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                            onClick={() => window.open(ticket.trf_image_url!, '_blank')}
                                        />
                                    )}
                                    <a
                                        href={ticket.trf_image_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--primary-600)] bg-[var(--primary-50)] rounded-lg hover:bg-[var(--primary-100)] transition-colors"
                                    >
                                        <Download size={16} />
                                        Download TRF
                                    </a>
                                    {currentUser && (
                                        <ReplaceDocumentButton
                                            ticketId={id}
                                            documentType="trf"
                                            currentUserRole={currentUser.role}
                                            onReplaced={() => fetchData()}
                                            onError={setError}
                                            label="Replace"
                                            className="px-3 py-2 text-sm font-medium text-[var(--primary-600)] hover:underline"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Backoffice Images - Sample After Tagging & Courier Details (legacy single-diagnostic) */}
                {!isMultiDiagnostic && (ticket.tagged_sample_image_url || ticket.backoffice_courier_image_url || ticket.label_code) && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>LAB DISPATCH DOCUMENTS</h2>
                        <div className="space-y-4">
                            {ticket.label_code && (
                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Secret Label Code</p>
                                        <p className="text-lg font-bold text-blue-900">{ticket.label_code}</p>
                                    </div>
                                </div>
                            )}
                            {ticket.tagged_sample_image_url && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2" style={{ fontSize: '11px' }}>Sample After Tagging</p>
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                        <img
                                            src={ticket.tagged_sample_image_url}
                                            alt="Sample After Tagging"
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => window.open(ticket.tagged_sample_image_url!, '_blank')}
                                        />
                                        <a
                                            href={ticket.tagged_sample_image_url}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 p-2 bg-white/90 text-[var(--primary-600)] rounded-lg hover:bg-white shadow-lg"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Download size={16} />
                                        </a>
                                        {currentUser && (
                                            <span className="absolute top-2 left-2">
                                                <ReplaceDocumentButton
                                                    ticketId={id}
                                                    documentType="tagged_sample"
                                                    currentUserRole={currentUser.role}
                                                    onReplaced={() => fetchData()}
                                                    onError={setError}
                                                    label="Replace"
                                                    className="p-2 bg-white/90 text-[var(--primary-600)] rounded-lg hover:bg-white shadow-lg text-xs"
                                                />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {ticket.backoffice_courier_image_url && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2" style={{ fontSize: '11px' }}>Courier Details</p>
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-light)]">
                                        <img
                                            src={ticket.backoffice_courier_image_url}
                                            alt="Courier Details"
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => window.open(ticket.backoffice_courier_image_url!, '_blank')}
                                        />
                                        <a
                                            href={ticket.backoffice_courier_image_url}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 p-2 bg-white/90 text-[var(--primary-600)] rounded-lg hover:bg-white shadow-lg"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Download size={16} />
                                        </a>
                                        {currentUser && (
                                            <span className="absolute top-2 left-2">
                                                <ReplaceDocumentButton
                                                    ticketId={id}
                                                    documentType="backoffice_courier"
                                                    currentUserRole={currentUser.role}
                                                    onReplaced={() => fetchData()}
                                                    onError={setError}
                                                    label="Replace"
                                                    className="p-2 bg-white/90 text-[var(--primary-600)] rounded-lg hover:bg-white shadow-lg text-xs"
                                                />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Raw Report Document (legacy single-diagnostic) */}
                {!isMultiDiagnostic && ticket.raw_report_url && (
                    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                        <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>RAW LAB REPORT</h2>
                        <div className="flex items-center gap-3">
                            {ticket.raw_report_url.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-16 h-16 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                    <FileText size={24} className="text-[var(--error-600)]" />
                                </div>
                            ) : (
                                <img
                                    src={ticket.raw_report_url}
                                    alt="Raw Report"
                                    className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                    onClick={() => window.open(ticket.raw_report_url, '_blank')}
                                />
                            )}
                            <a
                                href={ticket.raw_report_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--success-600)] bg-[var(--success-50)] rounded-lg hover:bg-[var(--success-100)] transition-colors"
                            >
                                <Download size={16} />
                                Download Report
                            </a>
                            {currentUser && (
                                <ReplaceDocumentButton
                                    ticketId={id}
                                    documentType="raw_report"
                                    currentUserRole={currentUser.role}
                                    onReplaced={() => fetchData()}
                                    onError={setError}
                                    label="Replace"
                                    className="px-3 py-2 text-sm font-medium text-[var(--primary-600)] hover:underline"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Process Timeline */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] shadow-sm">
                    <h2 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>PROCESS TIMELINE</h2>
                    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--primary-200)] before:via-[var(--gray-100)] before:to-transparent">
                        {stages.map((stage) => {
                            const time = getSystemStatusTime(stage.id, stage.name, ticket)
                            const transition = ticket.status_transitions?.find(st => st.to_stage_id === stage.id)
                            const isSampleSent = stage.name.toLowerCase() === 'sample sent to'
                            const isCurrentStage = stage.id === ticket.current_stage_id

                            return (
                                <div key={stage.id} className={`relative flex items-start gap-4 ${isCurrentStage ? 'bg-[var(--primary-50)]/50 -mx-4 px-12 py-2 rounded-lg' : 'pl-8'}`}>
                                    <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${time ? 'bg-[var(--primary-500)]' : 'bg-[var(--gray-200)]'} ${isCurrentStage ? 'ml-4' : ''}`}>
                                        {time && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${time ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                            {stage.name}
                                            {isCurrentStage && <span className="ml-2 text-xs font-normal text-[var(--primary-600)]">(Current)</span>}
                                        </p>
                                        {time ? (
                                            <div className="flex flex-col mt-1">
                                                <span className="text-[var(--primary-600)] font-mono text-xs">{formatDateTime(time)}</span>
                                                {transition?.changer && (
                                                    <span className="text-[10px] text-[var(--text-muted)]">by {transition.changer.full_name}</span>
                                                )}
                                                {isSampleSent && ticket.lab?.name && (
                                                    <span className="text-xs font-semibold text-[var(--success-700)] bg-[var(--success-50)] px-2 py-0.5 rounded mt-1 w-fit">
                                                        {ticket.lab.name}
                                                    </span>
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
                </div>
            </div>
        </div>
    )
}
