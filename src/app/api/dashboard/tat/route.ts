import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Pool } from 'pg'
import {
    workingDaysBetween,
    calendarDaysBetween,
    tatBand,
    queueBand,
    stageVerdict,
    generateInterpretation,
    type TATRow,
    type QueueRow,
    type NotableCase,
} from '@/lib/tat-calculations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Postgres direct connection (for running the exact SQL dump) ──────────────
let pool: Pool | null = null

function getPool(): Pool {
    if (!pool) {
        const connStr = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL
        if (!connStr) {
            throw new Error('DATABASE_URL or SUPABASE_DB_URL is required for TAT')
        }
        pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, max: 2 })
    }
    return pool
}

// ── The exact SQL from the user's dump — no modifications ────────────────────
const TICKETS_DUMP_SQL = `
SELECT
    t.uid AS ticket_number,
    (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS creation_date,
    t.type AS ticket_type,
    COALESCE(t.action_subtype, 'query') AS service_category,
    COALESCE(
        (SELECT string_agg(st2.name, ', ' ORDER BY st2.name)
         FROM public.ticket_diagnostics td
         JOIN public.service_types st2 ON td.service_type_id = st2.id
         WHERE td.ticket_id = t.id AND COALESCE(td.is_cancelled, false) = false),
        st.name
    ) AS test_service_name,
    CASE
        WHEN COALESCE(t.is_cancelled, false) THEN 'Cancelled'
        WHEN ws.name ILIKE 'cancelleed' THEN 'Cancelled'
        ELSE ws.name
    END AS status,
    (CASE
        WHEN COALESCE(t.is_cancelled, false)
             OR ws.name ILIKE 'cancelled'
             OR ws.name ILIKE 'cancelleed' THEN
            COALESCE(
                t.cancelled_at,
                (SELECT stt.created_at
                 FROM public.status_transitions stt
                 INNER JOIN public.workflow_stages w_to ON stt.to_stage_id = w_to.id
                 WHERE stt.ticket_id = t.id
                   AND (w_to.name ILIKE 'cancelled' OR w_to.name ILIKE 'cancelleed')
                 ORDER BY stt.created_at DESC NULLS LAST
                 LIMIT 1),
                t.updated_at
            )
        WHEN ws.name ILIKE 'New' THEN t.status_new_at
        WHEN ws.name ILIKE 'Assigned' THEN t.status_new_at
        WHEN ws.name ILIKE 'Sample Collected' THEN t.status_sample_collected_at
        WHEN ws.name ILIKE 'Sample Received' THEN t.status_sample_received_at
        WHEN ws.name ILIKE 'Sample Sent To' THEN t.status_sample_sent_at
        WHEN ws.name ILIKE 'Analyzed' THEN t.status_analyzed_at
        WHEN ws.name ILIKE 'Report Received' THEN t.status_report_received_at
        WHEN ws.name ILIKE 'Final Report Generated' THEN t.status_final_report_generated_at
        WHEN ws.name ILIKE 'Report Submission' THEN t.status_report_submitted_at
        ELSE t.updated_at
    END AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS status_change_date,
    fe.full_name AS field_executive,
    t.scheduled_date,
    (t.status_sample_collected_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS actual_pickup_date,
    h.name AS hospital,
    COALESCE(
        (SELECT string_agg(l2.name, ', ' ORDER BY l2.name)
         FROM public.ticket_diagnostics td
         JOIN public.labs l2 ON td.sent_to_lab_id = l2.id
         WHERE td.ticket_id = t.id AND COALESCE(td.is_cancelled, false) = false),
        l.name
    ) AS labs,
    t.patient_name
FROM
    public.tickets t
LEFT JOIN public.workflow_stages ws ON t.current_stage_id = ws.id
LEFT JOIN public.users fe ON t.assigned_to = fe.id
LEFT JOIN public.hospitals h ON t.hospital_id = h.id
LEFT JOIN public.service_types st ON t.service_type_id = st.id
LEFT JOIN public.labs l ON t.sent_to_lab_id = l.id
WHERE
    COALESCE(t.is_cancelled, false) = false
    AND ws.name NOT ILIKE 'cancelled'
    AND ws.name NOT ILIKE 'cancelleed'
    AND ws.name NOT ILIKE 'Submitted and Closed'
    AND ws.name NOT ILIKE 'Report Submission'
ORDER BY t.created_at DESC
`

