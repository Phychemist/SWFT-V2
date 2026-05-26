# SWFT — Workflow & Logic Document
## New Modifications: Slices A–F | Developer Handoff Reference
**Project:** Seragen (SWFT) | **For:** Developer reading + AI-assisted implementation

---

## How to Use This Document

This document explains what is being built, why, and how everything connects — written as narrative workflows so any developer or AI can understand the complete scope of work before touching any code.

Read it in order. Each section builds on the previous one. The companion document **SWFT_Architecture_v3.md** contains the exact DB schemas, API specs, TypeScript types, and UI component specs. This document is the "what and why" — that document is the "how exactly."

---

## 1. What Already Exists

SWFT (Seragen Workflow Tracking) is a live Next.js 16 + Supabase system. It currently handles:

- **Tickets** — sample collection jobs assigned to Field Executives at hospitals
- **Field Executive dashboard** — FEs see their assigned tickets, update status, collect samples
- **Manager dashboard** — managers oversee FE assignments
- **Backoffice** — manages supplies sent to FEs
- **Scientist** — handles lab analysis after sample collection
- **Reports and patient tracking**

The system already has these database tables: `users`, `hospitals`, `service_types` (with a `kit` JSONB column listing required equipment per service), and `tickets`.

**What does NOT exist yet:** Any financial tracking, expense management, hospital billing, or formal inventory accounting. That is the entire scope of this project.

---

## 2. What Is Being Built

Six connected modules (called "Slices") are being added to SWFT:

| Slice | Name | Who uses it |
|---|---|---|
| A | Fund Management | Accountant |
| B | Expense Claims | FE submits, Manager submits, Accountant reviews |
| C | Hospital Charge Allocation | Accountant |
| D | Billing & Invoice | Accountant |
| E | Backoffice Inventory | Backoffice manages, FE views own |
| F | Accountant Inventory Logs | Accountant reads |

A new role is introduced: **Accountant**. This role owns all financial operations.

---

## 3. The Four Roles in These New Modules

### Accountant
The central financial authority. Receives and tracks org funds, allocates money to field staff, reviews and approves expense claims, sets what Seragen charges each hospital for each service, generates invoices for completed tickets, and has a read-only view of inventory.

### Field Executive (existing role — extended)
Already exists in SWFT. New responsibilities: can raise an expense claim after completing a ticket (claiming back travel, food, and other costs). Can view their own inventory allocation and see what equipment they hold.

### Manager (existing role — extended)
Already exists in SWFT. New responsibility: can raise free-standing expense claims (not tied to a specific ticket) — for things like client visit costs, coordination expenses, etc.

### Officer Backoffice (existing role — extended)
Already exists in SWFT. New responsibilities: formally manages warehouse inventory — adds stock, sets cost and minimum thresholds per item, allocates stock to individual FEs.

---

## 4. The Money Flow — End to End

This is the most important flow to understand. Everything in Slices A and B connects to this.

```
Org receives money
       ↓
Accountant logs it (fund entry)
       ↓
Seragen account balance increases
       ↓
Accountant allocates advance to FE or Manager
       ↓
FE/Manager balance increases
       ↓
FE completes a ticket → raises expense claim
Manager raises a free-standing claim
       ↓
Accountant reviews → approves or rejects
       ↓
If approved → FE/Manager balance decreases
              Approved amount appears in Accountant's activity log as an expense row
```

**Key point:** The "Seragen account balance" is simply `total funds received − total allocated`. It never goes into a real bank account in the system — it's a running tally the accountant uses to track how much money is available to distribute.

**Key point:** A Field Executive's personal balance is `total advance received − total approved claims`. This can go negative (the system allows this — no hard block).

---

## 5. Slice A — Fund Management: Detailed Workflow

### 5.1 Receiving Funds

The accountant is the only person who can log incoming money.

**What happens:**
1. Accountant opens Fund Management → clicks "+ Receive Funds"
2. Enters: amount, entry date, optional remarks
3. Submits → a row is inserted into the `funds` table
4. The "Total Fund Received" stat card immediately reflects the new total
5. This row can never be edited or deleted — the DB has triggers blocking UPDATE and DELETE on this table. Corrections are always new entries.

