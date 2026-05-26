-- Migration: Add cancelled status fields to tickets table
-- This adds a boolean is_cancelled flag plus metadata for cancellation tracking

-- Add cancelled status fields
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index for efficient filtering of cancelled tickets
CREATE INDEX IF NOT EXISTS idx_tickets_cancelled ON tickets(is_cancelled);

-- Add comments for documentation
COMMENT ON COLUMN tickets.is_cancelled IS 'Flag indicating if ticket has been cancelled (can be cancelled from any workflow stage)';
COMMENT ON COLUMN tickets.cancelled_at IS 'Timestamp when ticket was cancelled';
COMMENT ON COLUMN tickets.cancelled_by IS 'User ID of who cancelled the ticket';
COMMENT ON COLUMN tickets.cancellation_reason IS 'Reason provided for cancelling the ticket';
