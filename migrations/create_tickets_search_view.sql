-- Migration: Create a view for searchable tickets to support cross-table search
-- This allows searching by patient names, hospital name, doctor name, and uid in one query

CREATE OR REPLACE VIEW tickets_search_view AS
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
