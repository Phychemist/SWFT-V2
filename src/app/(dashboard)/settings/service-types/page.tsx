'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, AlertCircle, FlaskConical, Pill, Package, FileText, ClipboardList, Users, User } from 'lucide-react'
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Modal,
    ModalFooter,
    Badge,
    Textarea,
} from '@/components/ui'
import type { ServiceType, ServiceCategory, PatientType } from '@/lib/types'

const PATIENT_TYPE_OPTIONS: { value: PatientType; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'couple', label: 'Couple', desc: 'Both husband and wife details', icon: <Users size={18} /> },
    { value: 'female_only', label: 'Female Only', desc: 'Only wife/female details', icon: <User size={18} /> },
    { value: 'male_only', label: 'Male Only', desc: 'Only husband/male details', icon: <User size={18} /> },
]

const getPatientTypeLabel = (type: PatientType): string => {
    const option = PATIENT_TYPE_OPTIONS.find(o => o.value === type)
    return option?.label || 'Couple'
}

const serviceTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    kit: z.string().optional(),
    requirements: z.string().optional(),
    protocol: z.string().optional(),
    patient_type: z.enum(['couple', 'female_only', 'male_only']).optional(),
})

type ServiceTypeFormData = z.infer<typeof serviceTypeSchema>

export default function ServiceTypesPage() {
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [activeTab, setActiveTab] = useState<ServiceCategory>('diagnostics')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingType, setEditingType] = useState<ServiceType | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ServiceTypeFormData>({
        resolver: zodResolver(serviceTypeSchema),
        defaultValues: {
            name: '',
            kit: '',
            requirements: '',
            protocol: '',
            patient_type: 'couple',
        },
    })

    const watchedPatientType = watch('patient_type')

    const fetchServiceTypes = async () => {
        try {
            const response = await fetch('/api/service-types')
            const result = await response.json()
            if (result.success) {
                setServiceTypes(result.data)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to fetch service types')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServiceTypes()
    }, [])

    const filteredTypes = serviceTypes.filter((t) => t.category === activeTab && t.is_active)

    const openCreateModal = () => {
        setEditingType(null)
        reset({
            name: '',
            kit: '',
            requirements: '',
            protocol: '',
            patient_type: 'couple',
        })
        setIsModalOpen(true)
    }

    const openEditModal = (type: ServiceType) => {
        setEditingType(type)
        reset({
            name: type.name,
            kit: type.kit || '',
            requirements: type.requirements || '',
            protocol: type.protocol || '',
            patient_type: type.patient_type || 'couple',
        })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingType(null)
        reset()
    }

    const onSubmit = async (data: ServiceTypeFormData) => {
        setIsSubmitting(true)
        try {
            if (editingType) {
                // Update existing
                const response = await fetch(`/api/service-types/${editingType.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })
                const result = await response.json()
                if (result.success) {
                    setServiceTypes(serviceTypes.map((t) => (t.id === editingType.id ? result.data : t)))
                    closeModal()
                } else {
                    setError(result.error)
                }
            } else {
                // Create new
                const response = await fetch('/api/service-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...data, category: activeTab }),
                })
                const result = await response.json()
                if (result.success) {
                    setServiceTypes([...serviceTypes, result.data])
                    closeModal()
                } else {
                    setError(result.error)
                }
            }
        } catch (err) {
            setError('Failed to save service type')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/service-types/${id}`, {
                method: 'DELETE',
            })
            const result = await response.json()
            if (result.success) {
                setServiceTypes(serviceTypes.filter((t) => t.id !== id))
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to delete service type')
        } finally {
            setDeleteConfirm(null)
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Service Types</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Manage diagnostics and therapeutics service offerings
                    </p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add {activeTab === 'diagnostics' ? 'Diagnostic' : 'Therapeutic'}
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

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('diagnostics')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'diagnostics'
                        ? 'bg-[var(--primary-600)] text-white shadow-md'
                        : 'bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--gray-50)]'
                        }`}
                >
                    <FlaskConical size={18} />
                    Diagnostics
                    <Badge size="sm" variant="default">
                        {serviceTypes.filter((t) => t.category === 'diagnostics' && t.is_active).length}
                    </Badge>
                </button>
                <button
                    onClick={() => setActiveTab('therapeutics')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'therapeutics'
                        ? 'bg-[var(--primary-600)] text-white shadow-md'
                        : 'bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--gray-50)]'
                        }`}
                >
                    <Pill size={18} />
                    Therapeutics
                    <Badge size="sm" variant="default">
                        {serviceTypes.filter((t) => t.category === 'therapeutics' && t.is_active).length}
                    </Badge>
                </button>
            </div>

            {/* Service Types List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {activeTab === 'diagnostics' ? (
                            <FlaskConical size={18} className="text-[var(--primary-500)]" />
                        ) : (
                            <Pill size={18} className="text-[var(--primary-500)]" />
                        )}
                        {activeTab === 'diagnostics' ? 'Diagnostic Services' : 'Therapeutic Services'}
                    </CardTitle>
                    <CardDescription>
                        {activeTab === 'diagnostics'
                            ? 'Tests and diagnostic procedures offered'
                            : 'Treatment and therapeutic services offered'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredTypes.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                                {activeTab === 'diagnostics' ? <FlaskConical size={28} /> : <Pill size={28} />}
                            </div>
                            <p>No {activeTab === 'diagnostics' ? 'diagnostic' : 'therapeutic'} services configured.</p>
                            <p className="text-sm mt-1">Click &quot;Add&quot; to create your first one.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filteredTypes.map((type) => (
                                    <motion.div
                                        key={type.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="p-4 rounded-lg border bg-white border-[var(--border-light)] hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)]">
                                                {activeTab === 'diagnostics' ? <FlaskConical size={20} /> : <Pill size={20} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-[var(--text-primary)]">{type.name}</h4>
                                                    <Badge size="sm" variant="default" className="flex items-center gap-1">
                                                        {type.patient_type === 'couple' ? <Users size={12} /> : <User size={12} />}
                                                        {getPatientTypeLabel(type.patient_type || 'couple')}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                                    {type.kit && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <Package size={14} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="text-[var(--text-muted)]">Kit:</span>
                                                                <p className="text-[var(--text-secondary)]">{type.kit}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {type.requirements && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <ClipboardList size={14} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="text-[var(--text-muted)]">Requirements:</span>
                                                                <p className="text-[var(--text-secondary)]">{type.requirements}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {type.protocol && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <FileText size={14} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="text-[var(--text-muted)]">Protocol:</span>
                                                                <p className="text-[var(--text-secondary)]">{type.protocol}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(type)}>
                                                    <Edit2 size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm(type.id)}
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
                title={editingType ? 'Edit Service Type' : `Add ${activeTab === 'diagnostics' ? 'Diagnostic' : 'Therapeutic'} Service`}
                description="Configure the service details including kit, requirements, and protocol"
                size="lg"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Service Name"
                        placeholder={activeTab === 'diagnostics' ? 'e.g., Blood Test, MRI Scan' : 'e.g., IV Therapy, Wound Dressing'}
                        {...register('name')}
                        error={errors.name?.message}
                    />

                    {/* Patient Type Selector */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">
                            Patient Information Required
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mb-3">
                            This controls which patient fields appear when creating a ticket for this service
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {PATIENT_TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setValue('patient_type', option.value)}
                                    className={`
                                        relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${watchedPatientType === option.value
                                            ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                                            : 'border-[var(--border-default)] hover:border-[var(--gray-400)]'
                                        }
                                    `}
                                >
                                    <div className={`mb-2 ${watchedPatientType === option.value ? 'text-[var(--primary-600)]' : 'text-[var(--text-muted)]'}`}>
                                        {option.icon}
                                    </div>
                                    <span className="font-medium text-sm text-[var(--text-primary)]">{option.label}</span>
                                    <span className="text-xs text-[var(--text-muted)] text-center mt-1">{option.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Textarea
                        label="Kit to Carry"
                        placeholder="List the equipment/kit required for this service"
                        rows={2}
                        {...register('kit')}
                    />

                    <Textarea
                        label="Requirements"
                        placeholder="Patient requirements, pre-conditions, fasting instructions, etc."
                        rows={2}
                        {...register('requirements')}
                    />

                    <Textarea
                        label="Protocol"
                        placeholder="Step-by-step procedure or protocol instructions"
                        rows={3}
                        {...register('protocol')}
                    />

                    <ModalFooter>
                        <Button variant="secondary" onClick={closeModal} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {editingType ? 'Save Changes' : 'Create Service'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Service Type"
                description="Are you sure you want to delete this service type? This action cannot be undone."
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
