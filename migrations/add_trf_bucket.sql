-- Migration: Create TRF bucket and add trf_image_url column
-- Created: 2026-01-20
-- Purpose: Setup storage and database for Test Requisition Form (TRF) documents

-- 1. Create the storage bucket for TRF documents
-- This uses Supabase's storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('trf-documents', 'trf-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS (Row Level Security) for the bucket
-- Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'trf-documents' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload TRF"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'trf-documents' );

-- 3. Add trf_image_url column to tickets table if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS trf_image_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tickets.trf_image_url IS 'URL to Test Requisition Form (TRF) document stored in Supabase Storage (trf-documents bucket)';
