-- ============================================
-- ADD PATIENT TYPE TO SERVICE TYPES
-- Configures which patient fields to show in ticket form:
-- 'couple' = both male and female
-- 'female_only' = only female patient
-- 'male_only' = only male patient
-- ============================================

ALTER TABLE service_types 
ADD COLUMN IF NOT EXISTS patient_type VARCHAR(20) DEFAULT 'couple' 
CHECK (patient_type IN ('couple', 'female_only', 'male_only'));

-- Add a comment for documentation
COMMENT ON COLUMN service_types.patient_type IS 'Configures which patient fields to display: couple (both), female_only, or male_only';
