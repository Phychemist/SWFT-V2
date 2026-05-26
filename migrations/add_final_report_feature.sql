-- Migration: Add Final Report feature for Scientists
-- Created: 2026-01-20
-- Purpose: Setup storage bucket and database column for Final Report documents

-- 1. Create the storage bucket for Final Report documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('final-reports', 'final-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure bucket is public if it already existed
UPDATE storage.buckets SET public = true WHERE id = 'final-reports';

-- 2. Set up RLS (Row Level Security) for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload Final Reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'final-reports' );

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read Final Reports"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'final-reports' );

-- 3. Add final_report_url column to tickets table if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS final_report_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tickets.final_report_url IS 'URL to Final Report document uploaded by scientist (final-reports bucket)';

-- 4. Add status_final_report_generated_at column for tracking
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS status_final_report_generated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tickets.status_final_report_generated_at IS 'Timestamp when scientist uploaded final report';

-- 5. Insert the "Final Report Generated" workflow stage
-- Note: This will be placed after "Report Received" in sort order
-- First, get the sort_order of "Report Received" stage
DO $$
DECLARE
    report_received_order INTEGER;
    new_stage_order INTEGER;
BEGIN
    -- Get the sort_order of "Report Received"
    SELECT sort_order INTO report_received_order
    FROM workflow_stages
    WHERE LOWER(name) = 'report received';

    -- Set new stage order (after Report Received)
    IF report_received_order IS NOT NULL THEN
        new_stage_order := report_received_order + 1;
        
        -- Shift existing stages that come after
        UPDATE workflow_stages
        SET sort_order = sort_order + 1
        WHERE sort_order >= new_stage_order;
    ELSE
        -- Fallback: place at the end
        SELECT COALESCE(MAX(sort_order), 0) + 1 INTO new_stage_order FROM workflow_stages;
    END IF;

    -- Insert the new stage (if it doesn't exist)
    INSERT INTO workflow_stages (name, color, sort_order, is_active, requires_modal)
    VALUES ('Final Report Generated', '#8b5cf6', new_stage_order, true, true)
    ON CONFLICT DO NOTHING;
END $$;