### 5.2 Allocating Funds to Staff

The accountant distributes money to Field Executives and Managers before they go out for work.

**What happens:**
1. Accountant clicks "+ Allocate Funds"
2. Chooses single or multi-user mode
3. Selects the recipient(s) — only Managers and FEs are valid recipients
4. Enters amount(s), entry date, optional remarks
5. The system validates server-side that the total being allocated does not exceed the available Seragen account balance
6. On submit, all rows are inserted in a single atomic transaction — if any row fails, none are saved
7. For each inserted row, the system computes two snapshot values at the moment of insertion:
   - **recipient_balance_after_alloc** = all prior allocations to this person + this amount − all their approved expenses so far
   - **recipient_total_expenses_at_alloc** = total approved expenses for this person at this moment
   These snapshots are stored permanently and never recalculated. They create a historical audit trail showing exactly what the person's balance was at every allocation.
8. The "Funds Allocated" and "Available Balance" stat cards refresh

**Multi-user mode:** The accountant can select multiple recipients at once, with either the same amount for all or different amounts per person. The full batch still validates against the total available balance and commits atomically.

### 5.3 Viewing the Activity Log

The Activity Log is a unified timeline merging two types of events:
- Allocations (money sent to someone)
- Expenses (approved claims, money spent by someone)

**What happens when an expense is approved (Slice B):** The approval automatically causes that claim to appear in this log as an "Expense" row. No separate step needed — the query dynamically pulls approved claims.

The accountant can filter by:
- Type: All / Allocations only / Expenses only
- Date range
- Specific user

The accountant can export the current filtered view to Excel (SheetJS workbook, streamed as a download). The export button is inside the Activity Log tab — not in the page header.

### 5.4 User Balances Tab

Shows every manager and FE with their running financial summary:
- Total Funds Received (from allocations)
- Total Expenses (from approved claims)
- Current Balance (received minus expenses)

If a balance is negative, the row shows in deep red with a left red border.

Managers with no allocations show ₹0.00 received but still show any approved claims under expenses.

---

## 6. Slice B — Expense Claims: Detailed Workflow

### 6.1 Field Executive Raises a Claim

FEs can only raise claims from **completed** tickets. They cannot raise a claim for a ticket that is still in progress, cancelled, or already has a pending/approved claim.

**What happens:**
1. FE opens a completed ticket
2. A "Claim Expenses" button appears at the bottom (only visible on completed tickets with no existing pending/approved claim)
3. FE fills in the expense claim form with the following sections:
   - **Outstation Travel toggle** — if the job involved travelling to another city/state, toggle this ON. Shows From Place and To Place fields.
   - **Petrol** — FE enters distance in km. The system auto-calculates the amount using the configured petrol rate (₹/km). The rate comes from the `claim_rate_config` table. Amount is shown read-only.
   - **Food Allowance** — Breakfast, Lunch, Dinner. Each has a maximum cap (configured by accountant). FE cannot enter more than the cap for each item. Caps are shown as helper text.
   - **Reimbursement** — Default items: Tea, Coffee, Snacks, Water Bottle. FE can add custom items with name + amount.
   - **Accommodation** — Single amount field.
   - **Travel Allowance** — Single amount field.
   - **Proof / Support Photos** — Optional file upload for bills and receipts. Multiple files allowed. Files go to Supabase Storage bucket `receipts`.
   - **Miscellaneous** — Amount + description.
   - **Notes** — Optional free text.
4. Total Claim Amount updates live at the bottom as fields are filled
5. FE clicks "Submit Claim"
6. Server validates: ticket is completed, ticket belongs to this FE, no duplicate claim, petrol amount is mathematically correct, food amounts don't exceed caps. Server recomputes total_amount — does not trust the client's total.
7. Claim is saved with `status = 'pending'`. The petrol rate active at submission is stored in `petrol_rate_at_submission` for audit trail.
8. Claim appears in FE's My Balance page under "My Expense Claims" table with "Pending" badge.

### 6.2 Manager Raises a Claim

Managers raise free-standing claims — not tied to any ticket.

