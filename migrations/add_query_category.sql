-- Migration: Add query_category field to tickets table
-- This field categorizes query tickets into: report_related, scientific, billing_related, others

-- Add query_category column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS query_category VARCHAR(20) 
CHECK (query_category IN ('report_related', 'scientific', 'billing_related', 'others'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tickets_query_category ON tickets(query_category);

-- Add comment
COMMENT ON COLUMN tickets.query_category IS 'Category for query type tickets: report_related, scientific, billing_related, others';
