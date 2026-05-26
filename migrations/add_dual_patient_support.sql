-- ============================================
-- ADD SECOND PATIENT AND AGE FIELDS
-- Support for husband/wife patient pairs
-- ============================================

-- Rename existing patient_name to patient_name_1 for clarity
-- Note: If you prefer to keep patient_name, skip this line
-- ALTER TABLE tickets RENAME COLUMN patient_name TO patient_name_1;

-- Add new columns for second patient and ages
ALTER TABLE tickets 
ADD COLUMN patient_name_2 VARCHAR(200),
ADD COLUMN patient_age_1 INTEGER,
ADD COLUMN patient_age_2 INTEGER;

-- Add constraints for reasonable age values
ALTER TABLE tickets 
ADD CONSTRAINT check_patient_age_1 CHECK (patient_age_1 IS NULL OR (patient_age_1 >= 0 AND patient_age_1 <= 150)),
ADD CONSTRAINT check_patient_age_2 CHECK (patient_age_2 IS NULL OR (patient_age_2 >= 0 AND patient_age_2 <= 150));
