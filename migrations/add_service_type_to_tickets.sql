-- ============================================
-- ADD SERVICE TYPE TO TICKETS
-- Links tickets to specific service types (diagnostics/therapeutics)
-- ============================================

ALTER TABLE tickets
ADD COLUMN service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL;

CREATE INDEX idx_tickets_service_type ON tickets(service_type_id);