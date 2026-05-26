-- ============================================================================
-- DATABASE CLEANUP SCRIPT
-- ============================================================================
-- WARNING: This script deletes data! Run with caution.
-- USAGE:
-- 1. Review the sections below.
-- 2. Run in Supabase SQL Editor or via CLI.
-- ============================================================================

-- 1. DELETE TRANSACTIONAL DATA
-- ============================
-- Deleting tickets will CASCADE delete:
-- - ticket_comments
-- - ticket_custom_values
DELETE FROM tickets;

-- 2. DELETE USERS (EXCEPT ADMIN)
-- ==============================
-- This deletes all users EXCEPT the one with username 'admin'.
-- Adjust the WHERE clause if your admin has a different username/email.
DELETE FROM users 
WHERE username != 'admin';

-- 3. OPTIONAL: DELETE MASTER DATA
-- ===============================
-- Uncomment the following lines if you want to clear hospitals, doctors, and labs.
-- Note: 'doctors' depends on 'hospitals', so we delete doctors first.

-- DELETE FROM doctors;
-- DELETE FROM hospitals;
-- DELETE FROM labs;

-- 4. STORAGE CLEANUP (OPTIONAL)
-- =============================
-- To clean up files associated with deleted tickets, you can run:
-- DELETE FROM storage.objects WHERE bucket_id IN ('final-reports', 'trf-documents');
