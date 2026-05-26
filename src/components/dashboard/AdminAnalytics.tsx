'use client'

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Activity, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'

// Colors matching the theme
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280']

interface DashboardData {
    activeCount: number
    todaysIntake: number
    completedCount: number
    volumeTrends: { date: string; count: number }[]
    topHospitals: { name: string; value: number }[]
    stageDistribution: { name: string; value: number }[]
}

export function AdminAnalytics({ data }: { data: DashboardData }) {
    if (!data) return null

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Business Intelligence</h2>

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

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Volume Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Ticket Volume Trend</CardTitle>
                        <CardDescription>Daily tickets created over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.volumeTrends}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Stage Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stage Distribution</CardTitle>
                        <CardDescription>Current status of active tickets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.stageDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.stageDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1">
                {/* Top Hospitals */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Hospitals by Volume</CardTitle>
                        <CardDescription>Hospitals generating the most tickets all-time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topHospitals} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                    <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={150} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
