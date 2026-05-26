// Pure TAT calculation functions — no side effects, fully testable

export type TATBand = 'le8' | 'b9_10' | 'b11_12' | 'b13_15' | 'b16_20' | 'gt20'
export type QueueBand = 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'stale'

/**
 * Count working days (Mon–Sat, Sunday excluded) between two dates, inclusive of start,
 * exclusive of end. i.e. "how many working days has elapsed".
 *
 * Examples:
 *   Monday → Monday = 0 days elapsed
 *   Monday → Tuesday = 1 working day
 *   Saturday → Monday = 1 working day (Sunday skipped)
 */
export function workingDaysBetween(start: Date, end: Date): number {
    const s = new Date(start)
    const e = new Date(end)
    s.setHours(0, 0, 0, 0)
    e.setHours(0, 0, 0, 0)

    if (e <= s) return 0

    let count = 0
    const cur = new Date(s)
    // Move from day after start up to end (inclusive)
    cur.setDate(cur.getDate() + 1)
    while (cur <= e) {
        if (cur.getDay() !== 0) count++ // 0 = Sunday
        cur.setDate(cur.getDate() + 1)
    }
    return count
}

/**
 * Calendar days between two dates (floor). Used for queue age.
 */
export function calendarDaysBetween(start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime()
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

/**
 * Map a working-day count to its TAT band bucket.
 */
export function tatBand(wd: number): TATBand {
    if (wd <= 8) return 'le8'
    if (wd <= 10) return 'b9_10'
    if (wd <= 12) return 'b11_12'
    if (wd <= 15) return 'b13_15'
    if (wd <= 20) return 'b16_20'
    return 'gt20'
}

/**
 * Map a calendar-day queue age to its queue band bucket.
 */
export function queueBand(days: number): QueueBand {
    if (days <= 1) return 'd1'
    if (days <= 2) return 'd2'
    if (days <= 3) return 'd3'
    if (days <= 4) return 'd4'
    if (days <= 5) return 'd5'
    return 'stale'
}

/**
 * Generate a one-word verdict for a stage queue row.
 * stale = tickets sitting in the stage for >5 calendar days.
 */
export function stageVerdict(total: number, stale: number, d1: number): string {
    if (total === 0) return 'Empty'
    const stalePct = stale / total
    if (stalePct >= 0.4) return `${Math.round(stalePct * 100)}% stale`
    if (d1 === total) return 'Same-day'
    if (stale === 0) return 'Healthy'
    return 'Team current'
}

export interface TATRow {
    stage: string
    le8: number
    b9_10: number
    b11_12: number
    b13_15: number
    b16_20: number
    gt20: number
    total: number
}

export interface QueueRow {
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

export interface NotableCase {
    uid: string
    hospital: string
    wd: number
    stage: string
}

export interface Interpretation {
    tatSummary: string[]
    queueSummary: string[]
}

export function generateInterpretation(
    tatDistribution: TATRow[],
    stageQueue: QueueRow[],
    notableCases: NotableCase[],
): Interpretation {
    const tatSummary: string[] = []
    const queueSummary: string[] = []

    const total = tatDistribution.find(r => r.stage === 'TOTAL')

    if (total) {
        const onTrack = total.le8
        const od = total.total - total.le8

        tatSummary.push(`${onTrack} case${onTrack !== 1 ? 's' : ''} are on track (≤8 WD).`)

        if (od > 0) {
            const stageRows = tatDistribution.filter(r => r.stage !== 'TOTAL')
            const stageODCounts = stageRows
                .map(r => ({
                    stage: r.stage,
                    od: r.b9_10 + r.b11_12 + r.b13_15 + r.b16_20 + r.gt20
                }))
                .filter(x => x.od > 0)
                .sort((a, b) => b.od - a.od)

            const topStage = stageODCounts[0]
            if (topStage) {
                const bottleneckLabel = topStage.stage.toLowerCase().includes('sent')
                    ? 'the courier is the constraint for nearly every overdue case'
                    : topStage.stage.toLowerCase().includes('report received')
                        ? 'report release is the bottleneck'
                        : topStage.stage.toLowerCase().includes('assigned')
                            ? 'field collection is the bottleneck'
                            : `${topStage.stage} is the bottleneck`

                tatSummary.push(
                    `The ${od} case${od !== 1 ? 's' : ''} in the shaded columns (9WD+) are the ones to drive hard. ` +
                    `Critically, ${topStage.od} of those ${od} sit in ${topStage.stage}, meaning ${bottleneckLabel}.`
                )
            }

            const urgentCases = notableCases.filter(c => c.wd > 15)
            if (urgentCases.length > 0) {
                const caseList = urgentCases.slice(0, 3).map(c => `${c.hospital} (${c.wd}WD)`).join(' and ')
                const stagesInvolved = [...new Set(urgentCases.slice(0, 3).map(c => c.stage))].join(', ')
                tatSummary.push(
                    `${stagesInvolved} holds ${urgentCases.length} of the remaining OD case${urgentCases.length !== 1 ? 's' : ''}: ` +
                    `${caseList} — ${urgentCases.length === 1 ? 'needs' : 'need'} release today.`
                )
            }
        } else {
            tatSummary.push('All active cases are within the 8 WD SLA. No action required.')
        }
    }

    // Queue
    const staleStages = stageQueue
        .filter(r => r.stale > 0 && r.total > 0)
        .sort((a, b) => b.stale - a.stale)

    if (staleStages.length === 0) {
        queueSummary.push('All stages are processing within 5 days. Queue is healthy.')
    } else {
        const worst = staleStages[0]
        const pct = Math.round((worst.stale / worst.total) * 100)
        const ownerLabel = worst.stage.toLowerCase().includes('sent')
            ? 'courier is the structural bottleneck'
            : worst.stage.toLowerCase().includes('report received')
                ? 'report release team needs attention'
                : `${worst.stage} team needs attention`

        queueSummary.push(
            `${worst.stale} of ${worst.total} ${worst.stage.toLowerCase()} case${worst.total !== 1 ? 's' : ''} ` +
            `(${pct}%) sitting for >5 days — ${ownerLabel}.`
        )
    }

    const sameDayStages = stageQueue.filter(r => r.total > 0 && r.d1 >= r.total * 0.75 && r.stale === 0)
    if (sameDayStages.length > 0) {
        const s = sameDayStages[0]
        queueSummary.push(
            `${s.stage}: ${s.d1 + (s.d2 || 0)} of ${s.total} cases arrived today or yesterday — team is processing same-day.`
        )
    }

    const singleStaleCases = stageQueue.filter(r => r.stale === 1)
    if (singleStaleCases.length > 0) {
        const notableInStale = notableCases.find(c => singleStaleCases.some(s => s.stage === c.stage))
        if (notableInStale) {
            queueSummary.push(`1 stale ${notableInStale.stage} case (${notableInStale.wd}d queue) — release immediately.`)
        } else {
            queueSummary.push(`1 stale case in ${singleStaleCases[0].stage} — release immediately.`)
        }
    }

    return { tatSummary, queueSummary }
}
