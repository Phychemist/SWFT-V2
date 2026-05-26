import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'

        // Calculate Start Date
        const now = new Date()
        let startDate: Date | null = null

        if (range === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (range === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        } else if (range === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        } else if (range === 'custom') {
            const from = searchParams.get('from')
            if (from) startDate = new Date(from)
        }

        const supabase = createServiceClient()

        // 1. Fetch Workflow Stages to map IDs
        const { data: stages } = await supabase
            .from('workflow_stages')
            .select('id, name')

        const stageMap = new Map(stages?.map(s => [s.name.toLowerCase().trim(), s.id]))
        const submittedAndClosedId = stageMap.get('submitted and closed')
        const cancelledStageId = stageMap.get('cancelled') || stageMap.get('cancelleed')

        // 2. Fetch Aggregated Ticket Data
        // Security: We allow all dashboard users to fetch stats.
        let query = supabase
            .from('tickets')
            .select(`
                id,
                created_at,
                updated_at,
                current_stage_id,
                hospital_id,
                is_cancelled,
                hospitals (name)
            `)
            .or(`is_cancelled.eq.false,is_cancelled.is.null${cancelledStageId ? `,current_stage_id.neq.${cancelledStageId}` : ''}`)

        // Apply Date Range Filter if set
        // Filter: Created in range OR Updated in range (to capture closures)
        if (startDate) {
            const isoStartDate = startDate.toISOString()
            const to = searchParams.get('to')

            if (range === 'custom' && to) {
                const isoEndDate = new Date(to).toISOString()
                query = query.gte('created_at', isoStartDate).lte('created_at', isoEndDate)
            } else {
                query = query.or(`created_at.gte.${isoStartDate},updated_at.gte.${isoStartDate}`)
            }
        }

        const { data: tickets, error } = await query

        if (error) throw error

        // 3. (New) Fetch Recent Activity for CS/Manager
        // Only fetch if role is appropriate, but for simplicity let's fetch for authorized dashboard users
        // Limit to 5
        const { data: recentTickets } = await supabase
            .from('tickets')
            .select(`
                id,
                uid,
                updated_at,
                current_stage_id,
                hospital_id,
                is_cancelled,
                hospitals (name)
            `)
            .or(`is_cancelled.eq.false,is_cancelled.is.null${cancelledStageId ? `,current_stage_id.neq.${cancelledStageId}` : ''}`)
            .order('updated_at', { ascending: false })
            .limit(5)

        // --- Basic Stats (For Everyone) ---
        const totalCount = tickets.length
        const completedCount = tickets.filter(t => t.current_stage_id === submittedAndClosedId).length

        // Active = All tickets NOT in the "Submitted and closed" stage
        // If submittedAndClosedId is undefined (stage missing), then ALL are active (safe fallback)
        const activeTickets = submittedAndClosedId
            ? tickets.filter(t => t.current_stage_id !== submittedAndClosedId)
            : tickets
        const activeCount = activeTickets.length

        // This matches the 'pending' concept in the old dashboard
        const pendingCount = activeCount

        const basicStats = {
            total: totalCount,
            pending: pendingCount,
            completed: completedCount
        }

        // Return early for non-admins if they shouldn't see deep analytics
        const isAdminOrManager = session.role === 'admin' || session.role === 'manager' || session.role === 'customer_success' // Allow CS to see extended stats now

        if (!isAdminOrManager) {
            return NextResponse.json({
                success: true,
                data: {
                    ...basicStats
                }
            })
        }

        // --- Advanced Analytics (Admin/Manager Only) ---

        // reused 'now' from above scope
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Backlog metric removed per user request

        // 3. Ticket Intake (in selected range)
        // Since 'tickets' is already filtered by range, this is just total count
        const rangeIntake = totalCount

        // 4. Completed Count (Passed directly)
        // logic removed as we pass completedCount directly

        // 5. Volume Trends (Dynamic based on range)
        const volumeTrends = []
        // Default to 7 days unless range is 30d
        const daysToShow = range === '30d' ? 30 : 7

        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            // Skip if before start date (loose check to avoid empty leading days if range is tighter)
            if (startDate && d < startDate && range !== 'today') continue;

            const dateStr = d.toISOString().split('T')[0] // YYYY-MM-DD

            // Count tickets created on this date
            const count = tickets.filter(t => t.created_at.startsWith(dateStr)).length

            volumeTrends.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count
            })
        }

        // 6. Top Hospitals
        const hospitalCounts = new Map<string, number>()
        tickets.forEach((t: any) => {
            // Handle Supabase relation which might return array or object depending on version/setup
            const hospitalData = t.hospitals
            const hospitalName = Array.isArray(hospitalData)
                ? hospitalData[0]?.name
                : hospitalData?.name

            if (hospitalName) {
                hospitalCounts.set(hospitalName, (hospitalCounts.get(hospitalName) || 0) + 1)
            }
        })

        const topHospitals = Array.from(hospitalCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }))

        // 7. Stage Distribution (Active only)
        const stageNameMap = new Map(stages?.map(s => [s.id, s.name]))
        const stageCounts = new Map<string, number>()

        activeTickets.forEach(t => {
            const name = stageNameMap.get(t.current_stage_id || '') || 'Unknown'
            stageCounts.set(name, (stageCounts.get(name) || 0) + 1)
        })

        const stageDistribution = Array.from(stageCounts.entries())
            .map(([name, value]) => ({ name, value }))

        return NextResponse.json({
            success: true,
            data: {
                ...basicStats,
                analytics: {
                    activeCount,
                    todaysIntake: rangeIntake, // Renamed in concept, kept key calculation
                    completedCount,
                    volumeTrends,
                    topHospitals,
                    stageDistribution,
                    recentActivity: recentTickets?.map((t: any) => ({
                        id: t.id,
                        uid: t.uid,
                        hospital: Array.isArray(t.hospitals) ? t.hospitals[0]?.name : t.hospitals?.name,
                        stage: stageNameMap.get(t.current_stage_id || '') || 'Unknown',
                        updated_at: t.updated_at
                    })) || []
                }
            }
        })

    } catch (error) {
        console.error('Dashboard Stats Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
    }
}
