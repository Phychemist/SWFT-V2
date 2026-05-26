-- ============================================
-- SERVICE TYPES TABLE
-- For Diagnostics and Therapeutics service offerings
-- ============================================

CREATE TABLE service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(20) NOT NULL CHECK (category IN ('diagnostics', 'therapeutics')),
    name VARCHAR(200) NOT NULL,
    kit TEXT,                    -- Kit to carry
    requirements TEXT,           -- Requirements
    protocol TEXT,               -- Protocol instructions
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_service_types_category ON service_types(category);
CREATE INDEX idx_service_types_active ON service_types(is_active);
CREATE INDEX idx_service_types_sort ON service_types(sort_order);

-- Trigger for updated_at
CREATE TRIGGER trigger_service_types_updated_at
    BEFORE UPDATE ON service_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
