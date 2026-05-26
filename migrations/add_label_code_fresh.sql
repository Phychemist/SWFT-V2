-- Add label_code column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS label_code VARCHAR(100);

-- Create index for label_code to support searching
CREATE INDEX IF NOT EXISTS idx_tickets_label_code ON tickets(label_code);

-- Update the searchable view to include the new column
-- We drop it first because PG doesn't allow OR REPLACE if column order/types changed significantly with t.*
DROP VIEW IF EXISTS tickets_search_view CASCADE;

CREATE VIEW tickets_search_view AS
SELECT 
    t.*,
    d.name as doctor_name,
    h.name as hospital_name,
    st.name as service_type_name
FROM tickets t
LEFT JOIN doctors d ON t.doctor_id = d.id
LEFT JOIN hospitals h ON t.hospital_id = h.id
LEFT JOIN service_types st ON t.service_type_id = st.id;

-- Re-grant permissions
GRANT SELECT ON tickets_search_view TO authenticated;
GRANT SELECT ON tickets_search_view TO service_role;
