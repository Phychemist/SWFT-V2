'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Search, FlaskConical, MapPin } from 'lucide-react'
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
import type { Lab } from '@/lib/types'

const diagnosticCenterSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
})

type DiagnosticCenterFormData = z.infer<typeof diagnosticCenterSchema>

export default function DiagnosticCentersSettingsPage() {
    const [centers, setCenters] = useState<Lab[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCenter, setEditingCenter] = useState<Lab | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<DiagnosticCenterFormData>({
        resolver: zodResolver(diagnosticCenterSchema),
        defaultValues: {
            name: '',
            address: '',
            city: '',
        },
    })

    const fetchCenters = async () => {
        try {
            const response = await fetch('/api/labs')
            const result = await response.json()
            if (result.success) {
                setCenters(result.data)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to fetch diagnostic centers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCenters()
    }, [])

    const openCreateModal = () => {
        setEditingCenter(null)
        reset({ name: '', address: '', city: '' })
        setIsModalOpen(true)
    }

    const openEditModal = (center: Lab) => {
        setEditingCenter(center)
        reset({
            name: center.name,
            address: center.address || '',
            city: center.city || '',
        })
        setIsModalOpen(true)
    }

    const onSubmit = async (data: DiagnosticCenterFormData) => {
        setIsSubmitting(true)
        try {
            if (editingCenter) {
                // Update existing center
                const response = await fetch(`/api/labs/${editingCenter.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })

                const result = await response.json()
                if (result.success) {
                    fetchCenters()
                    setIsModalOpen(false)
                    reset()
                } else {
                    alert(result.error)
                }
            } else {
                // Create new center
                const response = await fetch('/api/labs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })

                const result = await response.json()
                if (result.success) {
                    fetchCenters()
                    setIsModalOpen(false)
                    reset()
                } else {
                    alert(result.error)
                }
            }
        } catch (err) {
            alert('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (center: Lab) => {
        if (!confirm(`Are you sure you want to delete "${center.name}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/labs/${center.id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                fetchCenters()
            } else {
                alert(result.error)
            }
        } catch (err) {
            alert('An error occurred while deleting')
        }
    }

    const filteredCenters = centers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Diagnostic Centers</h1>
                    <p className="text-[var(--text-secondary)]">Manage diagnostic centers for sample processing</p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add Diagnostic Center
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search diagnostic centers by name or city..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner spinner-lg" />
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredCenters.map((center) => (
                            <motion.div
                                key={center.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2 bg-[var(--primary-50)] rounded-lg text-[var(--primary-600)]">
                                                <FlaskConical size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-50)] rounded-full transition-colors"
                                                    onClick={() => openEditModal(center)}
                                                    title="Edit Diagnostic Center"
                                                >
                                                    <Edit2 size={16} strokeWidth={2} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--error-600)] hover:bg-[var(--error-50)] rounded-full transition-colors"
                                                    onClick={() => handleDelete(center)}
                                                    title="Delete Diagnostic Center"
                                                >
                                                    <Trash2 size={16} strokeWidth={2} />
                                                </Button>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">{center.name}</h3>

                                        {center.city && (
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mb-2">
                                                <MapPin size={14} />
                                                <span>{center.city}</span>
                                            </div>
                                        )}

                                        {center.address && (
                                            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mt-auto">
                                                {center.address}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredCenters.length === 0 && !loading && (
                <div className="text-center py-12 bg-[var(--gray-50)] rounded-xl border-2 border-dashed border-[var(--border-light)]">
                    <FlaskConical className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                    <p className="text-[var(--text-secondary)]">No diagnostic centers found</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCenter ? 'Edit Diagnostic Center' : 'Add New Diagnostic Center'}
            >
                <form id="diagnostic-center-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Diagnostic Center Name"
                        placeholder="e.g. Seragen Genomics Lab"
                        {...register('name')}
                        error={errors.name?.message}
                        required
                    />
                    <Input
                        label="City"
                        placeholder="e.g. Mumbai"
                        {...register('city')}
                        error={errors.city?.message}
                    />
                    <Input
                        label="Full Address"
                        placeholder="Enter complete address"
                        {...register('address')}
                        error={errors.address?.message}
                    />
                </form>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="diagnostic-center-form" isLoading={isSubmitting}>
                        {editingCenter ? 'Update' : 'Create'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}
