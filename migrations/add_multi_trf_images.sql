-- Migration: Add multi-image support for TRF
-- This adds a trf_image_urls column to store multiple image paths/URLs

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS trf_image_urls TEXT[] DEFAULT '{}';

-- Optional: Copy existing single URL to the array if it exists
UPDATE tickets 
SET trf_image_urls = ARRAY[trf_image_url] 
WHERE trf_image_url IS NOT NULL AND (trf_image_urls IS NULL OR array_length(trf_image_urls, 1) IS NULL);
