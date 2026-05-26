-- Migration: Add fields for Backoffice lab dispatch images
-- Created: 2026-01-XX
-- Purpose: Store images uploaded by backoffice when sending samples to lab

-- Add tagged_sample_image_url column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tagged_sample_image_url TEXT DEFAULT NULL;

-- Add backoffice_courier_image_url column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS backoffice_courier_image_url TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tickets.tagged_sample_image_url IS 'Image of the sample after tagging, uploaded by backoffice when sending to lab';
COMMENT ON COLUMN tickets.backoffice_courier_image_url IS 'Image of courier details, uploaded by backoffice when sending to lab';
