-- ============================================
-- DATABASE MIGRATION: Add action_subtype and patient_name to tickets table
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add the new columns to the tickets table
ALTER TABLE tickets
ADD COLUMN action_subtype VARCHAR(20) CHECK (action_subtype IN ('diagnostics', 'therapeutics')),
ADD COLUMN patient_name TEXT;

-- Step 2: Add helpful comment to the columns
COMMENT ON COLUMN tickets.action_subtype IS 'Subtype for action tickets: diagnostics or therapeutics';
COMMENT ON COLUMN tickets.patient_name IS 'Patient name associated with the ticket (optional)';

-- Verification Query: Check that columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
AND column_name IN ('action_subtype', 'patient_name');
