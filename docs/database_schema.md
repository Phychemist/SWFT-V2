# Database Schema

This document describes the current application schema as defined by:

- `supabase/migrations/20260128053801_remote_schema.sql`
- `supabase/migrations/20260201155350_add_ticket_diagnostics.sql`
- `supabase/migrations/20260202100000_add_hospital_location_contact.sql`
- `supabase/migrations/20260416120000_enforce_ticket_stage_consistency.sql`
- `supabase/migrations/20260427120000_fix_therapeutics_stage_sync.sql`

Schema: `public`

## Overview

### Core entities

- `tickets`: main workflow record for action/query/info requests
- `ticket_diagnostics`: per-diagnostic tracking rows for diagnostic tickets
- `status_transitions`: ticket stage timeline
- `workflow_stages`: configurable pipeline stages
- `users`: internal application users
- `doctors`, `hospitals`, `labs`: reference/master data
- `service_types`: diagnostics/therapeutics offerings
- `ticket_comments`: comments on tickets
- `ticket_custom_values`: values for configurable custom columns
- `custom_columns`: configuration for dynamic/custom ticket columns
- `field_visibility`: configuration for UI field visibility

### High-level relationships

- `doctors.hospital_id -> hospitals.id`
- `tickets.doctor_id -> doctors.id`
- `tickets.hospital_id -> hospitals.id`
- `tickets.assigned_to -> users.id`
- `tickets.created_by -> users.id`
- `tickets.cancelled_by -> users.id`
- `tickets.current_stage_id -> workflow_stages.id`
- `tickets.service_type_id -> service_types.id`
- `tickets.sent_to_lab_id -> labs.id`
- `status_transitions.ticket_id -> tickets.id`
- `status_transitions.from_stage_id -> workflow_stages.id`
- `status_transitions.to_stage_id -> workflow_stages.id`
- `status_transitions.changed_by -> users.id`
- `ticket_comments.ticket_id -> tickets.id`
- `ticket_comments.created_by -> users.id`
- `ticket_custom_values.ticket_id -> tickets.id`
- `ticket_custom_values.column_id -> custom_columns.id`
- `ticket_diagnostics.ticket_id -> tickets.id`
- `ticket_diagnostics.service_type_id -> service_types.id`
- `ticket_diagnostics.sent_to_lab_id -> labs.id`

## Tables

## `custom_columns`

Purpose: defines configurable custom fields that can be attached to tickets.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `name` | `varchar(50)` | No |  | Internal column name |
| `display_name` | `varchar(100)` | No |  | UI label |
| `column_type` | `varchar(20)` | No |  | Check constrained |
| `options` | `jsonb` | Yes |  | Used for dropdown/tag options |
| `sort_order` | `integer` | No | `0` | Display ordering |
| `is_active` | `boolean` | Yes | `true` | Active flag |
| `created_at` | `timestamptz` | Yes | `now()` | Creation timestamp |

Constraints:

- Primary key: `custom_columns_pkey` on `id`
- Check: `column_type IN ('tag', 'text', 'date', 'number', 'dropdown')`

Indexes:

- `idx_custom_columns_order` on `sort_order`

RLS:

- Enabled

## `doctors`

Purpose: doctor master data linked to hospitals and tickets.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `name` | `varchar(200)` | No |  | Doctor name |
| `phone` | `varchar(20)` | Yes |  |  |
| `hospital_id` | `uuid` | Yes |  | FK to `hospitals.id` |
| `is_active` | `boolean` | Yes | `true` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |

Constraints:

- Primary key: `doctors_pkey` on `id`
- Foreign key: `hospital_id -> hospitals.id` (`ON DELETE SET NULL`)

Indexes:

- `idx_doctors_hospital` on `hospital_id`
- `idx_doctors_name` on `name`

RLS:

- Enabled

## `field_visibility`

Purpose: stores UI visibility settings for named fields.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `field_id` | `varchar(50)` | No |  | Primary key |
| `is_visible` | `boolean` | Yes | `true` |  |
| `updated_at` | `timestamptz` | Yes | `now()` |  |

Constraints:

- Primary key: `field_visibility_pkey` on `field_id`

RLS:

- Enabled

## `hospitals`

