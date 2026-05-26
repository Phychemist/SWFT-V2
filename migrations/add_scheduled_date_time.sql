-- Migration: Add scheduled pickup date and time to tickets table
-- Status: Mandatory for ticket creation

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Add comments for clarity
COMMENT ON COLUMN tickets.scheduled_date IS 'Mandatory date for sample pickup scheduled during ticket creation';
COMMENT ON COLUMN tickets.scheduled_time IS 'Mandatory time for sample pickup scheduled during ticket creation';
