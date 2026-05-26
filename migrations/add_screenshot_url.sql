-- Migration: Add screenshot_url column and make original_message optional
-- Created: 2026-01-19
-- Purpose: Store WhatsApp screenshot image URLs from Supabase Storage

-- Make original_message nullable (since screenshot can replace it)
ALTER TABLE tickets 
ALTER COLUMN original_message DROP NOT NULL;

-- Add screenshot_url column
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tickets.screenshot_url IS 'URL to WhatsApp screenshot stored in Supabase Storage (ticket-screenshots bucket)';

-- Note: Tickets can now have either screenshot_url OR original_message OR both
