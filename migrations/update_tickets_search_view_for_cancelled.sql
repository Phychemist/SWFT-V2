-- Migration: Update tickets_search_view to include is_cancelled column
-- Run this AFTER add_cancelled_status.sql

-- Drop and recreate the view to pick up the new is_cancelled column
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
