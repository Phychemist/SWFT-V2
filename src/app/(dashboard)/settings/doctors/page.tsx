'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Search, Stethoscope, Phone, Building2 } from 'lucide-react'
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Modal,
    ModalFooter,
    Select,
} from '@/components/ui'
import type { Doctor, Hospital } from '@/lib/types'

const doctorSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    phone: z.string().max(20).optional(),
    hospital_id: z.string().min(1, 'Hospital is required'),
})

type DoctorFormData = z.infer<typeof doctorSchema>

export default function DoctorsSettingsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<DoctorFormData>({
        resolver: zodResolver(doctorSchema),
        defaultValues: {
            name: '',
            phone: '',
            hospital_id: '',
        },
    })

    const fetchData = async () => {
        try {
            const [docsRes, hospRes] = await Promise.all([
                fetch('/api/doctors'),
                fetch('/api/hospitals'),
            ])

            const docsResult = await docsRes.json()
            const hospResult = await hospRes.json()

            if (docsResult.success) setDoctors(docsResult.data)
            if (hospResult.success) setHospitals(hospResult.data)

            if (!docsResult.success) setError(docsResult.error)
        } catch (err) {
            setError('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const openCreateModal = () => {
        setEditingDoctor(null)
        reset({ name: '', phone: '', hospital_id: '' })
        setIsModalOpen(true)
    }

    const openEditModal = (doctor: Doctor) => {
        setEditingDoctor(doctor)
        reset({
            name: doctor.name,
            phone: doctor.phone || '',
            hospital_id: doctor.hospital_id,
        })
        setIsModalOpen(true)
    }

    const onSubmit = async (data: DoctorFormData) => {
        setIsSubmitting(true)
        try {
            const url = editingDoctor
                ? `/api/doctors/${editingDoctor.id}`
                : '/api/doctors'

            const method = editingDoctor ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (result.success) {
                fetchData()
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

    const handleDelete = async (doctor: Doctor) => {
        if (!confirm(`Are you sure you want to delete "${doctor.name}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/doctors/${doctor.id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                fetchData()
            } else {
                alert(result.error)
            }
        } catch (err) {
            alert('An error occurred while deleting')
        }
    }

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.hospital?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Doctors</h1>
                    <p className="text-[var(--text-secondary)]">Manage doctors and their hospital associations</p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add Doctor
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search doctors by name or hospital..."
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
                        {filteredDoctors.map((doctor) => (
                            <motion.div
                                key={doctor.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2 bg-[var(--primary-50)] rounded-lg text-[var(--primary-600)]">
                                                <Stethoscope size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-50)] rounded-full transition-colors"
                                                    onClick={() => openEditModal(doctor)}
                                                    title="Edit Doctor"
                                                >
                                                    <Edit2 size={16} strokeWidth={2} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--error-600)] hover:bg-[var(--error-50)] rounded-full transition-colors"
                                                    onClick={() => handleDelete(doctor)}
                                                    title="Delete Doctor"
                                                >
                                                    <Trash2 size={16} strokeWidth={2} />
                                                </Button>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">{doctor.name}</h3>

                                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
                                            <Building2 size={14} className="flex-shrink-0" />
                                            <span className="truncate">{doctor.hospital?.name || 'No Hospital'}</span>
                                        </div>

                                        {doctor.phone && (
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                                <Phone size={14} className="flex-shrink-0" />
                                                <span>{doctor.phone}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredDoctors.length === 0 && !loading && (
                <div className="text-center py-12 bg-[var(--gray-50)] rounded-xl border-2 border-dashed border-[var(--border-light)]">
                    <Stethoscope className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                    <p className="text-[var(--text-secondary)]">No doctors found</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
            >
                <form id="doctor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Doctor Name"
                        placeholder="e.g. Dr. John Doe"
                        {...register('name')}
                        error={errors.name?.message}
                        required
                    />
                    <Select
                        label="Hospital"
                        {...register('hospital_id')}
                        error={errors.hospital_id?.message}
                        required
                        options={[
                            { value: '', label: 'Select Hospital' },
                            ...hospitals.map(h => ({ value: h.id, label: h.name }))
                        ]}
                    />
                    <Input
                        label="Phone Number"
                        placeholder="e.g. +91 98765 43210"
                        {...register('phone')}
                        error={errors.phone?.message}
                    />
                </form>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="doctor-form" isLoading={isSubmitting}>
                        {editingDoctor ? 'Update' : 'Create'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}
