'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Activity, Calendar, TrendingUp, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

interface RecentActivity {
    id: string
    uid: string
    hospital: string
    stage: string
    updated_at: string
}

interface DashboardData {
    activeCount: number
    todaysIntake: number
    completedCount: number
    recentActivity: RecentActivity[]
}

export function CSAnalytics({ data }: { data: DashboardData }) {
    if (!data) return null

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Operational Desk</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Ticket Intake</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{data.todaysIntake}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Total Active Tickets</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{data.activeCount}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Total Closed Tickets</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{data.completedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock size={20} className="text-[var(--primary-500)]" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>Last 5 tickets updated in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[var(--text-secondary)] border-b">
                                <tr>
                                    <th className="py-3 font-medium">Ticket ID</th>
                                    <th className="py-3 font-medium">Hospital</th>
                                    <th className="py-3 font-medium">Stage</th>
                                    <th className="py-3 font-medium text-right">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.recentActivity && data.recentActivity.length > 0 ? (
                                    data.recentActivity.map((ticket) => (
                                        <tr key={ticket.id} className="group hover:bg-[var(--gray-50)] transition-colors">
                                            <td className="py-3 font-medium text-[var(--primary-600)]">
                                                <Link href={`/dashboard/tickets/${ticket.id}`} className="hover:underline flex items-center gap-2">
                                                    <FileText size={16} />
                                                    {ticket.uid || ticket.id.slice(0, 8)}
                                                </Link>
                                            </td>
                                            <td className="py-3 text-[var(--text-primary)]">
                                                {ticket.hospital || 'N/A'}
                                            </td>
                                            <td className="py-3">
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {ticket.stage}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right text-[var(--text-secondary)]">
                                                {new Date(ticket.updated_at).toLocaleDateString()} {new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                                            No recent activity found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
