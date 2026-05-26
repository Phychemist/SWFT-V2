'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Search, Building2, MapPin, Phone, ExternalLink } from 'lucide-react'
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
import type { Hospital } from '@/lib/types'

const hospitalSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    city: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    location: z.string().max(1000).optional(),
    contact: z.string().max(100).optional(),
})

type HospitalFormData = z.infer<typeof hospitalSchema>

export default function HospitalsSettingsPage() {
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingHospital, setEditingHospital] = useState<Hospital | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<HospitalFormData>({
        resolver: zodResolver(hospitalSchema),
        defaultValues: {
            name: '',
            city: '',
            address: '',
            location: '',
            contact: '',
        },
    })

    const fetchHospitals = async () => {
        try {
            const response = await fetch('/api/hospitals')
            const result = await response.json()
            if (result.success) {
                setHospitals(result.data)
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to fetch hospitals')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHospitals()
    }, [])

    const openCreateModal = () => {
        setEditingHospital(null)
        reset({ name: '', city: '', address: '', location: '', contact: '' })
        setIsModalOpen(true)
    }

    const openEditModal = (hospital: Hospital) => {
        setEditingHospital(hospital)
        reset({
            name: hospital.name,
            city: hospital.city || '',
            address: hospital.address || '',
            location: hospital.location || '',
            contact: hospital.contact || '',
        })
        setIsModalOpen(true)
    }

    const onSubmit = async (data: HospitalFormData) => {
        setIsSubmitting(true)
        try {
            const url = editingHospital
                ? `/api/hospitals/${editingHospital.id}`
                : '/api/hospitals'

            const method = editingHospital ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (result.success) {
                fetchHospitals()
                setIsModalOpen(false)
                reset()
            } else {
                alert(result.error)
            }
        } catch (err) {
            alert('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (hospital: Hospital) => {
        if (!confirm(`Are you sure you want to delete "${hospital.name}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/hospitals/${hospital.id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                fetchHospitals()
            } else {
                alert(result.error)
            }
        } catch (err) {
            alert('An error occurred while deleting')
        }
    }

    const filteredHospitals = hospitals.filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.city && h.city.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hospitals</h1>
                    <p className="text-[var(--text-secondary)]">Manage hospitals for ticket assignment</p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add Hospital
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search hospitals by name or city..."
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
                        {filteredHospitals.map((hospital) => (
                            <motion.div
                                key={hospital.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2 bg-[var(--primary-50)] rounded-lg text-[var(--primary-600)]">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-50)] rounded-full transition-colors"
                                                    onClick={() => openEditModal(hospital)}
                                                    title="Edit Hospital"
                                                >
                                                    <Edit2 size={16} strokeWidth={2} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--error-600)] hover:bg-[var(--error-50)] rounded-full transition-colors"
                                                    onClick={() => handleDelete(hospital)}
                                                    title="Delete Hospital"
                                                >
                                                    <Trash2 size={16} strokeWidth={2} />
                                                </Button>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">{hospital.name}</h3>

                                        {hospital.city && (
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mb-2">
                                                <MapPin size={14} />
                                                <span>{hospital.city}</span>
                                            </div>
                                        )}

                                        {hospital.address && (
                                            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                                                {hospital.address}
                                            </p>
                                        )}

                                        {hospital.location && (
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--primary-600)] mb-2">
                                                <ExternalLink size={14} />
                                                <a href={hospital.location} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" onClick={(e) => e.stopPropagation()}>
                                                    Maps Link
                                                </a>
                                            </div>
                                        )}

                                        {hospital.contact && (
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mt-auto">
                                                <Phone size={14} />
                                                <span>{hospital.contact}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredHospitals.length === 0 && !loading && (
                <div className="text-center py-12 bg-[var(--gray-50)] rounded-xl border-2 border-dashed border-[var(--border-light)]">
                    <Building2 className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                    <p className="text-[var(--text-secondary)]">No hospitals found</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
            >
                <form id="hospital-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Hospital Name"
                        placeholder="e.g. Apollo Hospital"
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
                    <Input
                        label="Location (Maps Link)"
                        placeholder="e.g. https://maps.google.com/..."
                        {...register('location')}
                        error={errors.location?.message}
                    />
                    <Input
                        label="Contact"
                        placeholder="e.g. +91 9876543210"
                        {...register('contact')}
                        error={errors.contact?.message}
                    />
                </form>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="hospital-form" isLoading={isSubmitting}>
                        {editingHospital ? 'Update' : 'Create'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}
