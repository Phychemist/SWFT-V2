'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!result.success) {
                setError(result.error || 'Login failed')
                return
            }

            // Redirect based on role
            const userRole = result.data?.role
            if (userRole === 'officer_backoffice') {
                router.push('/backoffice')
            } else if (userRole === 'scientist') {
                router.push('/scientist')
            } else {
                router.push('/dashboard')
            }
            router.refresh()
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary-50)] via-white to-[var(--primary-100)] p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center justify-center mb-6"
                    >
                        <img src="/seragen_logo.png" alt="Seragen" className="h-24 w-auto" />
                    </motion.div>
                    <p className="text-[var(--text-secondary)] mt-2">Sign in to your account</p>
                </div>

                {/* Login Card */}
                <Card variant="elevated" padding="lg">
                    <CardContent>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20"
                            >
                                <AlertCircle className="w-5 h-5 text-[var(--error-600)] flex-shrink-0" />
                                <p className="text-sm text-[var(--error-600)]">{error}</p>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <Input
                                label="Username"
                                placeholder="Enter your username"
                                {...register('username')}
                                error={errors.username?.message}
                                autoComplete="username"
                            />

                            <Input
                                label="Password"
                                type="password"
                                placeholder="Enter your password"
                                {...register('password')}
                                error={errors.password?.message}
                                autoComplete="current-password"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                isLoading={isLoading}
                                leftIcon={!isLoading && <LogIn size={18} />}
                            >
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                    Contact your administrator for account access
                </p>
            </motion.div>
        </div>
    )
}