**What happens:**
1. Manager opens My Claims page → clicks "+ Raise Claim"
2. Fills in: Reason (required), Amount, optional proof upload
3. Submits → saved with `status = 'pending'` and no `ticket_id`
4. Appears in manager's My Claims table with "Pending" badge

### 6.3 Accountant Reviews Claims

**What happens:**
1. Accountant opens Expense Claims page
2. Sees the Claims Management dashboard with three stat cards: Pending count, Total Approved (filtered by current pill), Total Claims count
3. Filter pills (All / Pending / Approved / Rejected) filter the table below and update the "Total Approved" card
4. For each pending claim, there are two action buttons:
   - **Approve** — quick-approve without opening the full detail
   - **Review** — opens the full Review Modal
5. The Review Modal shows the complete claim breakdown:
   - Outstation travel details
   - Petrol calculation (distance × rate)
   - Food amounts
   - All reimbursement items
   - Accommodation, travel allowance, miscellaneous
   - Notes and reason
   - Proof uploads (images shown as preview, PDFs as download link)
6. Accountant either approves or rejects:
   - **Approve:** `PATCH /api/expense-claims/[id]` with `{ status: 'approved' }`. The claim status updates. The approved amount automatically feeds into the Activity Log as an "Expense" row and decreases the claimant's balance.
   - **Reject:** Same endpoint with `{ status: 'rejected', review_notes: '...' }`. Review notes are required when rejecting. The review notes appear in the claimant's claims table so they know why.
7. Only pending claims show action buttons. Already-reviewed claims are final — no re-review.

### 6.4 Rate Configuration

The accountant can change the petrol rate and food caps at any time.

**What happens:**
1. Accountant clicks "⚙ Rate Config" button (small, next to filter pills)
2. Modal shows current values: Petrol Rate (₹/km), Breakfast Max (₹), Lunch Max (₹), Dinner Max (₹). Default starting values: ₹4/km, ₹100, ₹150, ₹150.
3. Accountant edits and saves
4. Changes apply to new submissions only. Claims already submitted preserve the rate that was active at submission time (`petrol_rate_at_submission`).

### 6.5 FE My Balance Page

FE sees five stat cards:
- Advance Received = total allocations received
- Total Claimed = total amount of all claims submitted (any status)
- Total Approved = total amount of approved claims only
- Pending Claims = count of pending claims
- Current Balance = Advance Received − Total Approved

Below the cards: a table of all their expense claims with Date Filed, Ticket, Patient, Claimed, Approved Amount, Status, Notes (shows rejection reason if rejected).

If Current Balance is negative, the card shows a red border.

---

## 7. Slice C — Hospital Charge Allocation: Detailed Workflow

### 7.1 What This Is

Seragen charges different amounts to different hospitals for different services. These charges are not fixed — they can change over time. The accountant manages this. The rates set here are what gets used when generating invoices (Slice D).

### 7.2 Setting Charges

**What happens:**
1. Accountant opens Hospital Charges page
2. Sees a table of all existing charges with columns: Hospital, Diagnostics (service name if diagnostic), Therapeutics (service name if therapeutic), Amount, GST (yes/no), TDS (yes/no), Start Date, End Date
3. Clicks "+ Add Allocation" → opens the Hospital Pricing Management Table modal
4. In the modal:
   - Selects a Target Hospital
   - Optionally filters by Service Category (Diagnostics / Therapeutics)
   - Sets Effective From date (required) and Valid Until date (optional)
   - For each service in the table, enters a New Rate and sets GST/TDS toggles
5. Submits → one `POST /api/hospital-charges` request is made per service where a new rate was entered
6. Each submission creates a NEW row — it does not update the old one. This is intentional: old rates are preserved as history.

### 7.3 How Active Charges Work

For any given (hospital, service) pair, the "active" charge is the most recent row where:
- `effective_from` ≤ today
- `valid_until` is null OR `valid_until` ≥ today

If multiple rows meet this condition, the one with the latest `created_at` wins.

When "Show History" is OFF, the table only shows currently active charges. When it is ON, all historical rows are visible.

### 7.4 Why This Matters for Invoicing

When the accountant generates an invoice for a completed ticket, the system automatically looks up the active charge for that ticket's hospital + service type. If no active charge exists, the invoice cannot be generated — the accountant gets a 400 error and must set a charge first.

