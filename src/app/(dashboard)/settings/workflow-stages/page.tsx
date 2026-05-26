'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, GripVertical, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Modal,
    ModalFooter,
    Badge,
} from '@/components/ui'
import type { WorkflowStage } from '@/lib/types'

const stageSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
})

type StageFormData = z.infer<typeof stageSchema>

const predefinedColors = [
    '#6b7280', // Gray
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
]

export default function WorkflowStagesPage() {
    const [stages, setStages] = useState<WorkflowStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Sync diagnostics state
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<{
        ticketsFixed: number
        diagnosticsFixed: number
        errors: string[]
        fixedTickets: { id: string; uid: string; stage: string; diagnosticsCount: number }[]
    } | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<StageFormData>({
        resolver: zodResolver(stageSchema),
        defaultValues: {
            name: '',
            color: '#3b82f6',
        },
    })

    const watchedColor = watch('color')

    const fetchStages = async () => {
        try {
            const response = await fetch('/api/workflow-stages')
            const result = await response.json()
            if (result.success) {
                setStages(result.data)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to fetch workflow stages')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStages()
    }, [])

    const openCreateModal = () => {
        setEditingStage(null)
        reset({ name: '', color: '#3b82f6' })
        setIsModalOpen(true)
    }

    const openEditModal = (stage: WorkflowStage) => {
        setEditingStage(stage)
        reset({ name: stage.name, color: stage.color })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingStage(null)
        reset()
    }

    const onSubmit = async (data: StageFormData) => {
        setIsSubmitting(true)
        try {
            const url = '/api/workflow-stages'
            const method = editingStage ? 'PATCH' : 'POST'
            const body = editingStage ? { id: editingStage.id, ...data } : data

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const result = await response.json()
            if (result.success) {
                fetchStages()
                closeModal()
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to save workflow stage')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/workflow-stages?id=${id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                setStages(stages.filter((s) => s.id !== id))
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to delete workflow stage')
        } finally {
            setDeleteConfirm(null)
        }
    }

    const toggleActive = async (stage: WorkflowStage) => {
        try {
            const response = await fetch('/api/workflow-stages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: stage.id, is_active: !stage.is_active }),
            })

            const result = await response.json()
            if (result.success) {
                setStages(stages.map((s) => (s.id === stage.id ? result.data : s)))
            }
        } catch (err) {
            setError('Failed to update stage')
        }
    }

    const handleSyncDiagnostics = async () => {
        setSyncing(true)
        setSyncResult(null)
        try {
            const res = await fetch('/api/admin/sync-diagnostics', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setSyncResult(data.data)
            } else {
                setError(data.error || 'Sync failed')
            }
        } catch (err) {
            setError('Failed to run sync')
        } finally {
            setSyncing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="spinner spinner-lg" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workflow Stages</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Configure the status stages that tickets can move through
                    </p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add Stage
                </Button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20">
                    <AlertCircle className="w-5 h-5 text-[var(--error-600)] flex-shrink-0" />
                    <p className="text-sm text-[var(--error-600)]">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-[var(--error-600)] hover:underline text-sm">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Stages List */}
            <Card>
                <CardHeader>
                    <CardTitle>Status Stages</CardTitle>
                </CardHeader>
                <CardContent>
                    {stages.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            No workflow stages configured. Click "Add Stage" to create your first one.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {stages.map((stage) => (
                                    <motion.div
                                        key={stage.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className={`flex items-center gap-4 p-4 rounded-lg border ${stage.is_active
                                                ? 'bg-white border-[var(--border-light)]'
                                                : 'bg-[var(--gray-50)] border-[var(--border-light)] opacity-60'
                                            }`}
                                    >
                                        <GripVertical size={20} className="text-[var(--text-muted)] cursor-grab" />

                                        <div className="flex-1 flex items-center gap-3">
                                            <Badge color={stage.color}>{stage.name}</Badge>
                                            {!stage.is_active && (
                                                <span className="text-xs text-[var(--text-muted)]">(Inactive)</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleActive(stage)}
                                                className="text-xs"
                                            >
                                                {stage.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(stage)}
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteConfirm(stage.id)}
                                                className="text-[var(--error-600)] hover:bg-[var(--error-50)]"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* System Tools */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>System Tools</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Sync Diagnostic Statuses</p>
                            <p className="text-sm text-[var(--text-secondary)] mb-3">
                                If a manager or admin manually changed ticket stages before the automatic sync was enabled,
                                run this to retroactively fix all ticket diagnostics so they reflect the correct stage.
                                Safe to run multiple times.
                            </p>
                            <Button
                                variant="secondary"
                                onClick={handleSyncDiagnostics}
                                isLoading={syncing}
                                leftIcon={syncing ? undefined : <RefreshCw size={16} />}
                            >
                                {syncing ? 'Syncing...' : 'Run Diagnostic Sync'}
                            </Button>
                        </div>

                        {syncResult && (
                            <div className={`rounded-lg border overflow-hidden ${
                                syncResult.errors.length > 0
                                    ? 'border-[var(--error-200)]'
                                    : 'border-[var(--success-200)]'
                            }`}>
                                {/* Summary header */}
                                <div className={`flex items-start gap-3 p-3 ${
                                    syncResult.errors.length > 0
                                        ? 'bg-[var(--error-50)] text-[var(--error-700)]'
                                        : 'bg-[var(--success-50)] text-[var(--success-700)]'
                                }`}>
                                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium">
                                            {syncResult.diagnosticsFixed === 0
                                                ? 'Everything already in sync — no changes needed.'
                                                : `Fixed ${syncResult.diagnosticsFixed} diagnostic${syncResult.diagnosticsFixed !== 1 ? 's' : ''} across ${syncResult.ticketsFixed} ticket${syncResult.ticketsFixed !== 1 ? 's' : ''}.`
                                            }
                                        </p>
                                        {syncResult.errors.length > 0 && (
                                            <p className="mt-1 text-xs">{syncResult.errors.length} error(s): {syncResult.errors[0]}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Log list */}
                                {syncResult.fixedTickets.length > 0 && (
                                    <div className="bg-[var(--gray-950,#0a0a0a)] max-h-64 overflow-y-auto">
                                        <div className="px-3 py-1.5 border-b border-[var(--border-light)]/20">
                                            <p className="text-xs text-[var(--text-muted)] font-mono">sync log — {syncResult.fixedTickets.length} ticket{syncResult.fixedTickets.length !== 1 ? 's' : ''} updated</p>
                                        </div>
                                        <ul className="divide-y divide-[var(--border-light)]/10">
                                            {syncResult.fixedTickets.map((t, i) => (
                                                <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs">
                                                    <span className="text-[var(--text-muted)] select-none w-6 text-right">{i + 1}.</span>
                                                    <span className="text-green-400 font-semibold">{t.uid}</span>
                                                    <span className="text-[var(--text-muted)]">→</span>
                                                    <span className="text-blue-300">{t.stage}</span>
                                                    <span className="text-[var(--text-muted)] ml-auto text-[10px]">
                                                        {t.diagnosticsCount} diag{t.diagnosticsCount !== 1 ? 's' : ''}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingStage ? 'Edit Stage' : 'Create Stage'}
                description="Configure the name and color for this workflow stage"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Stage Name"
                        placeholder="e.g., In Progress"
                        {...register('name')}
                        error={errors.name?.message}
                    />

                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-[var(--text-primary)]">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {predefinedColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setValue('color', color)}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all ${watchedColor === color ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <Input
                            type="text"
                            placeholder="#3b82f6"
                            {...register('color')}
                            error={errors.color?.message}
                            leftIcon={
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: watchedColor }}
                                />
                            }
                        />
                    </div>

                    <div className="mt-4">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">Preview:</p>
                        <Badge color={watchedColor}>{watch('name') || 'Stage Name'}</Badge>
                    </div>

                    <ModalFooter>
                        <Button variant="secondary" onClick={closeModal} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {editingStage ? 'Save Changes' : 'Create Stage'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Stage"
                description="Are you sure you want to delete this stage? This action cannot be undone."
                size="sm"
            >
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                        Delete
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}
