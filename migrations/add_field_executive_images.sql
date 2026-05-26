-- Migration: Add fields for Field Executive image uploads
-- These fields are required for the "Sample Collected" status change

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sample_image_url TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS courier_image_url TEXT;

-- Update comments for clarity
COMMENT ON COLUMN tickets.sample_image_url IS 'Image of the sample collected by the field executive';
COMMENT ON COLUMN tickets.courier_image_url IS 'Image of the courier details for the collected sample';
