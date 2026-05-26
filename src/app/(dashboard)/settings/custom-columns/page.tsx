'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, AlertCircle, Type, Calendar, Hash, ChevronDown, Tag, Lock, Eye, EyeOff } from 'lucide-react'
import {
    Button,
    Input,
    Select,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Modal,
    ModalFooter,
    Badge,
} from '@/components/ui'
import type { CustomColumn, CustomColumnType } from '@/lib/types'

const optionSchema = z.object({
    value: z.string().min(1, 'Value is required'),
    label: z.string().min(1, 'Label is required'),
    color: z.string().optional(),
})

const columnSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50),
    display_name: z.string().min(1, 'Display name is required').max(100),
    column_type: z.enum(['tag', 'text', 'date', 'number', 'dropdown']),
    options: z.array(optionSchema).optional(),
})

type ColumnFormData = z.infer<typeof columnSchema>

const columnTypeOptions = [
    { value: 'tag', label: 'Tag/Status (colored badges)' },
    { value: 'text', label: 'Text (free text input)' },
    { value: 'date', label: 'Date (date picker)' },
    { value: 'number', label: 'Number (numeric input)' },
    { value: 'dropdown', label: 'Dropdown (select from options)' },
]

const getColumnTypeIcon = (type: CustomColumnType | 'builtin') => {
    switch (type) {
        case 'tag':
            return <Tag size={16} />
        case 'text':
            return <Type size={16} />
        case 'date':
            return <Calendar size={16} />
        case 'number':
            return <Hash size={16} />
        case 'dropdown':
            return <ChevronDown size={16} />
        case 'builtin':
            return <Lock size={16} />
        default:
            return <Type size={16} />
    }
}

// Define built-in system fields
interface BuiltInField {
    id: string
    display_name: string
    description: string
}

const builtInFields: BuiltInField[] = [
    { id: 'type', display_name: 'Ticket Type', description: 'Action, Query, or Info' },
    { id: 'doctor', display_name: 'Doctor', description: 'Associated doctor' },
    { id: 'hospital', display_name: 'Hospital', description: 'Associated hospital' },
    { id: 'hospital_city', display_name: 'Hospital City', description: 'City of the hospital' },
    { id: 'hospital_address', display_name: 'Hospital Address', description: 'Full address of the hospital' },
    { id: 'hospital_location', display_name: 'Hospital Location', description: 'Maps link of the hospital' },
    { id: 'hospital_contact', display_name: 'Hospital Contact', description: 'Contact number of the hospital' },
    { id: 'status', display_name: 'Status', description: 'Current workflow stage' },
    { id: 'assigned_to', display_name: 'Assigned To', description: 'Field executive assignment' },
    { id: 'collection_location', display_name: 'Collection Location', description: 'Hospital or Home' },
    { id: 'collection_address', display_name: 'Collection Address', description: 'Address for home collection' },
    { id: 'created_at', display_name: 'Created Date', description: 'When ticket was created' },
]