---

## 8. Slice D — Billing & Invoice: Detailed Workflow

### 8.1 What This Is

After a ticket is completed, Seragen needs to bill the hospital for the service. This module handles generating that invoice, computing the correct amount with GST/TDS, generating a PDF, and storing it.

### 8.2 Generating an Invoice

**What happens:**
1. Accountant opens Billing & Invoices page
2. Clicks "+ Generate Invoice"
3. In the modal, selects a completed ticket that has no invoice yet (dropdown shows only qualifying tickets)
4. On selection, the modal shows: hospital name, service name, active charge rate, and a live invoice preview with Base Amount, GST, TDS, and Total
5. Accountant confirms → the system runs these 8 steps server-side:
   1. Fetch the ticket — 404 if not found
   2. Confirm ticket status is 'completed' — 400 if not
   3. Confirm no invoice already exists for this ticket — 409 if one exists
   4. Fetch the active charge for this hospital + service type — 400 if none
   5. Calculate: base = charge amount; GST = base × 0.18 if applicable else 0; TDS = base × 0.10 if applicable else 0; total = base + GST − TDS
   6. Generate Invoice UID: `INV-YYYYMMDD-####` where the sequence number resets daily and is padded to 4 digits (e.g. INV-20260516-0001)
   7. Generate PDF via pdf-lib and upload to Supabase Storage bucket `invoices` at path `{invoice_id}/invoice.pdf`
   8. Insert the invoice row
6. Invoice appears in the table. "View PDF" opens a 60-minute signed URL. "Download" triggers a file download.

### 8.3 Invoice Immutability

Once generated, an invoice cannot be changed or regenerated. There is exactly one invoice per ticket (enforced by a UNIQUE constraint on `ticket_id`). If a mistake is made, a correction process must be handled outside the system (pending future feature).

---

## 9. Slice E — Backoffice Inventory: Detailed Workflow

### 9.1 The Big Picture

When a FE goes out on a ticket, they use physical equipment (collection kits, tubes, gloves, etc.). The backoffice manages where this equipment comes from and tracks it. When a ticket is completed, the equipment used is automatically deducted.

### 9.2 Setting Up Inventory Items

The backoffice does this once per item type and then maintains it.

**What happens:**
1. Backoffice opens Inventory page → Add Stock tab
2. Selects an existing item or creates a new one (entering name and unit)
3. Enters quantity and optional notes → submits
4. Stock is added to the warehouse

After adding items, the backoffice sets cost and threshold per item:
- In the Inventory tab, each row has "Set Threshold" and "Update Cost" buttons
- **Threshold:** the minimum quantity that should always be in the warehouse (or with an FE). If stock falls below this, the quantity shows in red everywhere as a warning.
- **Cost per unit:** used by the accountant's Inventory Logs page to calculate total asset value.

### 9.3 Allocating Stock to a Field Executive

Before a FE goes out, backoffice sends them their equipment.

**What happens:**
1. Backoffice opens Allocate to FE tab
2. Selects: Item, Field Executive, Quantity
3. The current warehouse stock is shown as a helper
4. If quantity entered > warehouse stock, a client-side warning appears. Server also blocks over-allocation with a 400 error.
5. On submit → an allocation row is created. Warehouse stock decreases by that quantity. FE stock increases by that quantity.

### 9.4 How Auto-Consumption Works on Ticket Completion

This is the most important automated behaviour in Slice E.

**Every `service_type` in SWFT has a `kit` field** — a JSON array specifying which inventory items are needed and in what quantity. For example: `[{ "item_id": "...", "quantity": 2 }, { "item_id": "...", "quantity": 4 }]`

When a ticket's status changes to `'completed'` (in the existing `PATCH /api/tickets/[id]` route), the system automatically calls `autoCreateConsumptions()`:

```
For each item in the ticket's service_type.kit:
  Create a consumption row: { item_id, fe_id, ticket_id, quantity_used = kit quantity, kit_default_quantity = kit quantity, overridden = false }
  (Uses UPSERT with ON CONFLICT DO NOTHING — safe to call multiple times)
```