// ── Stage order for display ──────────────────────────────────────────────────
const ACTIVE_STAGES = [
    'Assigned',
    'Sample Collected',
    'Sample Sent to',
    'Sample Received',
    'Final Report Generated',
    'Report Received',
]

// ── Claude interpretation prompt (only for insights, not calculations) ───────
const INTERPRETATION_PROMPT = `You are an operations intelligence assistant for Seragen Biotherapeutics. Given the pre-computed TAT tables and notable cases below, write concise operational insights.

Return ONLY this JSON — no prose, no markdown:
{
  "tatSummary": ["insight 1", "insight 2", ...],
  "queueSummary": ["insight 1", "insight 2", ...]
}

Rules:
- tatSummary: 2-4 bullet points about TAT health, bottlenecks, urgent cases
- queueSummary: 2-3 bullet points about queue health per stage
- Be specific: name hospitals, ticket counts, working days
- Working days = Mon-Sat (Sunday excluded)
- On Track: ≤8 WD, At Risk: 9-10 WD, Overdue: >10 WD, SLA Breach: >15 WD, Critical: >20 WD

Stage owners:
- Assigned → Field Executive
- Sample Collected → Field Executive / Logistics
- Sample Sent to → Courier (Jeena Cold Chain)
- Sample Received → Laboratory
- Final Report Generated → Laboratory / QC
- Report Received → Quality / Counsellor`

// ── Ensure app_cache table exists ────────────────────────────────────────────
let tableEnsured = false

async function ensureCacheTable(pg: Pool) {
    if (tableEnsured) return
    await pg.query(`
        CREATE TABLE IF NOT EXISTS public.app_cache (
            key TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `)
    tableEnsured = true
}

// ── GET: return persisted result (no API call) ──────────────────────────────
export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        const pg = getPool()
        await ensureCacheTable(pg)

        const result = await pg.query(
            `SELECT data FROM public.app_cache WHERE key = 'tat_report'`
        )

        if (result.rows.length > 0) {
            return NextResponse.json({ success: true, data: result.rows[0].data })
        }

        return NextResponse.json({
            success: true,
            data: null,
            message: 'Click Refresh to generate the TAT report.',
        })

    } catch (err) {
        console.error('TAT GET error:', err)
        return NextResponse.json({ success: false, error: 'Failed to load TAT' }, { status: 500 })
    }
}

