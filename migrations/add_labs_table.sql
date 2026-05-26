-- ============================================
-- LABS (DIAGNOSTICS CENTERS) TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create the labs table
CREATE TABLE IF NOT EXISTS labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);

-- Add sent_to_lab_id column to tickets if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'sent_to_lab_id') THEN
        ALTER TABLE tickets ADD COLUMN sent_to_lab_id UUID REFERENCES labs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Insert sample labs/diagnostics centers
INSERT INTO labs (name, address, city) VALUES
    ('Seragen Genomics Lab', 'Main Laboratory', 'Mumbai'),
    ('MedGenome Labs', 'Partner Lab', 'Bangalore'),
    ('Strand Life Sciences', 'Partner Lab', 'Hyderabad')
ON CONFLICT DO NOTHING;

-- Update the 'Sample Sent To' stage to require a modal with lab selection
UPDATE workflow_stages 
SET requires_modal = true, 
    modal_fields = '[{"id": "lab_id", "type": "system_dropdown", "label": "Diagnostics Center", "required": true, "source": "labs"}]'::jsonb
WHERE LOWER(name) = 'sample sent to';

-- Ensure all other stages record date/time (no additional fields needed)
-- The modal will always show date and time by default