export default function CustomColumnsPage() {
    const [columns, setColumns] = useState<CustomColumn[]>([])
    const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ColumnFormData>({
        resolver: zodResolver(columnSchema),
        defaultValues: {
            name: '',
            display_name: '',
            column_type: 'text',
            options: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'options',
    })

    const watchedType = watch('column_type')
    const needsOptions = watchedType === 'tag' || watchedType === 'dropdown'

    const fetchColumns = async () => {
        try {
            const response = await fetch('/api/custom-columns')
            const result = await response.json()
            if (result.success) {
                setColumns(result.data)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to fetch custom columns')
        }
    }

    const fetchFieldVisibility = async () => {
        try {
            const response = await fetch('/api/field-visibility')
            const result = await response.json()
            if (result.success) {
                const visibility: Record<string, boolean> = {}
                result.data.forEach((item: { field_id: string; is_visible: boolean }) => {
                    visibility[item.field_id] = item.is_visible
                })
                setFieldVisibility(visibility)
            }
        } catch (err) {
            console.error('Failed to fetch field visibility')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchColumns()
        fetchFieldVisibility()
    }, [])

    const toggleFieldVisibility = async (fieldId: string) => {
        const newValue = !fieldVisibility[fieldId]
        setSaving(fieldId)

        try {
            const response = await fetch('/api/field-visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field_id: fieldId, is_visible: newValue }),
            })

            const result = await response.json()
            if (result.success) {
                setFieldVisibility((prev) => ({ ...prev, [fieldId]: newValue }))
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to update field visibility')
        } finally {
            setSaving(null)
        }
    }

    const openCreateModal = () => {
        setEditingColumn(null)
        reset({
            name: '',
            display_name: '',
            column_type: 'text',
            options: [],
        })
        setIsModalOpen(true)
    }

    const openEditModal = (column: CustomColumn) => {
        setEditingColumn(column)
        reset({
            name: column.name,
            display_name: column.display_name,
            column_type: column.column_type,
            options: column.options || [],
        })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingColumn(null)
        reset()
    }

    const onSubmit = async (data: ColumnFormData) => {
        setIsSubmitting(true)
        try {
            const url = '/api/custom-columns'
            const method = editingColumn ? 'PATCH' : 'POST'
            const body = editingColumn ? { id: editingColumn.id, ...data } : data

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const result = await response.json()
            if (result.success) {
                fetchColumns()
                closeModal()
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to save custom column')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/custom-columns?id=${id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                setColumns(columns.filter((c) => c.id !== id))
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to delete custom column')
        } finally {
            setDeleteConfirm(null)
        }
    }

    const toggleActive = async (column: CustomColumn) => {
        try {
            const response = await fetch('/api/custom-columns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: column.id, is_active: !column.is_active }),
            })

            const result = await response.json()
            if (result.success) {
                setColumns(columns.map((c) => (c.id === column.id ? result.data : c)))
            }
        } catch (err) {
            setError('Failed to update column')
        }
    }

    const addOption = () => {
        append({ value: '', label: '', color: '#3b82f6' })
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ticket Fields</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Manage built-in and custom fields for tickets
                    </p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add Custom Field
                </Button>
            </div>

            {/* Info Box */}
            <div className="p-4 mb-6 rounded-lg bg-[var(--info-50)] border border-[var(--info-500)]/20">
                <h3 className="font-medium text-[var(--text-primary)] mb-1">Managing Ticket Fields</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                    Changes here apply to <strong>all users</strong>. Built-in fields can be shown/hidden.
                    Custom fields can be fully managed.
                </p>
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

            {/* Built-in System Fields */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock size={18} className="text-[var(--text-muted)]" />
                        Built-in Fields
                    </CardTitle>
                    <CardDescription>Core system fields - toggle visibility for all users</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {builtInFields.map((field) => (
                            <div
                                key={field.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${fieldVisibility[field.id] !== false
                                    ? 'bg-white border-[var(--border-light)]'
                                    : 'bg-[var(--gray-50)] border-[var(--border-light)] opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--gray-100)] flex items-center justify-center text-[var(--text-secondary)]">
                                        <Lock size={14} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-[var(--text-primary)] text-sm">{field.display_name}</h4>
                                        <p className="text-xs text-[var(--text-muted)]">{field.description}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFieldVisibility(field.id)}
                                    disabled={saving === field.id}
                                    className={fieldVisibility[field.id] !== false ? '' : 'text-[var(--text-muted)]'}
                                >
                                    {saving === field.id ? (
                                        <span className="spinner spinner-sm" />
                                    ) : fieldVisibility[field.id] !== false ? (
                                        <>
                                            <Eye size={16} className="mr-1" /> Visible
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff size={16} className="mr-1" /> Hidden
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Custom Columns */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag size={18} className="text-[var(--primary-500)]" />
                        Custom Fields
                    </CardTitle>
                    <CardDescription>Additional fields you've created - can be edited or deleted</CardDescription>
                </CardHeader>
                <CardContent>
                    {columns.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            No custom fields configured. Click "Add Custom Field" to create your first one.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {columns.map((column) => (
                                    <motion.div
                                        key={column.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className={`p-4 rounded-lg border ${column.is_active
                                            ? 'bg-white border-[var(--border-light)]'
                                            : 'bg-[var(--gray-50)] border-[var(--border-light)] opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)]">
                                                {getColumnTypeIcon(column.column_type)}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-[var(--text-primary)]">{column.display_name}</h4>
                                                    <span className="text-xs text-[var(--text-muted)]">({column.name})</span>
                                                    {!column.is_active && (
                                                        <Badge size="sm" variant="default">Hidden</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] capitalize mt-0.5">
                                                    Type: {column.column_type}
                                                </p>

                                                {/* Show options for tag/dropdown */}
                                                {(column.column_type === 'tag' || column.column_type === 'dropdown') && column.options && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {column.options.map((opt, i) => (
                                                            <Badge key={i} size="sm" color={opt.color}>
                                                                {opt.label}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleActive(column)}
                                                    className="text-xs"
                                                >
                                                    {column.is_active ? (
                                                        <><Eye size={14} className="mr-1" /> Hide</>
                                                    ) : (
                                                        <><EyeOff size={14} className="mr-1" /> Show</>
                                                    )}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(column)}>
                                                    <Edit2 size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm(column.id)}
                                                    className="text-[var(--error-600)] hover:bg-[var(--error-50)]"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingColumn ? 'Edit Custom Field' : 'Create Custom Field'}
                description="Configure a custom tracking field for tickets"
                size="lg"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Display Name"
                            placeholder="e.g., Priority Level"
                            {...register('display_name')}
                            error={errors.display_name?.message}
                        />
                        <Input
                            label="Internal Name"
                            placeholder="e.g., priority_level"
                            {...register('name')}
                            error={errors.name?.message}
                            hint="Used in code (auto-formatted)"
                        />
                    </div>

                    <Select
                        label="Field Type"
                        options={columnTypeOptions}
                        {...register('column_type')}
                        error={errors.column_type?.message}
                    />

                    {/* Options for tag/dropdown */}
                    {needsOptions && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-primary)]">
                                    Options
                                </label>
                                <Button type="button" variant="ghost" size="sm" onClick={addOption} leftIcon={<Plus size={14} />}>
                                    Add Option
                                </Button>
                            </div>

                            {fields.length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)] text-center py-4 border border-dashed border-[var(--border-default)] rounded-lg">
                                    No options added. Click "Add Option" to create choices.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                            {watchedType === 'tag' && (
                                                <input
                                                    type="color"
                                                    {...register(`options.${index}.color`)}
                                                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                                />
                                            )}
                                            <Input
                                                placeholder="Value"
                                                {...register(`options.${index}.value`)}
                                                className="flex-1"
                                            />
                                            <Input
                                                placeholder="Label"
                                                {...register(`options.${index}.label`)}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => remove(index)}
                                                className="text-[var(--error-600)]"
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <ModalFooter>
                        <Button variant="secondary" onClick={closeModal} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {editingColumn ? 'Save Changes' : 'Create Field'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Custom Field"
                description="Are you sure? This will permanently delete this field and all its values from all tickets."
                size="sm"
            >
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                        Delete Permanently
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}