Purpose: hospital master data.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `name` | `varchar(200)` | No |  |  |
| `address` | `text` | Yes |  |  |
| `city` | `varchar(100)` | Yes |  |  |
| `is_active` | `boolean` | Yes | `true` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |
| `location` | `text` | Yes |  | Maps/location link |
| `contact` | `varchar(100)` | Yes |  | Contact details |

Constraints:

- Primary key: `hospitals_pkey` on `id`

Indexes:

- `idx_hospitals_city` on `city`
- `idx_hospitals_name` on `name`

RLS:

- Enabled

## `labs`

Purpose: lab master data used when samples are sent out.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `name` | `varchar(200)` | No |  |  |
| `is_active` | `boolean` | Yes | `true` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `address` | `text` | Yes |  |  |
| `city` | `varchar(100)` | Yes |  |  |

Constraints:

- Primary key: `labs_pkey` on `id`

RLS:

- Enabled

## `service_types`

Purpose: catalog of service offerings for diagnostics and therapeutics.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `category` | `varchar(20)` | No |  | Check constrained |
| `name` | `varchar(200)` | No |  |  |
| `kit` | `text` | Yes |  |  |
| `requirements` | `text` | Yes |  |  |
| `protocol` | `text` | Yes |  |  |
| `is_active` | `boolean` | Yes | `true` |  |
| `sort_order` | `integer` | Yes | `0` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |
| `patient_type` | `varchar(20)` | Yes | `'couple'` | Check constrained |

Constraints:

- Primary key: `service_types_pkey` on `id`
- Check: `category IN ('diagnostics', 'therapeutics')`
- Check: `patient_type IN ('couple', 'female_only', 'male_only')`

Indexes:

- `idx_service_types_active` on `is_active`
- `idx_service_types_category` on `category`
- `idx_service_types_sort` on `sort_order`

RLS:

- Enabled

## `status_transitions`

Purpose: immutable/semi-audit timeline of ticket stage changes.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `ticket_id` | `uuid` | No |  | FK to `tickets.id` |
| `from_stage_id` | `uuid` | Yes |  | FK to `workflow_stages.id` |
| `to_stage_id` | `uuid` | Yes |  | FK to `workflow_stages.id` |
| `transition_date` | `date` | No |  | Business date |
| `transition_time` | `time` | Yes |  | Business time |
| `field_data` | `jsonb` | Yes | `'{}'::jsonb` | Arbitrary metadata captured at transition |
| `changed_by` | `uuid` | Yes |  | FK to `users.id` |
| `created_at` | `timestamptz` | Yes | `now()` |  |

Constraints:

- Primary key: `status_transitions_pkey` on `id`
- Foreign key: `ticket_id -> tickets.id` (`ON DELETE CASCADE`)
- Foreign key: `from_stage_id -> workflow_stages.id` (`ON DELETE SET NULL`)
- Foreign key: `to_stage_id -> workflow_stages.id` (`ON DELETE SET NULL`)
- Foreign key: `changed_by -> users.id` (`ON DELETE SET NULL`)

Indexes:

- `idx_status_transitions_ticket` on `ticket_id`

RLS:

- Enabled

## `ticket_comments`

Purpose: freeform comments attached to tickets.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `ticket_id` | `uuid` | No |  | FK to `tickets.id` |
| `comment` | `text` | No |  |  |
| `created_by` | `uuid` | Yes |  | FK to `users.id` |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |

Constraints:

- Primary key: `ticket_comments_pkey` on `id`
- Foreign key: `ticket_id -> tickets.id` (`ON DELETE CASCADE`)
- Foreign key: `created_by -> users.id` (`ON DELETE SET NULL`)

Indexes:

- `idx_ticket_comments_created_at` on `created_at DESC`
- `idx_ticket_comments_ticket` on `ticket_id`

RLS:

- Enabled

## `ticket_custom_values`

Purpose: stores ticket-specific values for configured `custom_columns`.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `ticket_id` | `uuid` | No |  | FK to `tickets.id` |
| `column_id` | `uuid` | No |  | FK to `custom_columns.id` |
| `value` | `text` | Yes |  |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |

Constraints:

- Primary key: `ticket_custom_values_pkey` on `id`
- Unique: `(ticket_id, column_id)`
- Foreign key: `ticket_id -> tickets.id` (`ON DELETE CASCADE`)
- Foreign key: `column_id -> custom_columns.id` (`ON DELETE CASCADE`)

Indexes:

- `idx_ticket_custom_values_column` on `column_id`
- `idx_ticket_custom_values_ticket` on `ticket_id`

RLS:

- Enabled

## `ticket_diagnostics`

Purpose: per-service diagnostic tracking for a ticket. This is the detailed child table used when one ticket contains multiple diagnostic services.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `ticket_id` | `uuid` | No |  | FK to `tickets.id` |
| `service_type_id` | `uuid` | No |  | FK to `service_types.id` |
| `status` | `varchar(30)` | No | `'pending'` | Check constrained |
| `sample_image_url` | `text` | Yes |  | Field executive upload |
| `courier_image_url` | `text` | Yes |  | Field executive upload |
| `sample_received_at` | `timestamptz` | Yes |  |  |
| `label_code` | `varchar(100)` | Yes |  |  |
| `sent_to_lab_id` | `uuid` | Yes |  | FK to `labs.id` |
| `tagged_sample_image_url` | `text` | Yes |  |  |
| `backoffice_courier_image_url` | `text` | Yes |  |  |
| `raw_report_url` | `text` | Yes |  |  |
| `final_report_url` | `text` | Yes |  |  |
| `is_cancelled` | `boolean` | Yes | `false` |  |
| `cancelled_at` | `timestamptz` | Yes |  |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` |  |

Constraints:

- Primary key: `ticket_diagnostics_pkey` on `id`
- Foreign key: `ticket_id -> tickets.id` (`ON DELETE CASCADE`)
- Foreign key: `service_type_id -> service_types.id` (`ON DELETE RESTRICT`)
- Foreign key: `sent_to_lab_id -> labs.id` (`ON DELETE SET NULL`)
- Check: `status IN ('pending', 'sample_collected', 'sample_received', 'sent_to_lab', 'raw_report_received', 'final_report_generated')`
- Unique partial index: one active diagnostic per `(ticket_id, service_type_id)` where `is_cancelled = false`

Indexes:

- `idx_ticket_diagnostics_ticket_id` on `ticket_id`
- `idx_ticket_diagnostics_service_type_id` on `service_type_id`
- `idx_ticket_diagnostics_status` on `status`
- `idx_ticket_diagnostics_unique_service` on `(ticket_id, service_type_id)` where `is_cancelled = false`

RLS:

- Enabled
- Explicit policy present: `Allow service role full access`

## `tickets`

Purpose: the central workflow table for all ticket types.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `uid` | `varchar(20)` | No |  | Unique business identifier; auto-generated by trigger when null |
| `type` | `varchar(10)` | No |  | Check constrained |
| `original_message` | `text` | Yes |  |  |
| `doctor_id` | `uuid` | Yes |  | FK to `doctors.id` |
| `hospital_id` | `uuid` | Yes |  | FK to `hospitals.id` |
| `assigned_to` | `uuid` | Yes |  | FK to `users.id` |
| `current_stage_id` | `uuid` | Yes |  | FK to `workflow_stages.id` |
| `collection_location` | `varchar(20)` | Yes |  | Check constrained |
| `collection_address` | `text` | Yes |  |  |
| `created_by` | `uuid` | Yes |  | FK to `users.id` |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |
| `action_subtype` | `varchar(20)` | Yes |  | Check constrained |
| `patient_name` | `text` | Yes |  |  |
| `service_type_id` | `uuid` | Yes |  | Legacy/single-service link; FK to `service_types.id` |
| `patient_name_2` | `varchar(200)` | Yes |  |  |
| `patient_age_1` | `integer` | Yes |  | Check constrained to `0..150` |
| `patient_age_2` | `integer` | Yes |  | Check constrained to `0..150` |
| `status_new_at` | `timestamptz` | Yes | `now()` |  |
| `status_sample_collected_at` | `timestamptz` | Yes |  |  |
| `status_sample_received_at` | `timestamptz` | Yes |  |  |
| `status_sample_sent_at` | `timestamptz` | Yes |  |  |
| `sent_to_lab_id` | `uuid` | Yes |  | FK to `labs.id` |
| `status_report_received_at` | `timestamptz` | Yes |  |  |
| `status_report_submitted_at` | `timestamptz` | Yes |  |  |
| `status_analyzed_at` | `timestamptz` | Yes |  |  |
| `screenshot_url` | `text` | Yes |  |  |
| `trf_image_url` | `text` | Yes |  | Legacy single TRF image |
| `raw_report_url` | `text` | Yes |  |  |
| `final_report_url` | `text` | Yes |  |  |
| `status_final_report_generated_at` | `timestamptz` | Yes |  |  |
| `scheduled_date` | `date` | Yes |  |  |
| `scheduled_time` | `time` | Yes |  |  |
| `collection_date` | `date` | Yes |  |  |
| `collection_time` | `time` | Yes |  |  |
| `trf_image_urls` | `text[]` | Yes | `'{}'::text[]` | Multi-image support |
| `sample_image_url` | `text` | Yes |  |  |
| `courier_image_url` | `text` | Yes |  |  |
| `tagged_sample_image_url` | `text` | Yes |  |  |
| `backoffice_courier_image_url` | `text` | Yes |  |  |
| `query_category` | `varchar(20)` | Yes |  | Check constrained |
| `label_code` | `text` | Yes |  |  |
| `is_cancelled` | `boolean` | Yes | `false` |  |
| `cancelled_at` | `timestamptz` | Yes |  |  |
| `cancelled_by` | `uuid` | Yes |  | FK to `users.id` |
| `cancellation_reason` | `text` | Yes |  |  |

Constraints:

- Primary key: `tickets_pkey` on `id`
- Unique: `tickets_uid_key` on `uid`
- Foreign key: `doctor_id -> doctors.id` (`ON DELETE SET NULL`)
- Foreign key: `hospital_id -> hospitals.id` (`ON DELETE SET NULL`)
- Foreign key: `assigned_to -> users.id` (`ON DELETE SET NULL`)
- Foreign key: `created_by -> users.id` (`ON DELETE SET NULL`)
- Foreign key: `cancelled_by -> users.id` (`ON DELETE SET NULL`)
- Foreign key: `current_stage_id -> workflow_stages.id` (`ON DELETE SET NULL`)
- Foreign key: `service_type_id -> service_types.id` (`ON DELETE SET NULL`)
- Foreign key: `sent_to_lab_id -> labs.id` (`ON DELETE SET NULL`)
- Check: `type IN ('action', 'query', 'info')`
- Check: `action_subtype IN ('diagnostics', 'therapeutics')`
- Check: `collection_location IN ('hospital', 'home')`
- Check: `query_category IN ('report_related', 'scientific', 'billing_related', 'others')`
- Check: `patient_age_1 IS NULL OR patient_age_1 BETWEEN 0 AND 150`
- Check: `patient_age_2 IS NULL OR patient_age_2 BETWEEN 0 AND 150`

Indexes:

- `idx_tickets_assigned` on `assigned_to`
- `idx_tickets_cancelled` on `is_cancelled`
- `idx_tickets_created_at` on `created_at DESC`
- `idx_tickets_doctor` on `doctor_id`
- `idx_tickets_hospital` on `hospital_id`
- `idx_tickets_label_code` on `label_code`
- `idx_tickets_query_category` on `query_category`
- `idx_tickets_service_type` on `service_type_id`
- `idx_tickets_stage` on `current_stage_id`
- `idx_tickets_type` on `type`
- `idx_tickets_uid` on `uid`

RLS:

- Enabled

## `users`

Purpose: application user accounts and roles.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `username` | `varchar(50)` | No |  | Unique |
| `password_hash` | `varchar(255)` | No |  |  |
| `full_name` | `varchar(100)` | No |  |  |
| `role` | `varchar(20)` | No |  | Check constrained |
| `is_active` | `boolean` | Yes | `true` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `updated_at` | `timestamptz` | Yes | `now()` | Auto-maintained by trigger |

Constraints:

- Primary key: `users_pkey` on `id`
- Unique: `users_username_key` on `username`
- Check: `role IN ('admin', 'manager', 'customer_success', 'field_executive', 'officer_backoffice', 'scientist', 'accountant')`

Indexes:

- `idx_users_role` on `role`
- `idx_users_username` on `username`

RLS:

- Enabled

## `workflow_stages`

Purpose: configurable stage list for ticket progression.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `extensions.uuid_generate_v4()` | Primary key |
| `name` | `varchar(100)` | No |  |  |
| `color` | `varchar(7)` | No | `'#3b82f6'` | Hex color |
| `sort_order` | `integer` | No | `0` | Defines progression order |
| `is_active` | `boolean` | Yes | `true` |  |
| `created_at` | `timestamptz` | Yes | `now()` |  |
| `requires_modal` | `boolean` | Yes | `false` | Whether transition UI requires modal |
| `modal_fields` | `jsonb` | Yes | `'[]'::jsonb` | Modal field config |

Constraints:

- Primary key: `workflow_stages_pkey` on `id`

Indexes:

- `idx_workflow_stages_order` on `sort_order`

RLS:

- Enabled

## Views

## `tickets_search_view`

Purpose: flattened search/reporting view for tickets with joined doctor/hospital/service information.

Base columns:

- Includes all columns from `tickets` via `t.*`

Derived columns:

- `doctor_name`
- `hospital_name`
- `service_type_name`
  - Aggregates active `ticket_diagnostics -> service_types.name` with `string_agg(...)`
  - Falls back to `tickets.service_type_id -> service_types.name` when no diagnostic rows exist
- `diagnostic_label_codes`
  - Aggregates non-null active `ticket_diagnostics.label_code`

Join logic:

- `tickets` left join `doctors`
- `tickets` left join `hospitals`
- `tickets` left join `service_types`
- correlated subqueries into `ticket_diagnostics`

## Functions

## `generate_ticket_uid()`

Trigger function that auto-generates `tickets.uid` as:

`TKT-YYYYMMDD-####`

