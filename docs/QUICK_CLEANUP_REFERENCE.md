# Quick Cleanup Reference

## 🎯 One-Command Cleanup

Run this SQL script in Supabase SQL Editor:
```sql
-- File: migrations/cleanup_all_test_data.sql
```

## 📊 What Gets Deleted

| Category | Tables/Files | Safe to Delete? |
|----------|-------------|-----------------|
| **Tickets** | `tickets`, `ticket_comments`, `ticket_custom_values`, `status_transitions` | ✅ YES - All |
| **Users** | `users` (except admin) | ✅ YES - All except admin |
| **Master Data** | `hospitals`, `doctors`, `labs`, `service_types` | ✅ YES - All |
| **Config** | `custom_columns`, `field_visibility` | ✅ YES - All |
| **Storage** | Files in: `ticket-screenshots`, `trf-documents`, `raw-reports`, `final-reports` | ✅ YES - All files |
| **Workflow** | `workflow_stages` | ❌ NO - Keep data |
| **Static Files** | `public/templates/test_requisition_form.pdf` | ❌ NO - Keep file |

## ⚠️ Critical: DO NOT DELETE

1. **Admin user** (username: 'admin')
2. **Workflow stages** table and its data
3. **Table structures** (don't DROP tables)
4. **Storage bucket structures** (only delete files inside)
5. **PDF template** (`public/templates/test_requisition_form.pdf`)

## ✅ Verification After Cleanup

```sql
-- Should return 1 user (admin)
SELECT COUNT(*) FROM users;

-- Should return default workflow stages (6+ stages)
SELECT COUNT(*) FROM workflow_stages;

-- Should return 0 for all
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM hospitals;
SELECT COUNT(*) FROM doctors;
```

## 📁 Files Created

1. **`DATA_CLEANUP_GUIDE.md`** - Complete detailed guide
2. **`migrations/cleanup_all_test_data.sql`** - Ready-to-run SQL script
3. **`QUICK_CLEANUP_REFERENCE.md`** - This file (quick reference)
