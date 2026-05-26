import {
    workingDaysBetween,
    calendarDaysBetween,
    tatBand,
    queueBand,
    stageVerdict,
    generateInterpretation,
    type TATRow,
    type QueueRow,
} from '@/lib/tat-calculations'

// Helper: create a date from a YYYY-MM-DD string
const d = (s: string) => new Date(s)

// ─────────────────────────────────────────────────────────────────
// workingDaysBetween
// Working days = Mon–Sat. Sunday (0) is excluded.
// ─────────────────────────────────────────────────────────────────
describe('workingDaysBetween', () => {
    it('same day = 0', () => {
        expect(workingDaysBetween(d('2026-05-11'), d('2026-05-11'))).toBe(0)
    })

    it('Mon → Tue = 1 working day', () => {
        // 2026-05-11 is Monday, 2026-05-12 is Tuesday
        expect(workingDaysBetween(d('2026-05-11'), d('2026-05-12'))).toBe(1)
    })

    it('Mon → Sat = 5 working days', () => {
        expect(workingDaysBetween(d('2026-05-11'), d('2026-05-16'))).toBe(5)
    })

    it('Mon → Mon (next week) = 6 working days (Sat counted, Sun skipped)', () => {
        // Mon 11 → Mon 18: Tue,Wed,Thu,Fri,Sat,Mon = 6 (Sun skipped)
        expect(workingDaysBetween(d('2026-05-11'), d('2026-05-18'))).toBe(6)
    })

    it('Sat → Mon = 1 working day (Sunday skipped)', () => {
        // 2026-05-16 Sat → 2026-05-18 Mon: only Mon counts
        expect(workingDaysBetween(d('2026-05-16'), d('2026-05-18'))).toBe(1)
    })

    it('Fri → Mon = 2 working days (Sat counted, Sun skipped)', () => {
        // Fri 15 → Mon 18: Sat, Mon = 2
        expect(workingDaysBetween(d('2026-05-15'), d('2026-05-18'))).toBe(2)
    })

    it('end before start = 0', () => {
        expect(workingDaysBetween(d('2026-05-12'), d('2026-05-11'))).toBe(0)
    })

    it('8 working days from a Monday', () => {
        // Mon 11 May + 8 WD: Tue,Wed,Thu,Fri,Sat(5), Mon,Tue,Wed = 8 → 2026-05-20 (Wed)
        expect(workingDaysBetween(d('2026-05-11'), d('2026-05-20'))).toBe(8)
    })

    it('spans multiple weeks correctly', () => {
        // 2026-04-01 (Wed) → 2026-05-01 (Fri) = 30 calendar days
        // Weeks spanned: 4 full weeks + partial
        // 4 full weeks × 6 WD = 24, + remaining days
        const result = workingDaysBetween(d('2026-04-01'), d('2026-05-01'))
        // Manual count: Apr has 30 days. Apr1(W)→Apr30(Th) = 29 days.
        // Then May1(F) = 1 more. Total: Apr2-Apr30 + May1 = 30 days checked.
        // Sundays in range: Apr5,12,19,26 = 4 Sundays → 30 - 4 = 26
        expect(result).toBe(26)
    })
})

// ─────────────────────────────────────────────────────────────────
// calendarDaysBetween
// ─────────────────────────────────────────────────────────────────
describe('calendarDaysBetween', () => {
    it('same day = 0', () => {
        expect(calendarDaysBetween(d('2026-05-12'), d('2026-05-12'))).toBe(0)
    })

    it('1 day apart = 1', () => {
        expect(calendarDaysBetween(d('2026-05-11'), d('2026-05-12'))).toBe(1)
    })

    it('7 days apart = 7', () => {
        expect(calendarDaysBetween(d('2026-05-05'), d('2026-05-12'))).toBe(7)
    })

    it('end before start = 0', () => {
        expect(calendarDaysBetween(d('2026-05-12'), d('2026-05-11'))).toBe(0)
    })
})