Behavior:

- Runs before insert when `NEW.uid IS NULL`
- Looks up the max sequence for the current day
- Stores a zero-padded 4-digit sequence number

## `update_updated_at_column()`

Shared trigger function that sets `NEW.updated_at = NOW()` before update.

## `reconcile_ticket_stage_from_transitions(p_ticket_id uuid)`

Consistency function that:

- finds the highest active stage ever recorded in `status_transitions`
- advances `tickets.current_stage_id` to match that stage if the ticket is behind
- updates stage-derived timestamps on `tickets`
- advances non-cancelled `ticket_diagnostics.status` when diagnostics are behind the ticket stage

## `trg_reconcile_ticket_stage_after_transition()`

Trigger wrapper that calls `reconcile_ticket_stage_from_transitions(...)` after transition inserts/updates/deletes.

## `trg_set_new_diagnostic_status_from_ticket_stage()`

Before-insert trigger function that initializes a new `ticket_diagnostics.status` from the parent ticket's current stage.

## Triggers

- `trigger_doctors_updated_at` before update on `doctors`
- `trigger_hospitals_updated_at` before update on `hospitals`
- `trigger_service_types_updated_at` before update on `service_types`
- `trigger_ticket_comments_updated_at` before update on `ticket_comments`
- `trigger_ticket_custom_values_updated_at` before update on `ticket_custom_values`
- `trigger_generate_ticket_uid` before insert on `tickets` when `uid` is null
- `trigger_tickets_updated_at` before update on `tickets`
- `trigger_users_updated_at` before update on `users`
- `trg_reconcile_ticket_stage_after_transition` after insert/update/delete on `status_transitions`
- `trg_set_new_diagnostic_status_from_ticket_stage` before insert on `ticket_diagnostics`

## Notes and caveats

- `tickets.service_type_id` still exists even though `ticket_diagnostics` now handles multi-diagnostic cases. It appears to act as a legacy single-service reference and fallback source for `tickets_search_view`.
- Most tables have RLS enabled, but the schema dump does not define detailed policies for every table in these migration files. The one explicit policy added in the later migrations is for `ticket_diagnostics`.
- The schema also includes grants for `anon`, `authenticated`, and `service_role`, but this document focuses on structural schema details rather than every grant statement.