This is silent and automatic. The FE does not trigger it, confirm it, or see it happen in real time. Their stock just decreases.

**Important:** This must be added to the existing ticket PATCH route — it is not a new API endpoint. The developer must find `PATCH /api/tickets/[id]`, locate where `status` is set to `'completed'`, and call `autoCreateConsumptions(ticketId)` at that point within the same request.

### 9.5 FE Views Their Inventory

On the FE dashboard, there is a "My Inventory" tab (third tab, alongside Active Tasks and Completed).

Shows a card grid — one card per item the FE holds. Each card shows:
- Item name/code
- "Current Stock" label
- Quantity number (red if below minimum threshold)

FE cannot edit anything here. It is a read-only view of what they currently hold.

### 9.6 FE Override (24-Hour Window)

Sometimes the actual quantity used differs from the kit default — for example, a tube broke. The FE has 24 hours after ticket completion to correct this.

**What happens:**
1. FE opens the completed ticket page
2. Sees the "Inventory Used" section showing what was auto-deducted
3. Each item row has an "Override" button — visible only if `completed_at ≥ NOW() − 24 hours`
4. Clicking Override expands an inline form: Actual Quantity Used (required), Reason (required)
5. FE submits → server validates:
   - FE owns this consumption row
   - Still within 24 hours
   - New quantity would not make FE stock negative
6. If valid: consumption row updates with new quantity, `overridden = true`, `override_reason` saved
7. Row shows "Overridden" amber badge. Override button disabled. Success toast.
8. After 24 hours the override button disappears. No more changes possible.

### 9.7 Backoffice Monitoring

The backoffice has five tabs:

**Inventory tab:** Master stock table. Shows warehouse stock per item. Red highlighting if below threshold. Buttons to set threshold and update cost.

**Per-FE Holdings tab:** Select an FE from a dropdown → see exactly what that FE holds (received, consumed, current holding). Current Holding shown in red if below threshold. This tells the backoffice whether to send more stock to that FE.

**Movement Log tab:** Unified timeline of every stock movement — additions to warehouse, allocations to FEs, consumptions by FEs (auto and overridden). Filterable by type, item, FE, date. Each movement type has a colour-coded badge: additions (green), allocations (blue), consumptions (red), overrides (amber).

**Allocate to FE tab:** Form to send stock to an FE. History table below.

**Add Stock tab:** Form to add new stock to warehouse. History table below.

---

## 10. Slice F — Accountant Inventory Logs: Detailed Workflow

### 10.1 What This Is

The accountant needs a read-only snapshot of all inventory for financial reporting — specifically to know the total asset value of stock on hand.

### 10.2 What the Accountant Sees

A single table. No tabs. No buttons.

Columns: Item Name | Unit | Total Added | Total Allocated to FEs | Total Consumed by FEs | Warehouse Stock | Remaining | Cost per Quantity | Total Cost

Total Cost = Cost per Quantity × Warehouse Stock — gives the accountant the monetary value of what's sitting in the warehouse.

Items below threshold show the Remaining cell in red.

This data comes from the same `GET /api/inventory` endpoint that backoffice uses. Accountant just has read-only access — no add/edit capability here.

---

## 11. How the Slices Connect to Each Other

This is critical to understand before building, because building them in isolation without understanding the connections will cause integration failures.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXISTING SYSTEM                              │
│   tickets ──── hospitals ──── service_types (kit JSON) ──── users  │
└────────┬───────────────┬──────────────┬──────────────────────┬──────┘
         │               │              │                      │
         ▼               ▼              ▼                      ▼
    [Slice B]       [Slice D]      [Slice E]             [Slice A]
  expense_claims    invoices    inventory tables        funds +
  (ticket FK)     (ticket FK)  (kit auto-consume        fund_allocations
                               on ticket close)
         │               │
         ▼               ▼
    [Slice A]       [Slice C]
  activity_log    hospital_service
  (expense rows)     _charges
                  (used for amount
                   calculation)
         │
         ▼
    [Slice F]
  (reads Slice E
   inventory data)