// ─────────────────────────────────────────────────────────────────
// tatBand — boundary values
// ─────────────────────────────────────────────────────────────────
describe('tatBand', () => {
    it('0 WD → le8', () => expect(tatBand(0)).toBe('le8'))
    it('8 WD → le8 (boundary)', () => expect(tatBand(8)).toBe('le8'))
    it('9 WD → b9_10', () => expect(tatBand(9)).toBe('b9_10'))
    it('10 WD → b9_10 (boundary)', () => expect(tatBand(10)).toBe('b9_10'))
    it('11 WD → b11_12', () => expect(tatBand(11)).toBe('b11_12'))
    it('12 WD → b11_12 (boundary)', () => expect(tatBand(12)).toBe('b11_12'))
    it('13 WD → b13_15', () => expect(tatBand(13)).toBe('b13_15'))
    it('15 WD → b13_15 (boundary)', () => expect(tatBand(15)).toBe('b13_15'))
    it('16 WD → b16_20', () => expect(tatBand(16)).toBe('b16_20'))
    it('20 WD → b16_20 (boundary)', () => expect(tatBand(20)).toBe('b16_20'))
    it('21 WD → gt20', () => expect(tatBand(21)).toBe('gt20'))
    it('31 WD → gt20', () => expect(tatBand(31)).toBe('gt20'))
})

// ─────────────────────────────────────────────────────────────────
// queueBand — boundary values
// ─────────────────────────────────────────────────────────────────
describe('queueBand', () => {
    it('0 days → d1', () => expect(queueBand(0)).toBe('d1'))
    it('1 day → d1', () => expect(queueBand(1)).toBe('d1'))
    it('2 days → d2', () => expect(queueBand(2)).toBe('d2'))
    it('3 days → d3', () => expect(queueBand(3)).toBe('d3'))
    it('4 days → d4', () => expect(queueBand(4)).toBe('d4'))
    it('5 days → d5', () => expect(queueBand(5)).toBe('d5'))
    it('6 days → stale', () => expect(queueBand(6)).toBe('stale'))
    it('31 days → stale', () => expect(queueBand(31)).toBe('stale'))
})

// ─────────────────────────────────────────────────────────────────
// stageVerdict
// ─────────────────────────────────────────────────────────────────
describe('stageVerdict', () => {
    it('0 tickets → Empty', () => {
        expect(stageVerdict(0, 0, 0)).toBe('Empty')
    })

    it('all tickets arrived today → Same-day', () => {
        expect(stageVerdict(5, 0, 5)).toBe('Same-day')
    })

    it('no stale tickets → Healthy', () => {
        expect(stageVerdict(10, 0, 3)).toBe('Healthy')
    })

    it('40% stale → "40% stale"', () => {
        expect(stageVerdict(10, 4, 2)).toBe('40% stale')
    })

    it('43% stale (103 total, 44 stale) → "43% stale"', () => {
        // This is the exact scenario from the screenshot
        expect(stageVerdict(103, 44, 29)).toBe('43% stale')
    })

    it('some stale but under 40% → Team current', () => {
        expect(stageVerdict(10, 3, 2)).toBe('Team current')
    })
})