// ── POST: admin clicks Refresh → run SQL, compute locally, Claude for insights
export async function POST() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        if (session.role !== 'admin' && session.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        }

        // ── 1. Run the SQL dump ──────────────────────────────────────────────
        const pg = getPool()
        const { rows } = await pg.query(TICKETS_DUMP_SQL)
        console.log(`TAT: SQL returned ${rows.length} active tickets`)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // ── 2. Compute per-ticket metrics ────────────────────────────────────
        const auditRows: any[] = []

        for (const r of rows) {
            const stage = r.status ?? 'Unknown'
            const uid = r.ticket_number ?? ''
            const hospital = r.hospital ?? ''

            // Base date: pickup date > scheduled date > null
            let baseDate: Date | null = null
            let baseDateType: 'pickup' | 'scheduled' | 'none' = 'none'
            if (r.actual_pickup_date) {
                baseDate = new Date(r.actual_pickup_date)
                baseDateType = 'pickup'
            } else if (r.scheduled_date) {
                baseDate = new Date(r.scheduled_date)
                baseDateType = 'scheduled'
            }

            const wd = baseDate ? workingDaysBetween(baseDate, today) : 0
            const band = tatBand(wd)

            // Queue age: status_change_date to today
            let queueDays = 0
            if (r.status_change_date) {
                queueDays = calendarDaysBetween(new Date(r.status_change_date), today)
            }
            const qBand = queueBand(queueDays)

            auditRows.push({
                uid,
                hospital,
                stage,
                baseDate: baseDate ? baseDate.toISOString().split('T')[0] : null,
                baseDateType,
                wd,
                tatBand: band,
                queueDays,
                queueBand: qBand,
            })
        }

        // Sort by WD descending
        auditRows.sort((a, b) => b.wd - a.wd)

        // ── 3. Build TAT distribution table ──────────────────────────────────
        const emptyTATRow = (stage: string): TATRow => ({
            stage, le8: 0, b9_10: 0, b11_12: 0, b13_15: 0, b16_20: 0, gt20: 0, total: 0,
        })

        const tatByStage: Record<string, TATRow> = {}
        for (const s of ACTIVE_STAGES) tatByStage[s] = emptyTATRow(s)
        const totalRow = emptyTATRow('TOTAL')

        for (const row of auditRows) {
            const stage = ACTIVE_STAGES.includes(row.stage) ? row.stage : null
            const band = row.tatBand as keyof TATRow
            if (band in totalRow) {
                ;(totalRow[band] as number)++
                totalRow.total++
            }
            if (stage && tatByStage[stage] && band in tatByStage[stage]) {
                ;(tatByStage[stage][band] as number)++
                tatByStage[stage].total++
            }
        }

        const tatDistribution: TATRow[] = [
            totalRow,
            ...ACTIVE_STAGES.map(s => tatByStage[s]),
        ]

        // ── 4. Build stage queue table ───────────────────────────────────────
        const emptyQueueRow = (stage: string): QueueRow => ({
            stage, total: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, stale: 0, verdict: 'Empty',
        })

        const queueByStage: Record<string, QueueRow> = {}
        for (const s of ACTIVE_STAGES) queueByStage[s] = emptyQueueRow(s)

        for (const row of auditRows) {
            const stage = ACTIVE_STAGES.includes(row.stage) ? row.stage : null
            if (!stage || !queueByStage[stage]) continue
            const qr = queueByStage[stage]
            const band = row.queueBand as keyof QueueRow
            if (band in qr) {
                ;(qr[band] as number)++
                qr.total++
            }
        }

        const stageQueue: QueueRow[] = ACTIVE_STAGES.map(s => {
            const qr = queueByStage[s]
            qr.verdict = stageVerdict(qr.total, qr.stale, qr.d1)
            return qr
        })

        // ── 5. Notable cases (top 5 overdue >10 WD) ─────────────────────────
        const notableCases: NotableCase[] = auditRows
            .filter(r => r.wd > 10)
            .slice(0, 5)
            .map(r => ({ uid: r.uid, hospital: r.hospital, wd: r.wd, stage: r.stage }))

        // ── 6. Claude for interpretation only (small, fast) ──────────────────
        let interpretation = generateInterpretation(tatDistribution, stageQueue, notableCases)

        const anthropicKey = process.env.ANTHROPIC_API_KEY
        if (anthropicKey) {
            try {
                const Anthropic = (await import('@anthropic-ai/sdk')).default
                const anthropic = new Anthropic({ apiKey: anthropicKey })

                const summaryData = JSON.stringify({ tatDistribution, stageQueue, notableCases }, null, 2)
                const todayStr = today.toISOString().split('T')[0]

                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-6-20250619',
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `${INTERPRETATION_PROMPT}\n\nToday: ${todayStr}\nTotal active tickets: ${auditRows.length}\n\nPre-computed data:\n${summaryData}`,
                    }],
                })

                const textBlock = response.content.find(b => b.type === 'text')
                if (textBlock && textBlock.type === 'text') {
                    let jsonStr = textBlock.text.trim()
                    if (jsonStr.startsWith('```')) {
                        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
                    }
                    const parsed = JSON.parse(jsonStr)
                    if (parsed.tatSummary && parsed.queueSummary) {
                        interpretation = parsed
                    }
                }
                console.log('TAT: Claude interpretation done.')
            } catch (err) {
                console.warn('TAT: Claude interpretation failed, using local fallback:', err)
                // interpretation already set from generateInterpretation
            }
        }

        // ── 7. Persist to DB and return ─────────────────────────────────────
        const generatedAt = new Date().toISOString()
        const reportData = { tatDistribution, stageQueue, notableCases, interpretation, auditRows, generatedAt }

        await ensureCacheTable(pg)
        await pg.query(
            `INSERT INTO public.app_cache (key, data, updated_at)
             VALUES ('tat_report', $1::jsonb, NOW())
             ON CONFLICT (key) DO UPDATE SET data = $1::jsonb, updated_at = NOW()`,
            [JSON.stringify(reportData)]
        )

        console.log('TAT: analysis complete, persisted to DB.')
        return NextResponse.json({ success: true, data: reportData })

    } catch (err) {
        console.error('TAT POST error:', err)
        return NextResponse.json(
            { success: false, error: `Failed to generate TAT: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 },
        )
    }
}
