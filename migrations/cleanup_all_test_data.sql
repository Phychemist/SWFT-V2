-- ============================================================================
-- COMPLETE DATA CLEANUP SCRIPT FOR TESTING
-- ============================================================================
-- WARNING: This deletes all data except essential configuration!
-- 
-- WHAT THIS DELETES:
-- ✅ All tickets (and related: comments, custom values, status transitions)
-- ✅ All users except admin
-- ✅ All hospitals, doctors, labs, service types
-- ✅ All custom columns and field visibility settings
-- ✅ All files in storage buckets
--
-- WHAT THIS KEEPS:
-- ✅ Admin user account (username: 'admin')
-- ✅ Workflow stages (required for app functionality)
-- ✅ Table structures (only deletes data, not tables)
-- ✅ Storage bucket structures (only deletes files)
--
-- USAGE:
-- 1. Review this script carefully
-- 2. Run in Supabase SQL Editor
-- 3. Verify results using the queries at the bottom
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DELETE TRANSACTIONAL DATA
-- ============================================================================
-- Explicitly delete dependent tables first to avoid FK constraints
DELETE FROM status_transitions;
DELETE FROM ticket_comments;
DELETE FROM ticket_custom_values;

-- Now safe to delete tickets
DELETE FROM tickets;

-- ============================================================================
-- 2. DELETE USERS (Keep Admin)
-- ============================================================================
-- Keep at least one admin user for login
-- Adjust the WHERE clause if your admin has a different username
-- Safety check: Verify admin exists before deletion
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        RAISE EXCEPTION 'Admin user (username: admin) does not exist! Cannot proceed with user deletion.';
    END IF;
END $$;

DELETE FROM users 
WHERE username != 'admin';

-- ============================================================================
-- 3. DELETE MASTER DATA
-- ============================================================================
-- Delete in this order due to foreign key constraints:
-- - doctors references hospitals (ON DELETE SET NULL)
-- - tickets reference doctors, hospitals, labs, service_types (ON DELETE SET NULL)
-- Note: Since tickets are already deleted, order doesn't matter for FK constraints,
-- but we keep this order for clarity and in case of any orphaned records
-- ============================================================================
DELETE FROM doctors;
DELETE FROM hospitals;
DELETE FROM labs;
DELETE FROM service_types;

-- ============================================================================
-- 4. DELETE CUSTOM CONFIGURATIONS
-- ============================================================================
-- These are user-created configurations that can be safely deleted
-- Note: custom_columns deletion will CASCADE delete any remaining 
-- ticket_custom_values (though they should already be deleted with tickets)
-- ============================================================================
DELETE FROM custom_columns;
DELETE FROM field_visibility;

-- ============================================================================
-- 5. DELETE STORAGE FILES
-- ============================================================================
-- Delete all files from storage buckets
-- Note: This only deletes files, not the bucket structures
-- The buckets themselves must remain for the app to function
-- ============================================================================
DELETE FROM storage.objects 
WHERE bucket_id IN (
    'ticket-screenshots',
    'trf-documents',
    'raw-reports',
    'final-reports'
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after cleanup to verify everything is clean
-- ============================================================================

-- Check counts (should all be 0 except users and workflow_stages)
SELECT 
    'tickets' as table_name, 
    COUNT(*) as record_count 
FROM tickets
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL
SELECT 'doctors', COUNT(*) FROM doctors
UNION ALL
SELECT 'labs', COUNT(*) FROM labs
UNION ALL
SELECT 'service_types', COUNT(*) FROM service_types
UNION ALL
SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL
SELECT 'ticket_custom_values', COUNT(*) FROM ticket_custom_values
UNION ALL
SELECT 'status_transitions', COUNT(*) FROM status_transitions
UNION ALL
SELECT 'custom_columns', COUNT(*) FROM custom_columns
UNION ALL
SELECT 'field_visibility', COUNT(*) FROM field_visibility
UNION ALL
SELECT 'workflow_stages', COUNT(*) FROM workflow_stages
ORDER BY table_name;

-- Verify admin user exists
SELECT 
    id, 
    username, 
    full_name, 
    role, 
    is_active 
FROM users 
WHERE username = 'admin';

-- Verify workflow stages exist (should have default stages)
SELECT 
    id, 
    name, 
    color, 
    sort_order, 
    is_active 
FROM workflow_stages 
ORDER BY sort_order;

-- Check storage file counts (should be 0)
SELECT 
    bucket_id, 
    COUNT(*) as file_count 
FROM storage.objects 
WHERE bucket_id IN (
    'ticket-screenshots',
    'trf-documents',
    'raw-reports',
    'final-reports'
)
GROUP BY bucket_id;

-- ============================================================================
-- FINAL VERIFICATION SUMMARY
-- ============================================================================
-- Expected results after cleanup:
-- - users: 1 (admin user)
-- - workflow_stages: 6+ (default stages)
-- - All other tables: 0 records
-- - Storage buckets: 0 files
-- ============================================================================
SELECT 
    '✅ CLEANUP COMPLETE' as status,
    (SELECT COUNT(*) FROM users) as admin_users_remaining,
    (SELECT COUNT(*) FROM workflow_stages) as workflow_stages_remaining,
    (SELECT COUNT(*) FROM tickets) as tickets_remaining,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id IN ('ticket-screenshots', 'trf-documents', 'raw-reports', 'final-reports')) as storage_files_remaining;
