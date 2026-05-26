# Data Cleanup Guide for Testing

This guide helps you safely delete data for testing without breaking application functionality.

## 📊 Complete Project Overview

### Database Tables

#### **Core Configuration Tables** (DO NOT DELETE - Required for App Functionality)
1. **`users`** - User accounts and authentication
   - **KEEP**: At least one admin user (username: 'admin')
   - **CAN DELETE**: All other users except admin
   
2. **`workflow_stages`** - Workflow stage definitions (New, Assigned, In Progress, etc.)
   - **DO NOT DELETE**: Required for ticket status management
   - Contains default stages that the app expects to exist
   
3. **`custom_columns`** - Dynamic column definitions for tickets
   - **CAN DELETE**: All custom columns (app will work without them)
   - **KEEP**: Table structure (don't drop the table)
   
4. **`field_visibility`** - Field visibility settings
   - **CAN DELETE**: All rows (app will use defaults)
   - **KEEP**: Table structure

#### **Master Data Tables** (CAN DELETE - But App Needs Some Data)
5. **`hospitals`** - Hospital/Clinic information
   - **CAN DELETE**: All hospitals
   - **NOTE**: App will work, but tickets won't have hospital references
   
6. **`doctors`** - Doctor information
   - **CAN DELETE**: All doctors
   - **NOTE**: App will work, but tickets won't have doctor references
   - **DEPENDENCY**: References hospitals (ON DELETE SET NULL)
   
7. **`labs`** - Diagnostics centers/labs
   - **CAN DELETE**: All labs
   - **NOTE**: App will work, but "Sample Sent To" stage won't have lab options
   - **DEPENDENCY**: Referenced by tickets.sent_to_lab_id (ON DELETE SET NULL)
   
8. **`service_types`** - Service type definitions (diagnostics/therapeutics)
   - **CAN DELETE**: All service types
   - **NOTE**: App will work, but tickets won't have service type references
   - **DEPENDENCY**: Referenced by tickets.service_type_id (ON DELETE SET NULL)

#### **Transactional Data Tables** (SAFE TO DELETE - This is Your Test Data)
9. **`tickets`** - Main ticket/workflow records
   - **SAFE TO DELETE**: All tickets
   - **CASCADE DELETES**: 
     - `ticket_custom_values` (ON DELETE CASCADE)
     - `ticket_comments` (ON DELETE CASCADE)
     - `status_transitions` (ON DELETE CASCADE)
   
10. **`ticket_custom_values`** - Custom field values for tickets
    - **AUTO DELETED**: When tickets are deleted (CASCADE)
    - **SAFE TO DELETE**: All rows manually if needed
   
11. **`ticket_comments`** - Comments on tickets
    - **AUTO DELETED**: When tickets are deleted (CASCADE)
    - **SAFE TO DELETE**: All rows manually if needed
   
12. **`status_transitions`** - History of status changes
    - **AUTO DELETED**: When tickets are deleted (CASCADE)
    - **SAFE TO DELETE**: All rows manually if needed

### Storage Buckets

#### **Supabase Storage Buckets** (SAFE TO DELETE FILES - Keep Buckets)
1. **`ticket-screenshots`** - WhatsApp screenshots
   - **SAFE TO DELETE**: All files in this bucket
   - **KEEP**: The bucket itself (don't delete the bucket)
   - **USED BY**: `tickets.screenshot_url` column
   
2. **`trf-documents`** - Test Requisition Form documents
   - **SAFE TO DELETE**: All files in this bucket
   - **KEEP**: The bucket itself
   - **USED BY**: `tickets.trf_image_url` column
   
3. **`raw-reports`** - Raw report documents
   - **SAFE TO DELETE**: All files in this bucket
   - **KEEP**: The bucket itself
   - **USED BY**: `tickets.raw_report_url` column
   
4. **`final-reports`** - Final report documents
   - **SAFE TO DELETE**: All files in this bucket
   - **KEEP**: The bucket itself
   - **USED BY**: `tickets.final_report_url` column

#### **Static Files** (DO NOT DELETE)
5. **`public/templates/test_requisition_form.pdf`**
   - **DO NOT DELETE**: This is a template file used by the app
   - Required for downloading TRF templates

---

## ✅ Safe Deletion Checklist

### Step 1: Delete Transactional Data (Tickets & Related)
```sql
-- This will CASCADE delete:
-- - ticket_custom_values
-- - ticket_comments  
-- - status_transitions
DELETE FROM tickets;
```

### Step 2: Delete Users (Keep Admin)
```sql
-- Keep at least one admin user
DELETE FROM users 
WHERE username != 'admin';
```

### Step 3: Delete Master Data (Optional)
```sql
-- Delete in this order due to foreign key constraints
DELETE FROM doctors;
DELETE FROM hospitals;
DELETE FROM labs;
DELETE FROM service_types;
```

### Step 4: Delete Custom Columns (Optional)
```sql
-- Delete custom column definitions
DELETE FROM custom_columns;

-- Delete custom field visibility settings
DELETE FROM field_visibility;
```

### Step 5: Clean Storage Buckets
**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Storage
2. For each bucket (`ticket-screenshots`, `trf-documents`, `raw-reports`, `final-reports`):
   - Open the bucket
   - Select all files
   - Click "Delete"

**Option B: Via SQL (if you have direct access)**
```sql
-- Delete all files from storage buckets
DELETE FROM storage.objects 
WHERE bucket_id IN (
    'ticket-screenshots',
    'trf-documents', 
    'raw-reports',
    'final-reports'
);
```

---

## ⚠️ DO NOT DELETE

### Database Tables (Structure)
- **DO NOT DROP** any tables - only delete data from them
- The app expects these tables to exist:
  - `users`
  - `workflow_stages`
  - `hospitals`
  - `doctors`
  - `labs`
  - `service_types`
  - `tickets`
  - `ticket_custom_values`
  - `ticket_comments`
  - `status_transitions`
  - `custom_columns`
  - `field_visibility`

### Database Data
- **DO NOT DELETE** all users - keep at least one admin user
- **DO NOT DELETE** workflow_stages - app needs default stages
- **DO NOT DELETE** the default workflow stages inserted in the schema

### Storage Buckets
- **DO NOT DELETE** the bucket structures themselves
- Only delete files within the buckets

### Static Files
- **DO NOT DELETE** `public/templates/test_requisition_form.pdf`

---

## 🚀 Complete Cleanup Script

Here's a complete SQL script you can run to safely clean all test data:

```sql
-- ============================================================================
-- COMPLETE DATA CLEANUP SCRIPT FOR TESTING
-- ============================================================================
-- WARNING: This deletes all data except essential configuration!
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. DELETE TRANSACTIONAL DATA (Cascades to related tables)
DELETE FROM tickets;

-- 2. DELETE USERS (Keep admin)
DELETE FROM users WHERE username != 'admin';

-- 3. DELETE MASTER DATA
DELETE FROM doctors;
DELETE FROM hospitals;
DELETE FROM labs;
DELETE FROM service_types;

-- 4. DELETE CUSTOM CONFIGURATIONS
DELETE FROM custom_columns;
DELETE FROM field_visibility;

-- 5. DELETE STORAGE FILES
DELETE FROM storage.objects 
WHERE bucket_id IN (
    'ticket-screenshots',
    'trf-documents',
    'raw-reports',
    'final-reports'
);

COMMIT;

-- Verify cleanup
SELECT 
    (SELECT COUNT(*) FROM tickets) as tickets_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM hospitals) as hospitals_count,
    (SELECT COUNT(*) FROM doctors) as doctors_count,
    (SELECT COUNT(*) FROM labs) as labs_count,
    (SELECT COUNT(*) FROM service_types) as service_types_count,
    (SELECT COUNT(*) FROM workflow_stages) as workflow_stages_count;
```

---

## 📝 Post-Cleanup Verification

After cleanup, verify:

1. **Admin user exists**: 
   ```sql
   SELECT * FROM users WHERE username = 'admin';
   ```

2. **Workflow stages exist** (should have default stages):
   ```sql
   SELECT * FROM workflow_stages ORDER BY sort_order;
   ```

3. **Storage buckets exist** (check in Supabase Dashboard → Storage)

4. **Tables are empty** (except users and workflow_stages):
   ```sql
   SELECT 
       'tickets' as table_name, COUNT(*) as count FROM tickets
   UNION ALL
   SELECT 'hospitals', COUNT(*) FROM hospitals
   UNION ALL
   SELECT 'doctors', COUNT(*) FROM doctors
   UNION ALL
   SELECT 'labs', COUNT(*) FROM labs;
   ```

---

## 🔄 Re-seeding Sample Data (Optional)

If you want to add sample data back for testing:

```sql
-- Sample hospitals
INSERT INTO hospitals (name, address, city) VALUES
    ('City General Hospital', '123 Main Street', 'Mumbai'),
    ('Apollo Healthcare', '456 Apollo Road', 'Delhi'),
    ('Fortis Medical Center', '789 Health Avenue', 'Bangalore');

-- Sample doctors
INSERT INTO doctors (name, phone, hospital_id) VALUES
    ('Dr. Rajesh Kumar', '+91 9876543210', (SELECT id FROM hospitals WHERE name = 'City General Hospital' LIMIT 1)),
    ('Dr. Priya Sharma', '+91 9876543211', (SELECT id FROM hospitals WHERE name = 'Apollo Healthcare' LIMIT 1)),
    ('Dr. Amit Singh', '+91 9876543212', (SELECT id FROM hospitals WHERE name = 'Fortis Medical Center' LIMIT 1));

-- Sample labs
INSERT INTO labs (name, address, city) VALUES
    ('Seragen Genomics Lab', 'Main Laboratory', 'Mumbai'),
    ('MedGenome Labs', 'Partner Lab', 'Bangalore'),
    ('Strand Life Sciences', 'Partner Lab', 'Hyderabad');
```

---

## 📋 Summary

### ✅ Safe to Delete:
- All tickets (and related: comments, custom values, status transitions)
- All users except admin
- All hospitals, doctors, labs, service types
- All custom columns and field visibility settings
- All files in storage buckets

### ❌ Do NOT Delete:
- Table structures (don't DROP tables)
- Admin user account
- Workflow stages table and its default data
- Storage bucket structures (only delete files)
- Static PDF template file

### 🎯 Quick Clean:
Run the complete cleanup script above, then verify admin user and workflow stages still exist.
