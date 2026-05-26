-- Migration: Create Raw Report bucket and add raw_report_url column
-- Created: 2026-01-20
-- Purpose: Setup storage and database for Raw Report documents

-- 1. Create the storage bucket for Raw Report documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw-reports', 'raw-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure bucket is public if it already existed
UPDATE storage.buckets SET public = true WHERE id = 'raw-reports';

-- 2. Set up RLS (Row Level Security) for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload Raw Reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'raw-reports' );

-- Allow authenticated users to read files
-- Note: Further restrictions based on role/ticket ownership should ideally be handled at the application layer 
-- or via more complex RLS if ticket association is stored in storage.objects.
CREATE POLICY "Authenticated users can read Raw Reports"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'raw-reports' );

-- 3. Add raw_report_url column to tickets table if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS raw_report_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tickets.raw_report_url IS 'URL to Raw Report document stored in Supabase Storage (raw-reports bucket)';
