-- ============================================
-- Hide 'Assigned To' Column
-- ============================================

INSERT INTO field_visibility (field_id, is_visible)
VALUES ('assigned_to', false)
ON CONFLICT (field_id) 
DO UPDATE SET is_visible = false;
