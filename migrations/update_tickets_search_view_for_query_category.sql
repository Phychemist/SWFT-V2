-- Migration: Update tickets_search_view to include query_category
-- This ensures the view includes the newly added query_category column
-- We drop and recreate to avoid column renaming conflicts

-- Drop the existing view (if it exists)
-- Note: If there are dependent objects, you may need to drop them first
DROP VIEW IF EXISTS tickets_search_view;

-- Recreate the view with all current columns including query_category
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

-- Grant access to the view
GRANT SELECT ON tickets_search_view TO authenticated;
GRANT SELECT ON tickets_search_view TO service_role;
