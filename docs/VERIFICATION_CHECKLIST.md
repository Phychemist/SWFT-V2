# Cleanup Script Verification Checklist

After running `migrations/cleanup_all_test_data.sql`, use this checklist to verify everything is correct.

## ✅ Pre-Run Checks

Before running the script, verify:
- [ ] You have a user with username `'admin'` in the database
- [ ] You have workflow stages in the database (should have default stages)
- [ ] You have a backup (if this is production data)

## ✅ Post-Run Verification

### 1. Check Transaction Counts (Should be 0)

Run this query - all should return 0:
```sql
SELECT 
    'tickets' as table_name, COUNT(*) as count FROM tickets
UNION ALL SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL SELECT 'ticket_custom_values', COUNT(*) FROM ticket_custom_values
UNION ALL SELECT 'status_transitions', COUNT(*) FROM status_transitions
UNION ALL SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL SELECT 'doctors', COUNT(*) FROM doctors
UNION ALL SELECT 'labs', COUNT(*) FROM labs
UNION ALL SELECT 'service_types', COUNT(*) FROM service_types
UNION ALL SELECT 'custom_columns', COUNT(*) FROM custom_columns
UNION ALL SELECT 'field_visibility', COUNT(*) FROM field_visibility;
```

**Expected**: All counts should be `0`

### 2. Verify Admin User Exists (Should be 1)

```sql
SELECT id, username, full_name, role, is_active 
FROM users 
WHERE username = 'admin';
```

**Expected**: 
- Exactly 1 row
- `username = 'admin'`
- `role = 'admin'`
- `is_active = true` (or at least not false)

### 3. Verify Workflow Stages Exist (Should be 6+)

```sql
SELECT id, name, color, sort_order, is_active 
FROM workflow_stages 
ORDER BY sort_order;
```

**Expected**: 
- At least 6 rows (default stages: New, Assigned, In Progress, Sample Collected, Completed, Cancelled)
- All should have `is_active = true`
- Should have proper `sort_order` values (0, 1, 2, 3, 4, 5...)

### 4. Verify Storage Buckets Are Empty

```sql
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
```

**Expected**: 
- Either 0 rows (all buckets empty)
- Or all `file_count` values should be `0`

### 5. Verify Storage Buckets Still Exist

Go to Supabase Dashboard → Storage and verify these buckets exist:
- [ ] `ticket-screenshots` (bucket structure exists)
- [ ] `trf-documents` (bucket structure exists)
- [ ] `raw-reports` (bucket structure exists)
- [ ] `final-reports` (bucket structure exists)

**Note**: The buckets should exist, just empty of files.

### 6. Test Application Functionality

After cleanup, test these features:

- [ ] **Login**: Can log in with admin account
- [ ] **Create Ticket**: Can create a new ticket
- [ ] **View Tickets**: Ticket list loads (should be empty)
- [ ] **Workflow Stages**: Can see workflow stages in UI
- [ ] **Upload Screenshot**: Can upload a screenshot (tests storage bucket)
- [ ] **Upload TRF**: Can upload TRF document (tests storage bucket)

## ⚠️ Common Issues

### Issue: Script fails with "Admin user does not exist"
**Solution**: 
1. Check if admin user exists: `SELECT * FROM users WHERE username = 'admin';`
2. If it doesn't exist, create it first or modify the WHERE clause in the script
3. Admin user should have been created by the initial schema

### Issue: Workflow stages are missing
**Solution**:
1. Check: `SELECT * FROM workflow_stages;`
2. If empty, re-run the workflow stages insert from `supabase_schema.sql`:
```sql
INSERT INTO workflow_stages (name, color, sort_order) VALUES
    ('New', '#6b7280', 0),
    ('Assigned', '#3b82f6', 1),
    ('In Progress', '#f59e0b', 2),
    ('Sample Collected', '#8b5cf6', 3),
    ('Completed', '#10b981', 4),
    ('Cancelled', '#ef4444', 5);
```

### Issue: Storage buckets don't exist
**Solution**:
1. Go to Supabase Dashboard → Storage
2. Create the missing buckets manually, or
3. Re-run the migration files that create them:
   - `migrations/add_trf_bucket.sql`
   - `migrations/add_raw_report_feature.sql`
   - `migrations/add_final_report_feature.sql`
   - For `ticket-screenshots`, create it manually in the dashboard

### Issue: Foreign key constraint errors
**Solution**:
- This shouldn't happen with the script as written
- If it does, check the order of deletions matches the script
- All foreign keys use `ON DELETE SET NULL` or `ON DELETE CASCADE`, so order shouldn't matter after tickets are deleted

## 📊 Quick Verification Query

Run this single query to get a summary:

```sql
SELECT 
    '✅ CLEANUP VERIFICATION' as check_type,
    (SELECT COUNT(*) FROM users WHERE username = 'admin') as admin_exists,
    (SELECT COUNT(*) FROM workflow_stages) as workflow_stages_count,
    (SELECT COUNT(*) FROM tickets) as tickets_remaining,
    (SELECT COUNT(*) FROM hospitals) as hospitals_remaining,
    (SELECT COUNT(*) FROM doctors) as doctors_remaining,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id IN ('ticket-screenshots', 'trf-documents', 'raw-reports', 'final-reports')) as storage_files_remaining;
```

**Expected Results**:
- `admin_exists`: `1`
- `workflow_stages_count`: `6` or more
- `tickets_remaining`: `0`
- `hospitals_remaining`: `0`
- `doctors_remaining`: `0`
- `storage_files_remaining`: `0`

## ✅ Success Criteria

The cleanup is successful if:
1. ✅ Admin user exists and can log in
2. ✅ Workflow stages exist (6+ stages)
3. ✅ All transactional data is deleted (tickets, comments, etc.)
4. ✅ All master data is deleted (hospitals, doctors, labs, service types)
5. ✅ All storage files are deleted
6. ✅ Storage buckets still exist (structure intact)
7. ✅ Application can create new tickets
8. ✅ Application can upload files to storage buckets

If all checks pass, your database is clean and ready for fresh testing! 🎉
