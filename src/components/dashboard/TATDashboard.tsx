'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui'
import { RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface TATRow {
    stage: string
    le8: number
    b9_10: number
    b11_12: number
    b13_15: number
    b16_20: number
    gt20: number
    total: number
}

interface QueueRow {
    stage: string
    total: number
    d1: number
    d2: number
    d3: number
    d4: number
    d5: number
    stale: number
    verdict: string
}

interface NotableCase {
    uid: string
    hospital: string
    wd: number
    stage: string
}

interface Interpretation {
    tatSummary: string[]
    queueSummary: string[]
}

interface AuditRow {
    uid: string
    hospital: string
    stage: string
    baseDate: string
    baseDateType: 'collection' | 'collected_ts' | 'scheduled' | 'created'
    wd: number
    tatBand: string
    queueDays: number
    queueBand: string
}

interface TATData {
    tatDistribution: TATRow[]
    stageQueue: QueueRow[]
    notableCases: NotableCase[]
    interpretation: Interpretation
    auditRows: AuditRow[]
    generatedAt: string
    filterApplied: string
}


// ── TAT band helpers ──────────────────────────────────────────────

type TATBand = 'le8' | 'b9_10' | 'b11_12' | 'b13_15' | 'b16_20' | 'gt20'

const TAT_BANDS: { key: TATBand; label: string }[] = [
    { key: 'le8', label: '≤8 WD' },
    { key: 'b9_10', label: '9–10 WD' },
    { key: 'b11_12', label: '11–12 WD' },
    { key: 'b13_15', label: '13–15 WD' },
    { key: 'b16_20', label: '16–20 WD' },
    { key: 'gt20', label: '>20 WD' },
]

function tatBandVariant(band: TATBand): 'success' | 'warning' | 'error' | 'default' {
    if (band === 'le8') return 'success'
    if (band === 'b9_10') return 'warning'
    return 'error'
}

function tatCellStyle(band: TATBand, value: number): string {
    if (value === 0) return 'text-[var(--text-muted)]'
    if (band === 'le8') return 'text-[var(--success-700)] font-semibold'
    if (band === 'b9_10') return 'text-[var(--warning-600)] font-semibold'
    if (band === 'b11_12') return 'text-orange-600 font-semibold'
    return 'text-[var(--error-700)] font-bold'
}

// ── Queue age helpers ─────────────────────────────────────────────

type QueueBand = 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'stale'

const QUEUE_BANDS: { key: QueueBand; label: string }[] = [
    { key: 'd1', label: '1d' },
    { key: 'd2', label: '2d' },
    { key: 'd3', label: '3d' },
    { key: 'd4', label: '4d' },
    { key: 'd5', label: '5d' },
    { key: 'stale', label: '>5d' },
]

function queueCellStyle(band: QueueBand, value: number): string {
    if (value === 0) return 'text-[var(--text-muted)]'
    if (band === 'stale') return 'text-[var(--error-700)] font-bold'
    if (band === 'd4' || band === 'd5') return 'text-[var(--warning-600)] font-semibold'
    return 'text-[var(--success-700)] font-semibold'
}

function VerdictBadge({ verdict }: { verdict: string }) {
    if (verdict === 'Empty') return <Badge variant="default">Empty</Badge>
    if (verdict === 'Same-day') return <Badge variant="success">✓ Same-day</Badge>
    if (verdict === 'Healthy') return <Badge variant="success">✓ Healthy</Badge>
    if (verdict === 'Team current') return <Badge variant="success">✓ Team current</Badge>
    if (verdict === 'Today') return <Badge variant="success">✓ Today</Badge>
    if (verdict.includes('stale')) return <Badge variant="error">⚠ {verdict}</Badge>
    return <Badge variant="warning">{verdict}</Badge>
}

// ── TAT Distribution Table ────────────────────────────────────────

function TATDistributionTable({ rows }: { rows: TATRow[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                    <tr>
                        <th className="py-3 pr-4 font-medium min-w-[160px]">Stage</th>
                        {TAT_BANDS.map(b => (
                            <th key={b.key} className="py-3 px-3 text-center font-medium whitespace-nowrap">
                                {b.label}
                            </th>
                        ))}
                        <th className="py-3 px-3 text-center font-medium">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                    {rows.map((row) => {
                        const isTotal = row.stage === 'TOTAL'
                        return (
                            <tr
                                key={row.stage}
                                className={`transition-colors ${isTotal
                                    ? 'bg-[var(--gray-50)] font-semibold'
                                    : 'hover:bg-[var(--gray-50)]'
                                    }`}
                            >
                                <td className={`py-3 pr-4 ${isTotal ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-primary)]'}`}>
                                    {row.stage}
                                </td>
                                {TAT_BANDS.map(b => (
                                    <td key={b.key} className={`py-3 px-3 text-center ${tatCellStyle(b.key, row[b.key])}`}>
                                        {row[b.key] === 0 ? '—' : row[b.key]}
                                    </td>
                                ))}
                                <td className={`py-3 px-3 text-center ${isTotal ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)] font-medium'}`}>
                                    {row.total === 0 ? '—' : row.total}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ── Stage Queue Table ─────────────────────────────────────────────

function StageQueueTable({ rows }: { rows: QueueRow[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                    <tr>
                        <th className="py-3 pr-4 font-medium min-w-[160px]">Stage</th>
                        <th className="py-3 px-3 text-center font-medium">Total</th>
                        {QUEUE_BANDS.map(b => (
                            <th
                                key={b.key}
                                className={`py-3 px-3 text-center font-medium ${b.key === 'stale' ? 'text-[var(--error-600)]' : ''}`}
                            >
                                {b.label}
                                {b.key === 'stale' && <span className="block text-[10px] font-normal opacity-70">Stale</span>}
                            </th>
                        ))}
                        <th className="py-3 px-3 text-center font-medium">Verdict</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                    {rows.map((row) => {
                        const isStaleRow = row.total > 0 && (row.stale / row.total) >= 0.3
                        return (
                            <tr
                                key={row.stage}
                                className={`transition-colors ${isStaleRow
                                    ? 'bg-[var(--error-50)] hover:bg-red-50'
                                    : 'hover:bg-[var(--gray-50)]'
                                    }`}
                            >
                                <td className={`py-3 pr-4 font-medium ${isStaleRow ? 'text-[var(--error-700)]' : 'text-[var(--text-primary)]'}`}>
                                    {row.stage}
                                </td>
                                <td className="py-3 px-3 text-center font-semibold text-[var(--text-primary)]">
                                    {row.total || '—'}
                                </td>
                                {QUEUE_BANDS.map(b => (
                                    <td key={b.key} className={`py-3 px-3 text-center ${queueCellStyle(b.key, row[b.key as keyof QueueRow] as number)}`}>
                                        {(row[b.key as keyof QueueRow] as number) === 0
                                            ? '—'
                                            : row[b.key as keyof QueueRow]}
                                    </td>
                                ))}
                                <td className="py-3 px-3 text-center">
                                    <VerdictBadge verdict={row.verdict} />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ── Legend ────────────────────────────────────────────────────────

function TATLegend() {
    const items = [
        { label: '≤8 WD — On track', variant: 'success' as const },
        { label: '9–10 WD — At risk', variant: 'warning' as const },
        { label: '>10 WD — Overdue', variant: 'error' as const },
    ]
    return (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--border-light)]">
            {items.map(i => (
                <Badge key={i.label} variant={i.variant} size="sm">{i.label}</Badge>
            ))}
            <span className="text-xs text-[var(--text-muted)] self-center ml-2">
                Working days = Mon–Sat. Base = pickup date, or scheduled date if not yet collected.
            </span>
        </div>
    )
}

// ── Audit Table ───────────────────────────────────────────────────

const TAT_BAND_LABELS: Record<string, string> = {
    le8: '≤8 WD ✅', b9_10: '9–10 WD 🟡', b11_12: '11–12 WD 🟠',
    b13_15: '13–15 WD 🔴', b16_20: '16–20 WD 🔴', gt20: '>20 WD 🔴',
}
const QUEUE_BAND_LABELS: Record<string, string> = {
    d1: '1d', d2: '2d', d3: '3d', d4: '4d', d5: '5d', stale: '>5d ⚠',
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
    const [open, setOpen] = useState(false)
    const [filter, setFilter] = useState('all')

    const stages = ['all', ...Array.from(new Set(rows.map(r => r.stage)))]
    const filtered = filter === 'all' ? rows : rows.filter(r => r.stage === filter)

    return (
        <Card>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--gray-50)] transition-colors rounded-xl"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Audit: Per-Ticket Breakdown</span>
                    <Badge variant="default" size="sm">{rows.length} tickets</Badge>
                </div>
                {open ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
            </button>

            {open && (
                <CardContent>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                        Every active ticket sorted by WD (highest first). Use this to spot-check calculations against tickets you know — verify the base date, WD count, and queue age.
                    </p>

                    {/* Stage filter */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {stages.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setFilter(s)}
                                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${filter === s
                                    ? 'bg-[var(--primary-50)] border-[var(--primary-200)] text-[var(--primary-700)] font-medium'
                                    : 'border-[var(--border-light)] text-[var(--text-muted)] hover:bg-[var(--gray-50)]'
                                    }`}
                            >
                                {s === 'all' ? `All (${rows.length})` : s}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                                <tr>
                                    <th className="py-2 pr-4 font-medium">Ticket</th>
                                    <th className="py-2 pr-4 font-medium">Hospital</th>
                                    <th className="py-2 pr-4 font-medium">Stage</th>
                                    <th className="py-2 pr-4 font-medium whitespace-nowrap">Base Date</th>
                                    <th className="py-2 pr-4 font-medium">Type</th>
                                    <th className="py-2 pr-4 font-medium text-center">WD</th>
                                    <th className="py-2 pr-4 font-medium">TAT Band</th>
                                    <th className="py-2 pr-4 font-medium text-center">Queue Days</th>
                                    <th className="py-2 font-medium">Queue Band</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]">
                                {filtered.map((row) => {
                                    const isOD = row.wd > 10
                                    const isStale = row.queueBand === 'stale'
                                    return (
                                        <tr
                                            key={row.uid}
                                            className={`transition-colors ${isOD || isStale ? 'bg-[var(--error-50)] hover:bg-red-50' : 'hover:bg-[var(--gray-50)]'}`}
                                        >
                                            <td className="py-2 pr-4 font-mono text-xs text-[var(--primary-600)] font-semibold">{row.uid}</td>
                                            <td className="py-2 pr-4 text-[var(--text-primary)] max-w-[160px] truncate">{row.hospital}</td>
                                            <td className="py-2 pr-4 text-[var(--text-secondary)] whitespace-nowrap">{row.stage}</td>
                                            <td className="py-2 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                                                {row.baseDate ? new Date(row.baseDate).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                            <td className="py-2 pr-4">
                                                {row.baseDateType === 'collection' && <Badge variant="success" size="sm">Pickup</Badge>}
                                                {row.baseDateType === 'collected_ts' && <Badge variant="info" size="sm">Collected TS</Badge>}
                                                {row.baseDateType === 'scheduled' && <Badge variant="warning" size="sm">Scheduled</Badge>}
                                                {row.baseDateType === 'created' && <Badge variant="error" size="sm">Created (no pickup)</Badge>}
                                            </td>
                                            <td className={`py-2 pr-4 text-center font-bold ${isOD ? 'text-[var(--error-700)]' : 'text-[var(--success-700)]'}`}>
                                                {row.wd}
                                            </td>
                                            <td className="py-2 pr-4 text-xs whitespace-nowrap">
                                                {TAT_BAND_LABELS[row.tatBand] ?? row.tatBand}
                                            </td>
                                            <td className={`py-2 pr-4 text-center font-semibold ${isStale ? 'text-[var(--error-700)]' : 'text-[var(--text-secondary)]'}`}>
                                                {row.queueDays}
                                            </td>
                                            <td className="py-2 text-xs">
                                                {QUEUE_BAND_LABELS[row.queueBand] ?? row.queueBand}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-6 text-center text-[var(--text-muted)]">No tickets for this stage.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}

// ── Interpretation Panel ──────────────────────────────────────────

function InterpretationPanel({
    title,
    points,
    variant,
}: {
    title: string
    points: string[]
    variant: 'primary' | 'warning'
}) {
    const colors = {
        primary: {
            border: 'border-[var(--primary-200)]',
            bg: 'bg-[var(--primary-50)]',
            dot: 'bg-[var(--primary-400)]',
            title: 'text-[var(--primary-700)]',
            text: 'text-[var(--text-primary)]',
        },
        warning: {
            border: 'border-[var(--warning-200)]',
            bg: 'bg-[var(--warning-50)]',
            dot: 'bg-[var(--warning-400)]',
            title: 'text-[var(--warning-700)]',
            text: 'text-[var(--text-primary)]',
        },
    }
    const c = colors[variant]

    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${c.title}`}>{title}</p>
            <ul className="space-y-2">
                {points.map((point, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                        <span className={c.text}>{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────

export function TATDashboard({ userRole }: { userRole?: string }) {
    const [data, setData] = useState<TATData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    // GET — load cached data (no API call to Claude)
    const loadCached = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/dashboard/tat', { cache: 'no-store' })
            const json = await res.json()
            if (json.success) {
                setData(json.data)
                setMessage(json.message || '')
            } else {
                setError(json.error || 'Failed to load TAT data')
            }
        } catch {
            setError('Network error — could not load TAT report')
        } finally {
            setLoading(false)
        }
    }, [])

    // POST — admin clicks Refresh → runs SQL + Claude analysis
    const refreshTAT = useCallback(async () => {
        setRefreshing(true)
        setError('')
        setMessage('')
        try {
            const res = await fetch('/api/dashboard/tat', { method: 'POST', cache: 'no-store' })
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                setError(json.error || 'Failed to generate TAT report')
            }
        } catch {
            setError('Network error — could not generate TAT report')
        } finally {
            setRefreshing(false)
        }
    }, [])

    // Load cached data on mount
    useEffect(() => { loadCached() }, [loadCached])

    const generatedDate = data?.generatedAt
        ? new Date(data.generatedAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : ''

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Section header — matches AdminAnalytics / CSAnalytics style */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">TAT Operations Report</h2>
                {userRole === 'admin' && (
                    <button
                        type="button"
                        onClick={refreshTAT}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-white border border-[var(--border-light)] hover:bg-[var(--gray-50)] text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Generating…' : 'Refresh'}
                    </button>
                )}
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-[var(--error-50)] text-[var(--error-700)] text-sm border border-[var(--error-100)]">
                    {error}
                </div>
            )}

            {refreshing && (
                <Card>
                    <CardContent className="flex items-center justify-center py-12 gap-3 text-[var(--text-muted)]">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-sm">Running SQL dump &amp; Claude analysis… this may take 15–30 seconds.</span>
                    </CardContent>
                </Card>
            )}

            {!data && !loading && !refreshing && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-muted)]">
                        <Clock size={24} />
                        <span className="text-sm">{message || 'Click Refresh to generate the TAT report.'}</span>
                    </CardContent>
                </Card>
            )}

            {data && !refreshing && (
                <>
                    {/* Table 1 — Pickup TAT Distribution */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock size={18} className="text-[var(--primary-500)]" />
                                    Pickup TAT Distribution
                                </CardTitle>
                                <CardDescription className="mt-0.5">{generatedDate} · Working-day TAT from pickup date by current stage · All active tickets</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <TATDistributionTable rows={data.tatDistribution} />
                            <TATLegend />
                        </CardContent>
                    </Card>

                    {/* Interpretation 1 */}
                    {data.interpretation.tatSummary.length > 0 && (
                        <InterpretationPanel
                            title={`Key Points — ${generatedDate}`}
                            points={data.interpretation.tatSummary}
                            variant="primary"
                        />
                    )}

                    {/* Table 2 — Stage Queue TAT */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock size={18} className="text-[var(--warning-500)]" />
                                    Stage Queue TAT
                                </CardTitle>
                                <CardDescription className="mt-0.5">{generatedDate} · Calendar days each ticket has been sitting in its current stage</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <StageQueueTable rows={data.stageQueue} />
                            <p className="text-xs text-[var(--text-muted)] mt-4 pt-4 border-t border-[var(--border-light)]">
                                Queue age = calendar days since the ticket entered its current stage. &gt;5 days = stale. Rows highlighted in red have ≥30% stale tickets.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Interpretation 2 */}
                    {data.interpretation.queueSummary.length > 0 && (
                        <InterpretationPanel
                            title={`Queue Analysis — ${generatedDate}`}
                            points={data.interpretation.queueSummary}
                            variant="warning"
                        />
                    )}

                    {/* Audit table — collapsible, for spot-checking */}
                    <AuditTable rows={data.auditRows} />
                </>
            )}
        </div>
    )
}
