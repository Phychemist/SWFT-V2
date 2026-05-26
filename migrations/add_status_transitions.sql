-- ============================================
-- STATUS TRANSITIONS TABLE (Safe to re-run)
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create the status_transitions table to track status changes
CREATE TABLE IF NOT EXISTS status_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES workflow_stages(id) ON DELETE SET NULL,
    to_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    transition_date DATE NOT NULL,
    transition_time TIME,
    field_data JSONB DEFAULT '{}',
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_status_transitions_ticket ON status_transitions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_to_stage ON status_transitions(to_stage_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_created ON status_transitions(created_at DESC);

-- Add requires_modal and modal_fields columns to workflow_stages if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_stages' AND column_name = 'requires_modal') THEN
        ALTER TABLE workflow_stages ADD COLUMN requires_modal BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_stages' AND column_name = 'modal_fields') THEN
        ALTER TABLE workflow_stages ADD COLUMN modal_fields JSONB DEFAULT '[]';
    END IF;
END $$;

-- Update the 'Assigned' stage to require a modal with field executive selection
UPDATE workflow_stages 
SET requires_modal = true, 
    modal_fields = '[{"id": "assigned_to", "type": "system_dropdown", "label": "Field Executive", "required": true, "source": "users"}]'::jsonb
WHERE LOWER(name) = 'assigned';
