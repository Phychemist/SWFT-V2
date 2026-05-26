'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileText,
    FlaskConical,
    MessageSquare,
    Send,
    Stethoscope,
    Upload,
    User,
} from 'lucide-react'
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Textarea,
} from '@/components/ui'
import { StatusChangeModal, type StatusChangeData } from '@/components/StatusChangeModal'
import { DiagnosticActionModal, type DiagnosticAction } from '@/components/DiagnosticActionModal'
import type { Ticket, WorkflowStage, TicketDiagnostic, SessionUser, TicketComment } from '@/lib/types'
import { diagnosticStatusLabel, diagnosticStatusColor } from '@/lib/diagnostic-helpers'
import { ReplaceDocumentButton } from '@/components/ReplaceDocumentButton'

export default function ScientistTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Comments state
    const [comments, setComments] = useState<TicketComment[]>([])
    const [newComment, setNewComment] = useState('')
    const [isPostingComment, setIsPostingComment] = useState(false)
    const [showAllComments, setShowAllComments] = useState(false)

    const isMultiDiagnostic = ticket?.diagnostics && ticket.diagnostics.length > 0
    const activeDiagnostics = isMultiDiagnostic
        ? ticket!.diagnostics!.filter(d => !d.is_cancelled)
        : []

    const fetchData = async () => {
        try {
            const [meRes, ticketRes, stagesRes, commentsRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch(`/api/tickets/${id}`),
                fetch('/api/workflow-stages'),
                fetch(`/api/tickets/${id}/comments`),
            ])

            const meData = await meRes.json()
            const ticketData = await ticketRes.json()
            const stagesData = await stagesRes.json()
            const commentsData = await commentsRes.json()

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

            if (commentsData.success) setComments(commentsData.data)

        } catch (err) {
            setError('Failed to load ticket data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [id])

    // Get the "Final Report Generated" stage
    const getFinalReportStage = (): WorkflowStage | null => {
        return stages.find(s => s.name.toLowerCase() === 'final report generated') || null
    }

    const openStatusModal = () => {
        const stage = getFinalReportStage()
        if (stage) {
            setTargetStage(stage)
            setStatusModalOpen(true)
        } else {
            setError('Final Report Generated stage not found. Please contact admin to set up this workflow stage.')
        }
    }

    const openDiagnosticModal = (diag: TicketDiagnostic) => {
        setDiagModalDiag(diag)
        setDiagModalAction('upload_final_report')
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
                fetchData()
                setStatusModalOpen(false)
                setTimeout(() => {
                    router.push('/scientist')
                }, 500)
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
        fetchData()
    }

    const handlePostComment = async () => {
        if (!newComment.trim()) return
        setIsPostingComment(true)
        try {
            const res = await fetch(`/api/tickets/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment.trim() }),
            })
            const data = await res.json()
            if (data.success) {
                setComments([data.data, ...comments])
                setNewComment('')
            } else {
                setError(data.error || 'Failed to post comment')
            }
        } catch {
            setError('Failed to post comment')
        } finally {
            setIsPostingComment(false)
        }
    }

    const formatDate = (dateStr: string) => {
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
        if (name === 'final report generated') return t.status_final_report_generated_at
        if (name === 'report submission') return t.status_report_submitted_at
        return null
    }

    // Check if scientist can take action (ticket is at "Report Received" stage)
    const canTakeAction = !isMultiDiagnostic && ticket?.current_stage?.name?.toLowerCase() === 'report received'

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
                <Link href="/scientist" className="text-[var(--primary-600)] hover:underline mt-2 inline-block">
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto pb-10">
            {/* Status Change Modal (legacy single-diagnostic) */}
            <StatusChangeModal
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                onConfirm={handleConfirmStatusChange}
                onDownloadRequired={() => { }}
                targetStage={targetStage}
                currentStageId={ticket.current_stage_id}
                ticketId={ticket.id}
                ticketData={ticket}
            />

            {/* Diagnostic Action Modal (multi-diagnostic) */}
            <DiagnosticActionModal
                isOpen={diagModalOpen}
                onClose={() => setDiagModalOpen(false)}
                onSuccess={handleDiagnosticActionSuccess}
                diagnostic={diagModalDiag}
                action={diagModalAction}
                ticketId={ticket.id}
            />

            {/* Back Link */}
            <Link href="/scientist" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
                <ArrowLeft size={18} />
                <span>Back to Dashboard</span>
            </Link>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{ticket.uid}</h1>
                    {ticket.current_stage && (
                        <Badge color={ticket.current_stage.color} className="text-sm px-3 py-1">{ticket.current_stage.name}</Badge>
                    )}
                </div>
                <p className="text-[var(--text-secondary)] flex items-center gap-2">
                    <Clock size={14} /> Created {formatDate(ticket.created_at)}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20">
                    <AlertCircle className="w-5 h-5 text-[var(--error-600)] flex-shrink-0" />
                    <p className="text-sm text-[var(--error-600)]">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-[var(--error-600)] hover:underline text-sm">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Multi-Diagnostic Reports Section */}
            {isMultiDiagnostic && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card className="border-[var(--primary-200)]">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FlaskConical size={20} className="text-[var(--primary-600)]" />
                                Diagnostics ({activeDiagnostics.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeDiagnostics.map((diag: TicketDiagnostic, idx: number) => {
                                const statusColor = diagnosticStatusColor(diag.status)
                                const hasRawReport = !!diag.raw_report_url
                                const hasFinalReport = !!diag.final_report_url
                                const canUploadFinal = hasRawReport && !hasFinalReport

                                return (
                                    <div key={diag.id} className="border border-[var(--border-light)] rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                                    {diag.service_type?.name || `Test ${idx + 1}`}
                                                </p>
                                                {diag.label_code && (
                                                    <p className="text-xs text-[var(--text-muted)]">Label: <span className="font-bold text-blue-600">{diag.label_code}</span></p>
                                                )}
                                                {diag.lab?.name && (
                                                    <p className="text-xs text-[var(--text-muted)]">Lab: {diag.lab.name}</p>
                                                )}
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                                            >
                                                {diagnosticStatusLabel(diag.status)}
                                            </span>
                                        </div>

                                        {/* Raw Report */}
                                        {hasRawReport && (
                                            <div className="flex items-center gap-3 mb-3 p-3 bg-[var(--gray-50)] rounded-lg">
                                                <div className="shrink-0">
                                                    {diag.raw_report_url!.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="w-12 h-12 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                                            <FileText size={20} className="text-[var(--error-600)]" />
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={diag.raw_report_url!}
                                                            alt="Raw Report"
                                                            className="w-12 h-12 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                                            onClick={() => window.open(diag.raw_report_url!, '_blank')}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-[var(--text-secondary)]">Raw Report</p>
                                                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                                                        <button
                                                            onClick={() => window.open(diag.raw_report_url!, '_blank')}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                                                        >
                                                            <Eye size={12} /> View
                                                        </button>
                                                        <a
                                                            href={diag.raw_report_url!}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success-600)] hover:text-[var(--success-700)]"
                                                        >
                                                            <Download size={12} /> Download
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
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Final Report */}
                                        {hasFinalReport && (
                                            <div className="flex items-center gap-3 mb-3 p-3 bg-[var(--success-50)] rounded-lg border border-[var(--success-200)]">
                                                <div className="shrink-0">
                                                    {diag.final_report_url!.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="w-12 h-12 flex items-center justify-center bg-[var(--success-100)] rounded-lg border border-[var(--success-300)]">
                                                            <FileText size={20} className="text-[var(--success-700)]" />
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={diag.final_report_url!}
                                                            alt="Final Report"
                                                            className="w-12 h-12 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                                            onClick={() => window.open(diag.final_report_url!, '_blank')}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-[var(--success-700)]">Final Report Uploaded</p>
                                                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                                                        <button
                                                            onClick={() => window.open(diag.final_report_url!, '_blank')}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary-600)]"
                                                        >
                                                            <Eye size={12} /> View
                                                        </button>
                                                        <a
                                                            href={diag.final_report_url!}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success-600)]"
                                                        >
                                                            <Download size={12} /> Download
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
                                                                className="text-xs text-[var(--primary-600)] hover:underline"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Upload Final Report button */}
                                        {canUploadFinal && (
                                            <Button
                                                size="sm"
                                                onClick={() => openDiagnosticModal(diag)}
                                                leftIcon={<Upload size={14} />}
                                                className="w-full"
                                            >
                                                Upload Final Report
                                            </Button>
                                        )}

                                        {/* No raw report yet */}
                                        {!hasRawReport && (
                                            <p className="text-xs text-[var(--text-muted)] italic">
                                                Raw report not yet uploaded by backoffice.
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Action Card - Upload Final Report (legacy single-diagnostic, only at Report Received) */}
            {canTakeAction && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card className="border-[var(--primary-200)] bg-gradient-to-r from-[var(--primary-50)] to-white shadow-md">
                        <CardContent className="py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-muted)] mb-1">Your Action</p>
                                    <p className="text-lg font-semibold text-[var(--primary-800)]">
                                        Upload Final Report
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={openStatusModal}
                                    leftIcon={<Upload size={18} />}
                                >
                                    Upload Final Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Final Report Already Uploaded (legacy single-diagnostic) */}
            {!isMultiDiagnostic && ticket.final_report_url && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card className="border-[var(--success-300)] bg-gradient-to-r from-[var(--success-50)] to-white">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-[var(--success-800)]">
                                <CheckCircle2 size={20} />
                                Final Report Uploaded
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="shrink-0">
                                    {ticket.final_report_url.toLowerCase().endsWith('.pdf') ? (
                                        <div className="w-16 h-16 flex items-center justify-center bg-[var(--success-100)] rounded-lg border border-[var(--success-300)]">
                                            <FileText size={28} className="text-[var(--success-700)]" />
                                        </div>
                                    ) : (
                                        <img
                                            src={ticket.final_report_url}
                                            alt="Final Report"
                                            className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                            onClick={() => window.open(ticket.final_report_url, '_blank')}
                                        />
                                    )}
                                </div>
                                <div className="flex gap-3 flex-wrap items-center">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        leftIcon={<Eye size={16} />}
                                        onClick={() => window.open(ticket.final_report_url, '_blank')}
                                    >
                                        View
                                    </Button>
                                    <a
                                        href={ticket.final_report_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--success-600)] rounded-lg hover:bg-[var(--success-700)] transition-colors"
                                    >
                                        <Download size={16} />
                                        Download
                                    </a>
                                    {currentUser && (
                                        <ReplaceDocumentButton
                                            ticketId={id}
                                            documentType="final_report"
                                            currentUserRole={currentUser.role}
                                            onReplaced={() => fetchData()}
                                            onError={setError}
                                            label="Replace"
                                            className="px-3 py-2 text-sm font-medium text-[var(--primary-600)] hover:underline"
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Raw Report Card - Prominent (legacy single-diagnostic) */}
            {!isMultiDiagnostic && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card className="border-[var(--success-200)] bg-gradient-to-r from-[var(--success-50)] to-white shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-[var(--success-800)]">
                                <FileText size={20} />
                                Raw Lab Report
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ticket.raw_report_url ? (
                                <div className="flex items-center gap-4">
                                    <div className="shrink-0">
                                        {ticket.raw_report_url.toLowerCase().endsWith('.pdf') ? (
                                            <div className="w-20 h-20 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                                <FileText size={32} className="text-[var(--error-600)]" />
                                            </div>
                                        ) : (
                                            <img
                                                src={ticket.raw_report_url}
                                                alt="Raw Report"
                                                className="w-20 h-20 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => window.open(ticket.raw_report_url, '_blank')}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                                            The raw lab report is available for analysis. Click to view or download.
                                        </p>
                                        <div className="flex gap-3 flex-wrap items-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                leftIcon={<Eye size={16} />}
                                                onClick={() => window.open(ticket.raw_report_url, '_blank')}
                                            >
                                                View Report
                                            </Button>
                                            <a
                                                href={ticket.raw_report_url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--success-600)] rounded-lg hover:bg-[var(--success-700)] transition-colors"
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
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <FileText size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                                    <p className="text-[var(--text-secondary)]">
                                        No raw report has been uploaded yet.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Ticket Information */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Ticket Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                        <User size={18} className="text-[var(--text-muted)] mt-0.5" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Patient</p>
                            <p className="font-medium text-[var(--text-primary)]">
                                {ticket.patient_name || 'N/A'}
                                {ticket.patient_name_2 && ` & ${ticket.patient_name_2}`}
                            </p>
                            {(ticket.patient_age_1 || ticket.patient_age_2) && (
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {ticket.patient_age_1 && `${ticket.patient_age_1} yrs`}
                                    {ticket.patient_age_1 && ticket.patient_age_2 && ' / '}
                                    {ticket.patient_age_2 && `${ticket.patient_age_2} yrs`}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <Stethoscope size={18} className="text-[var(--text-muted)] mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Doctor</p>
                                <p className="font-medium text-[var(--text-primary)]">{ticket.doctor?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building2 size={18} className="text-[var(--text-muted)] mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Hospital</p>
                                <p className="font-medium text-[var(--text-primary)]">{ticket.hospital?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Service Type — legacy single-diagnostic */}
                    {!isMultiDiagnostic && ticket.service_type && (
                        <div className="flex items-start gap-3 pt-2 border-t border-[var(--border-default)]">
                            <FlaskConical size={18} className="text-[var(--text-muted)] mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Service Type</p>
                                <p className="font-medium text-[var(--text-primary)]">{ticket.service_type.name}</p>
                                {ticket.service_type.kit && (
                                    <p className="text-sm text-[var(--text-secondary)]">Kit: {ticket.service_type.kit}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lab Info — legacy single-diagnostic */}
                    {!isMultiDiagnostic && ticket.lab && (
                        <div className="flex items-start gap-3 pt-2 border-t border-[var(--border-default)]">
                            <Building2 size={18} className="text-[var(--success-600)] mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Lab</p>
                                <p className="font-medium text-[var(--success-700)]">{ticket.lab.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Raw Report Received Date */}
                    {ticket.status_report_received_at && (
                        <div className="flex items-start gap-3 pt-2 border-t border-[var(--border-default)]">
                            <Calendar size={18} className="text-[var(--warning-600)] mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Raw Report Received</p>
                                <p className="font-medium text-[var(--text-primary)]">
                                    {formatDate(ticket.status_report_received_at)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TRF Document */}
                    {ticket.trf_image_url && (
                        <div className="pt-2 border-t border-[var(--border-default)]">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Test Requisition Form</p>
                            <div className="flex items-center gap-3">
                                {ticket.trf_image_url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="w-16 h-16 flex items-center justify-center bg-[var(--error-50)] rounded-lg border border-[var(--error-200)]">
                                        <FileText size={24} className="text-[var(--error-600)]" />
                                    </div>
                                ) : (
                                    <img
                                        src={ticket.trf_image_url}
                                        alt="TRF Document"
                                        className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)] cursor-pointer"
                                        onClick={() => window.open(ticket.trf_image_url, '_blank')}
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
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Process Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Process Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
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

            {/* Comments Section */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare size={18} className="text-[var(--primary-600)]" />
                        Comments
                        {comments.length > 0 && (
                            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)]">
                                {comments.length}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Post new comment */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Textarea
                                placeholder="Add a scientific note or observation..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault()
                                        handlePostComment()
                                    }
                                }}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Ctrl+Enter to submit</p>
                        </div>
                        <Button
                            onClick={handlePostComment}
                            isLoading={isPostingComment}
                            disabled={!newComment.trim()}
                            leftIcon={<Send size={14} />}
                            size="sm"
                            className="self-start mt-0.5"
                        >
                            Post
                        </Button>
                    </div>

                    {/* Comments list */}
                    {comments.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-4">
                            No comments yet. Be the first to add a note.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {(showAllComments ? comments : comments.slice(0, 4)).map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--primary-100)] flex items-center justify-center shrink-0">
                                        <span className="text-xs font-semibold text-[var(--primary-700)]">
                                            {comment.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                                                {comment.author?.full_name || 'Unknown'}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)] capitalize">
                                                {comment.author?.role?.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 break-words">
                                            {comment.comment}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {comments.length > 4 && (
                                <button
                                    onClick={() => setShowAllComments(!showAllComments)}
                                    className="text-sm text-[var(--primary-600)] hover:underline"
                                >
                                    {showAllComments ? 'Show less' : `Show ${comments.length - 4} more comments`}
                                </button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
