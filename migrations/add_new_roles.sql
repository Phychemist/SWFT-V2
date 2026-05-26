-- ============================================
-- Migration: Add New Roles
-- Date: 2026-01-19
-- Description: Adds three new roles: officer_backoffice, scientist, accountant
-- ============================================

-- Drop the existing constraint on the role column
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with all roles including the three new ones
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'customer_success', 'field_executive', 'officer_backoffice', 'scientist', 'accountant'));

-- Note: After running this migration, managers and admins will be able to create users with:
-- - officer_backoffice: For backoffice operations
-- - scientist: For scientific/lab operations  
-- - accountant: For financial operations