```

### Connection 1: Ticket → Auto-Consumption (Slices E + existing system)
When a ticket closes, `autoCreateConsumptions()` runs. This is the only place new Slice code touches the existing ticket flow. Must be added to the existing `PATCH /api/tickets/[id]` handler.

### Connection 2: Approved Claims → Activity Log (Slices B + A)
Approved expense claims are NOT stored in the `funds` or `fund_allocations` tables. The Activity Log endpoint does a UNION query that joins `fund_allocations` rows AND `expense_claims WHERE status='approved'`. When a claim is approved, it automatically appears in the Activity Log on the next load — no separate write needed.

### Connection 3: Active Charges → Invoice Generation (Slices C + D)
Invoice generation cannot proceed without an active charge existing for the ticket's hospital + service type. The invoice `POST` handler fetches the active charge internally. If Slice C has not been set up first, Slice D cannot work.

### Connection 4: Approved Claims → User Balance (Slices B + A)
User balances are derived dynamically. The `GET /api/fund-allocations/user-balances` endpoint JOINs `fund_allocations` and `expense_claims`. There is no stored balance field anywhere — it is always recomputed from these two tables.

### Connection 5: Expense Claims → Seragen Account Balance (Slices B + A)
The Seragen account balance (available to allocate) is `total funds − total allocations`. Expense approvals do NOT reduce this balance directly. They reduce per-user balances. The org-level "Available Balance" card only changes when new funds are received or new allocations are made.

---

## 12. New Pages That Must Be Created

### New pages (do not exist yet):

| File path | What it is |
|---|---|
| `src/app/(dashboard)/accountant/funds/page.tsx` | Accountant Fund Management |
| `src/app/(dashboard)/accountant/claims/page.tsx` | Accountant Claims Review |
| `src/app/(dashboard)/accountant/hospital-charges/page.tsx` | Hospital Charge Allocation |
| `src/app/(dashboard)/accountant/billing/page.tsx` | Billing & Invoices |
| `src/app/(dashboard)/accountant/inventory/page.tsx` | Inventory Logs (read-only) |
| `src/app/(field-executive)/field-executive/claims/page.tsx` | FE My Balance + Claims |
| `src/app/(manager)/manager/claims/page.tsx` | Manager Claims |

### Existing pages that must be modified:

| File path | What to add |
|---|---|
| `src/app/api/tickets/[id]/route.ts` | Call `autoCreateConsumptions(ticketId)` when status transitions to 'completed' |
| `src/app/(backoffice)/officer-backoffice/inventory/page.tsx` | Add Per-FE Holdings tab and Movement Log tab (and the existing page gets Inventory, Allocate to FE, Add Stock tabs formalised) |
| `src/app/(field-executive)/field-executive/[ticketId]/page.tsx` (or wherever the ticket detail is) | Add inventory section + override section |
| `src/middleware.ts` | Add new route guards |
| `src/lib/auth.ts` | Add new helper functions |
| `src/app/page.tsx` | Add accountant root redirect |
| `src/lib/types.ts` | Add new TypeScript interfaces |

---

## 13. The Build Order (Dependency Chain)

Build in this order to avoid blocks:

```
Step 1: Database migration
  → Run the new migration SQL creating all new tables
  → Seed claim_rate_config with defaults
  → Seed test inventory items

Step 2: Infrastructure
  → Add TypeScript types to types.ts
  → Add auth helpers to auth.ts
  → Add route guards to middleware.ts
  → Add root redirect for accountant

Step 3: Slice A — Fund Management (no dependencies on other new slices)
  → API routes: funds/stats, funds/entries, fund-allocations, fund-allocations/user-balances, funds/activity-log, funds/export
  → UI: accountant/funds/page.tsx with all four tabs and both modals

Step 4: Slice C — Hospital Charges (needed before Slice D)
  → API routes: hospital-charges
  → UI: accountant/hospital-charges/page.tsx with pricing modal

Step 5: Slice E — Backoffice Inventory (needed before Slice F and FE inventory views)
  → Add autoCreateConsumptions() function
  → Wire it into existing ticket PATCH route at status='completed' transition
  → API routes: inventory, inventory/items/[id], inventory/allocations, inventory/consumptions
  → UI: backoffice inventory page (5 tabs)
  → UI: FE My Inventory tab on FE dashboard
  → UI: Ticket detail page additions (Required Inventory section + Override section)