// ─────────────────────────────────────────────────────────────────
// generateInterpretation — integration-level
// ─────────────────────────────────────────────────────────────────
describe('generateInterpretation', () => {
    const makeTATDistribution = (overrides?: Partial<TATRow>): TATRow[] => [
        { stage: 'TOTAL', le8: 97, b9_10: 9, b11_12: 6, b13_15: 11, b16_20: 2, gt20: 1, total: 126, ...overrides },
        { stage: 'Assigned', le8: 12, b9_10: 0, b11_12: 0, b13_15: 0, b16_20: 0, gt20: 0, total: 12 },
        { stage: 'Sample Collected', le8: 7, b9_10: 0, b11_12: 0, b13_15: 0, b16_20: 0, gt20: 0, total: 7 },
        { stage: 'Sample Sent to', le8: 75, b9_10: 9, b11_12: 5, b13_15: 11, b16_20: 2, gt20: 1, total: 103 },
        { stage: 'Sample Received', le8: 0, b9_10: 0, b11_12: 0, b13_15: 0, b16_20: 0, gt20: 0, total: 0 },
        { stage: 'Final Report Gen.', le8: 0, b9_10: 0, b11_12: 1, b13_15: 0, b16_20: 0, gt20: 0, total: 1 },
        { stage: 'Report Received', le8: 3, b9_10: 0, b11_12: 0, b13_15: 2, b16_20: 1, gt20: 2, total: 8 },
    ]

    const makeQueueRows = (): QueueRow[] => [
        { stage: 'Assigned', total: 12, d1: 10, d2: 1, d3: 0, d4: 1, d5: 0, stale: 0, verdict: 'Healthy' },
        { stage: 'Sample Collected', total: 7, d1: 7, d2: 0, d3: 0, d4: 0, d5: 0, stale: 0, verdict: 'Same-day' },
        { stage: 'Sample Sent to', total: 103, d1: 29, d2: 0, d3: 21, d4: 9, d5: 0, stale: 44, verdict: '43% stale' },
        { stage: 'Sample Received', total: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, stale: 0, verdict: 'Empty' },
        { stage: 'Final Report Gen.', total: 1, d1: 1, d2: 0, d3: 0, d4: 0, d5: 0, stale: 0, verdict: 'Today' },
        { stage: 'Report Received', total: 8, d1: 3, d2: 3, d3: 0, d4: 1, d5: 0, stale: 1, verdict: 'Team current' },
    ]

    it('mentions on-track count', () => {
        const { tatSummary } = generateInterpretation(makeTATDistribution(), makeQueueRows(), [])
        expect(tatSummary[0]).toMatch('97 cases are on track')
    })

    it('identifies Sample Sent to as the bottleneck when it has the most OD cases', () => {
        const { tatSummary } = generateInterpretation(makeTATDistribution(), makeQueueRows(), [])
        const combined = tatSummary.join(' ')
        expect(combined).toMatch('Sample Sent to')
        expect(combined).toMatch('courier is the constraint')
    })

    it('all on-track → no bottleneck line', () => {
        const allOnTrack = makeTATDistribution({ le8: 131, b9_10: 0, b11_12: 0, b13_15: 0, b16_20: 0, gt20: 0, total: 131 })
        const { tatSummary } = generateInterpretation(allOnTrack, makeQueueRows(), [])
        expect(tatSummary).toHaveLength(2) // on-track line + "all within SLA" line
        expect(tatSummary[1]).toMatch('No action required')
    })

    it('names hospitals for >15WD cases', () => {
        const notableCases = [
            { uid: 'TKT-001', hospital: 'Khushi JP Nagar', wd: 31, stage: 'Report Received' },
            { uid: 'TKT-002', hospital: 'Sukrutha Tumkur', wd: 21, stage: 'Report Received' },
        ]
        const { tatSummary } = generateInterpretation(makeTATDistribution(), makeQueueRows(), notableCases)
        const combined = tatSummary.join(' ')
        expect(combined).toMatch('Khushi JP Nagar (31WD)')
        expect(combined).toMatch('Sukrutha Tumkur (21WD)')
    })

    it('queue: identifies courier as structural bottleneck at 43% stale', () => {
        const { queueSummary } = generateInterpretation(makeTATDistribution(), makeQueueRows(), [])
        expect(queueSummary[0]).toMatch('courier is the structural bottleneck')
        expect(queueSummary[0]).toMatch('43%')
    })

    it('queue: healthy when no stale tickets', () => {
        const healthyQueue = makeQueueRows().map(r => ({ ...r, stale: 0, verdict: 'Healthy' }))
        const { queueSummary } = generateInterpretation(makeTATDistribution(), healthyQueue, [])
        expect(queueSummary[0]).toMatch('Queue is healthy')
    })
})
