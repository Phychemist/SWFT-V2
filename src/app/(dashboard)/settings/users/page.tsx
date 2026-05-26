'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, AlertCircle, User, Shield, Trash2 } from 'lucide-react'
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
import type { User as UserType, UserRole } from '@/lib/types'

const userSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
    full_name: z.string().min(1, 'Full name is required').max(100),
    role: z.enum(['admin', 'manager', 'customer_success', 'field_executive', 'officer_backoffice', 'scientist', 'accountant']),
})

type UserFormData = z.infer<typeof userSchema>

const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'customer_success', label: 'Customer Success' },
    { value: 'field_executive', label: 'Field Executive' },
    { value: 'officer_backoffice', label: 'Officer - Backoffice' },
    { value: 'scientist', label: 'Scientist' },
    { value: 'accountant', label: 'Accountant' },
]

const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
        case 'admin':
            return '#8b5cf6'
        case 'manager':
            return '#3b82f6'
        case 'customer_success':
            return '#10b981'
        case 'field_executive':
            return '#f59e0b'
        case 'officer_backoffice':
            return '#0ea5e9'
        case 'scientist':
            return '#22c55e'
        case 'accountant':
            return '#ec4899'
        default:
            return '#6b7280'
    }
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserType[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserType | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            username: '',
            password: '',
            full_name: '',
            role: 'customer_success',
        },
    })

    const fetchSessionAndUsers = async () => {
        try {
            setLoading(true)
            // Fetch session
            const sessionResponse = await fetch('/api/auth/me')
            const sessionResult = await sessionResponse.json()
            if (sessionResult.success && sessionResult.data) {
                setCurrentUserRole(sessionResult.data.role)
                setCurrentUserId(sessionResult.data.id)
            }

            // Fetch users
            const usersResponse = await fetch('/api/users')
            const usersResult = await usersResponse.json()
            if (usersResult.success) {
                setUsers(usersResult.data)
            } else {
                setError(usersResult.error)
            }
        } catch (err) {
            setError('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSessionAndUsers()
    }, [])

    const openCreateModal = () => {
        setEditingUser(null)
        reset({
            username: '',
            password: '',
            full_name: '',
            role: 'customer_success',
        })
        setIsModalOpen(true)
    }

    const openEditModal = (user: UserType) => {
        setEditingUser(user)
        reset({
            username: user.username,
            password: '',
            full_name: user.full_name,
            role: user.role,
        })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingUser(null)
        reset()
    }

    const onSubmit = async (data: UserFormData) => {
        setIsSubmitting(true)
        setError(null)

        try {
            const url = '/api/users'
            const method = editingUser ? 'PATCH' : 'POST'

            // Don't send empty password on edit
            const payload = editingUser
                ? { id: editingUser.id, ...data, password: data.password || undefined }
                : data

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()
            if (result.success) {
                fetchSessionAndUsers()
                closeModal()
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to save user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleActive = async (user: UserType) => {
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
            })

            const result = await response.json()
            if (result.success) {
                setUsers(users.map((u) => (u.id === user.id ? result.data : u)))
            }
        } catch (err) {
            setError('Failed to update user')
        }
    }

    const deleteUser = async (user: UserType) => {
        if (!window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/users?id=${user.id}`, {
                method: 'DELETE',
            })

            const result = await response.json()
            if (result.success) {
                setUsers(users.filter((u) => u.id !== user.id))
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Failed to delete user')
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Create and manage user accounts
                    </p>
                </div>
                <Button onClick={openCreateModal} leftIcon={<Plus size={18} />}>
                    Add User
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

            {/* Users List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>{users.length} users registered</CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            No users found. Click "Add User" to create the first one.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {users.map((user) => {
                                    const isPrivileged = ['admin', 'manager'].includes(user.role)
                                    const canManage = currentUserRole === 'admin' || (currentUserRole === 'manager' && !isPrivileged)

                                    return (
                                        <motion.div
                                            key={user.id}
                                            layout
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className={`flex items-center gap-4 p-4 rounded-lg border ${user.is_active
                                                ? 'bg-white border-[var(--border-light)]'
                                                : 'bg-[var(--gray-50)] border-[var(--border-light)] opacity-60'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center">
                                                <User size={18} className="text-white" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-[var(--text-primary)]">{user.full_name}</h4>
                                                    <Badge color={getRoleBadgeColor(user.role)} size="sm">
                                                        {user.role.replace('_', ' ')}
                                                    </Badge>
                                                    {!user.is_active && (
                                                        <span className="text-xs text-[var(--text-muted)]">(Inactive)</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)]">@{user.username}</p>
                                            </div>

                                            {canManage && (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleActive(user)}
                                                        className="text-xs"
                                                        disabled={user.id === currentUserId && currentUserRole === 'admin'}
                                                        title={user.id === currentUserId && currentUserRole === 'admin' ? "Admins cannot deactivate their own account" : undefined}
                                                    >
                                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
                                                        <Edit2 size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteUser(user)}
                                                        className="text-[var(--error-600)] hover:bg-[var(--error-50)]"
                                                        disabled={
                                                            (currentUserRole === 'admin' && user.role === 'admin') ||
                                                            (currentUserRole === 'manager' && ['admin', 'manager'].includes(user.role))
                                                        }
                                                        title={
                                                            (currentUserRole === 'admin' && user.role === 'admin')
                                                                ? "Admins cannot delete themselves or other admins"
                                                                : (currentUserRole === 'manager' && ['admin', 'manager'].includes(user.role))
                                                                    ? "Managers cannot delete privileged users"
                                                                    : "Delete user"
                                                        }
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingUser ? 'Edit User' : 'Create User'}
                description={editingUser ? 'Update user details' : 'Create a new user account'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Full Name"
                        placeholder="e.g., John Doe"
                        {...register('full_name')}
                        error={errors.full_name?.message}
                    />

                    <Input
                        label="Username"
                        placeholder="e.g., johndoe"
                        {...register('username')}
                        error={errors.username?.message}
                        disabled={!!editingUser}
                    />

                    <Input
                        label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                        type="password"
                        placeholder={editingUser ? '••••••••' : 'Enter password'}
                        {...register('password')}
                        error={errors.password?.message}
                        required={!editingUser}
                    />

                    <Select
                        label="Role"
                        options={currentUserRole === 'admin'
                            ? roleOptions
                            : roleOptions.filter((opt) => !['admin', 'manager'].includes(opt.value))
                        }
                        {...register('role')}
                        error={errors.role?.message}
                        disabled={editingUser?.id === currentUserId && currentUserRole === 'admin'}
                    />

                    <ModalFooter>
                        <Button variant="secondary" onClick={closeModal} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {editingUser ? 'Save Changes' : 'Create User'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    )
}