Step 6: Slice B — Expense Claims (needs users, tickets, claim_rate_config)
  → API routes: claim-rate-config, expense-claims, expense-claims/stats, expense-claims/[id]
  → UI: FE claims page (My Balance)
  → UI: Manager claims page
  → UI: Accountant claims review page

Step 7: Slice D — Billing & Invoice (needs Slice C active charges + tickets)
  → API routes: invoices, invoices/[id]/pdf
  → Create lib/pdf-utils.ts (invoice PDF generation — layout pending Anish's design)
  → UI: accountant/billing/page.tsx

Step 8: Slice F — Accountant Inventory Logs (needs Slice E tables)
  → No new API routes (reuses GET /api/inventory)
  → UI: accountant/inventory/page.tsx (read-only table)
```

---

## 14. Key Validation Rules Summary

These are the most important business rules. The system must enforce all of them.

### Money Rules
- Fund allocations only go to `role = 'manager'` or `role = 'field_executive'`. Any other role → 400.
- Total allocations in a batch cannot exceed the available Seragen account balance. Server-side check — never trust client.
- Multi-allocation batches are atomic: all save or none save.
- Entry dates cannot be more than 30 days in the future.
- `funds` and `fund_allocations` tables are append-only. DB triggers prevent UPDATE and DELETE.

### Claim Rules
- FE claims must be linked to a completed ticket that belongs to them. No claim on in-progress or other FE's tickets.
- One active claim per FE per ticket (pending or approved). Rejected claims can be resubmitted.
- Manager claims must have no ticket. Reason field is required for managers.
- Petrol amount must equal distance × configured rate (±0.01 tolerance). Server validates.
- Food amounts cannot exceed the configured caps. Server rejects with 400 if exceeded.
- Total amount is computed server-side. Client total is display-only.
- Only accountant can approve or reject. FE and manager cannot change their own claim status.
- Rejection requires review_notes. Approval does not.
- Partial approval is not supported — full amount only.

### Inventory Rules
- Allocations to FE cannot exceed current warehouse stock.
- Auto-consumption runs automatically on ticket close — FE does not trigger it.
- Override is only possible within 24 hours of ticket completion.
- Override cannot make FE stock go negative.
- Override requires a reason text.

### Invoice Rules
- Ticket must be completed. Cannot invoice an open or in-progress ticket.
- One invoice per ticket. Cannot generate a second invoice for the same ticket.
- Active charge must exist. Cannot generate invoice without a rate set in Slice C.
- Invoice is immutable once created.

### Hospital Charge Rules
- No update or delete on charges — only new rows with a new effective_from date.
- Valid Until must be on or after Effective From (DB CHECK constraint).
- Accountant is the only role with access to hospital charges.

---

## 15. Error Handling Patterns

Every API route must return structured errors — never raw Postgres errors to the client.

| Situation | HTTP status | Error message |
|---|---|---|
| Not logged in | 401 | "Unauthorised" |
| Wrong role | 403 | "Forbidden" |
| Zod validation fails | 400 | Zod error message |
| Resource not found | 404 | "Not found" |
| Duplicate (e.g. second invoice for same ticket) | 409 | "Conflict" |
| Business rule violation (e.g. insufficient balance) | 400 | Descriptive message |
| Unexpected server error | 500 | "Internal server error" |

---

## 16. What Is Still Pending

Only one thing is unresolved and it only blocks a small part of Slice D:

**Invoice PDF Layout** — Anish is designing the invoice template. Once provided, it needs to be implemented in `lib/pdf-utils.ts` using the `pdf-lib` library. The dynamic fields that will be in the invoice are already confirmed (hospital name, address, service, ticket UID, amounts, dates, accountant name). Only the visual layout is pending.

Everything else in this document is fully specified and confirmed. If building before the PDF design arrives, implement Slice D up to the PDF generation step and add a placeholder that generates a simple text-only PDF. Replace with the final design when received.

---

*End of SWFT Workflow & Logic Document*
*Read alongside SWFT_Architecture_v3.md for complete implementation detail.*
*Architecture doc = exact specs. This doc = understanding the flow.*
