-- Migration: Add ticket_diagnostics table for multiple diagnostics per ticket
-- This table stores per-diagnostic data (images, reports, label codes, lab assignments, status)

-- Create the ticket_diagnostics table
CREATE TABLE IF NOT EXISTS "public"."ticket_diagnostics" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "ticket_id" uuid NOT NULL,
    "service_type_id" uuid NOT NULL,

    -- Per-diagnostic status tracking
    "status" character varying(30) NOT NULL DEFAULT 'pending',

    -- Field executive uploads (per diagnostic)
    "sample_image_url" text,
    "courier_image_url" text,

    -- Backoffice fields (per diagnostic)
    "sample_received_at" timestamp with time zone,
    "label_code" character varying(100),
    "sent_to_lab_id" uuid,
    "tagged_sample_image_url" text,
    "backoffice_courier_image_url" text,

    -- Reports (per diagnostic)
    "raw_report_url" text,
    "final_report_url" text,

    -- Cancellation
    "is_cancelled" boolean DEFAULT false,
    "cancelled_at" timestamp with time zone,

    -- Timestamps
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "ticket_diagnostics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_diagnostics_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE,
    CONSTRAINT "ticket_diagnostics_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE RESTRICT,
    CONSTRAINT "ticket_diagnostics_sent_to_lab_id_fkey" FOREIGN KEY ("sent_to_lab_id") REFERENCES "public"."labs"("id") ON DELETE SET NULL,
    CONSTRAINT "ticket_diagnostics_status_check" CHECK ("status" IN ('pending', 'sample_collected', 'sample_received', 'sent_to_lab', 'raw_report_received', 'final_report_generated'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_diagnostics_ticket_id ON "public"."ticket_diagnostics"("ticket_id");
CREATE INDEX IF NOT EXISTS idx_ticket_diagnostics_service_type_id ON "public"."ticket_diagnostics"("service_type_id");
CREATE INDEX IF NOT EXISTS idx_ticket_diagnostics_status ON "public"."ticket_diagnostics"("status");

-- Prevent duplicate active service types per ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_diagnostics_unique_service
    ON "public"."ticket_diagnostics"("ticket_id", "service_type_id")
    WHERE "is_cancelled" = false;

-- Enable RLS
ALTER TABLE "public"."ticket_diagnostics" ENABLE ROW LEVEL SECURITY;

-- RLS policy: allow all operations for service_role (used by our API)
CREATE POLICY "Allow service role full access" ON "public"."ticket_diagnostics"
    FOR ALL USING (true) WITH CHECK (true);

-- Update the search view to aggregate diagnostic service type names
CREATE OR REPLACE VIEW tickets_search_view AS
SELECT
    t.*,
    d.name as doctor_name,
    h.name as hospital_name,
    COALESCE(
        (SELECT string_agg(st2.name, ', ' ORDER BY td.created_at)
         FROM ticket_diagnostics td
         JOIN service_types st2 ON td.service_type_id = st2.id
         WHERE td.ticket_id = t.id AND (td.is_cancelled = false OR td.is_cancelled IS NULL)),
        st.name
    ) as service_type_name
FROM tickets t
LEFT JOIN doctors d ON t.doctor_id = d.id
LEFT JOIN hospitals h ON t.hospital_id = h.id
LEFT JOIN service_types st ON t.service_type_id = st.id;

-- Grant access
GRANT ALL ON "public"."ticket_diagnostics" TO authenticated;
GRANT ALL ON "public"."ticket_diagnostics" TO service_role;
GRANT SELECT ON tickets_search_view TO authenticated;
GRANT SELECT ON tickets_search_view TO service_role;

-- Backfill: Create ticket_diagnostics rows for existing diagnostic tickets
INSERT INTO ticket_diagnostics (ticket_id, service_type_id, status, sample_image_url, courier_image_url,
    label_code, sent_to_lab_id, tagged_sample_image_url, backoffice_courier_image_url,
    raw_report_url, final_report_url, sample_received_at)
SELECT
    t.id, t.service_type_id,
    CASE
        WHEN ws.name ILIKE 'final report generated' THEN 'final_report_generated'
        WHEN ws.name ILIKE 'report received' THEN 'raw_report_received'
        WHEN ws.name ILIKE 'sample sent to' THEN 'sent_to_lab'
        WHEN ws.name ILIKE 'sample received' THEN 'sample_received'
        WHEN ws.name ILIKE 'sample collected' THEN 'sample_collected'
        ELSE 'pending'
    END,
    t.sample_image_url, t.courier_image_url,
    t.label_code, t.sent_to_lab_id, t.tagged_sample_image_url, t.backoffice_courier_image_url,
    t.raw_report_url, t.final_report_url, t.status_sample_received_at
FROM tickets t
LEFT JOIN workflow_stages ws ON t.current_stage_id = ws.id
WHERE t.action_subtype = 'diagnostics'
  AND t.service_type_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ticket_diagnostics td WHERE td.ticket_id = t.id AND td.service_type_id = t.service_type_id
  );
