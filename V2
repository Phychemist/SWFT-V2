# SWFT — Architecture & Logic Specification
## All 6 Slices | Complete Developer Reference
**Project:** Seragen (SWFT) | **Document version:** 3.0

---

## Table of Contents
1. [Global Conventions](#1-global-conventions)
2. [UI Design System](#2-ui-design-system)
3. [Role-Page Index](#3-role-page-index)
4. [Slice A — Fund Management](#4-slice-a--fund-management)
5. [Slice B — Expense Claims](#5-slice-b--expense-claims)
6. [Slice C — Hospital Charge Allocation](#6-slice-c--hospital-charge-allocation)
7. [Slice D — Billing & Invoice](#7-slice-d--billing--invoice)
8. [Slice E — Backoffice Inventory](#8-slice-e--backoffice-inventory)
9. [Slice F — Accountant Inventory Logs](#9-slice-f--accountant-inventory-logs)
10. [Cross-Cutting Infrastructure](#10-cross-cutting-infrastructure)
11. [Resolved Decisions](#11-resolved-decisions)
12. [Remaining Open Items](#12-remaining-open-items)

---

## 1. Global Conventions

### 1.1 Tech Stack (locked — do not deviate)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Route groups for role-scoped sections |
| Language | TypeScript strict | |
| UI | React 19 | Functional components only |
| Styling | Tailwind CSS 4 + CSS variables | Exact variable names in §2.2 |
| Icons | lucide-react | No other icon packs |
| Animation | framer-motion | Match existing Sidebar.tsx micro-interactions |
| Forms | react-hook-form + zod | Same as existing settings/users/page.tsx |
| Charts | recharts | Dashboard graphs only |
| DB | Supabase Postgres | RLS enabled on all new tables |
| Storage | Supabase Storage | Same bucket pattern as existing uploads |
| Server DB access | `createServiceClient()` from `lib/supabase-server.ts` | Service role key |
| Auth | Custom session in `seragen_session` cookie | NOT Supabase Auth |
| Password hashing | bcryptjs 12 rounds | |
| PDF generation | pdf-lib | `lib/pdf-utils.ts` |
| Excel export | xlsx (SheetJS) | New dependency — add to package.json |
| Date format in DB | `date` (YYYY-MM-DD) and `timestamptz` | |
| Timezone | IST (Asia/Kolkata, UTC+05:30) | All user-visible timestamps |
| Currency in DB | `numeric(12,2)` | INR only, 2 decimal places |

---

### 1.2 Role Scope for New Slices

The existing SWFT system has an `admin` role used by other modules. **Slices A–F do not extend access to admin.** The accountant is the sole financial authority. Where the existing codebase grants admin access to other features, that is unaffected — but no new Slice A–F route or page grants admin access.

```typescript
// Roles relevant to Slices A–F
// accountant    — owns all financial operations
// manager       — can raise claims, can receive fund allocations
// field_executive — can raise claims, manages own inventory
// officer_backoffice — owns warehouse inventory
```

---

### 1.3 Shared TypeScript Types (`src/lib/types.ts`)

Add these interfaces. Do not remove existing types.

```typescript
// ── Slice A ──────────────────────────────────────────────────
export interface FundEntry {
  id: string
  amount: number
  entry_date: string           // YYYY-MM-DD
  remarks: string | null
  entered_by: string           // uuid ref users.id
  created_at: string
}

export interface FundAllocation {
  id: string
  user_id: string
  amount: number
  entry_date: string
  remarks: string | null
  allocated_by: string
  recipient_balance_after_alloc: number
  recipient_total_expenses_at_alloc: number
  created_at: string
}

export interface UserBalance {
  user_id: string
  full_name: string
  role: 'manager' | 'field_executive'
  total_received: number       // 0 for managers unless explicitly allocated
  total_expenses: number       // sum of approved claims
  current_balance: number      // total_received - total_expenses (can be negative)
}

export interface ActivityLogRow {
  id: string
  type: 'allocation' | 'expense'
  date: string
  user_id: string
  user_name: string
  user_role: string
  amount: number
  balance_at_moment: number | null
  total_expenses_at_moment: number | null
  reference: string | null
  performed_by_name: string
}

// ── Slice B ──────────────────────────────────────────────────
export interface ReimbursementItem {
  name: string       // e.g. "Tea", "Coffee", "Snacks", or user-defined
  amount: number
}

export interface ExpenseClaim {
  id: string
  claimant_id: string
  ticket_id: string | null           // NULL for manager free-standing claims

  outstation_travel: boolean
  from_place: string | null
  to_place: string | null

  distance_km: number | null
  petrol_amount: number
  petrol_rate_at_submission: number | null

  breakfast_amount: number
  lunch_amount: number
  dinner_amount: number

  reimbursement_items: ReimbursementItem[]

  accommodation_amount: number
  travel_allowance_amount: number

  miscellaneous_amount: number
  miscellaneous_description: string | null

  reason: string | null              // required for manager claims only

  proof_urls: string[]               // array of Supabase Storage URLs

  notes: string | null

  total_amount: number               // server-computed sum of all amount fields

  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null

  created_at: string
  updated_at: string
}

export interface ClaimRateConfig {
  id: string
  petrol_rate_per_km: number         // default 4.00
  breakfast_max: number              // default 100.00
  lunch_max: number                  // default 150.00
  dinner_max: number                 // default 150.00
  updated_by: string | null
  updated_at: string
}

// ── Slice C ──────────────────────────────────────────────────
export interface HospitalServiceCharge {
  id: string
  hospital_id: string
  service_type_id: string
  amount: number
  gst_applicable: boolean
  tds_applicable: boolean
  effective_from: string             // YYYY-MM-DD
  valid_until: string | null
  created_by: string
  created_at: string
}

// ── Slice D ──────────────────────────────────────────────────
export interface Invoice {
  id: string
  uid: string                        // e.g. "INV-20260516-0001"
  ticket_id: string
  hospital_service_charge_id: string
  base_amount: number
  gst_amount: number
  tds_amount: number
  total_amount: number
  pdf_url: string
  generated_by: string
  generated_at: string
}

// ── Slice E ──────────────────────────────────────────────────
export interface InventoryItem {
  id: string
  name: string
  unit: string
  cost_per_unit: number
  minimum_threshold: number
  warehouse_stock: number            // computed
  total_allocated: number            // computed
  total_consumed: number             // computed
  below_threshold: boolean           // computed flag
}

export interface InventoryAllocation {
  id: string
  item_id: string
  from_user_id: string
  to_user_id: string
  quantity: number
  allocated_by: string
  created_at: string
}

export interface InventoryConsumption {
  id: string
  item_id: string
  fe_id: string
  ticket_id: string
  quantity_used: number
  kit_default_quantity: number
  overridden: boolean
  override_reason: string | null
  created_at: string
  updated_at: string
}
```

---

### 1.4 Standard API Route Pattern

Every API route in Slices A–F MUST follow this exact sequence. No exceptions.

```typescript
export async function GET_or_POST_or_PATCH(req: Request) {
  try {
    // Step 1 — Authentication
    const session = await getSession(req)
    if (!session) return json({ success: false, error: 'Unauthorised' }, 401)

    // Step 2 — Authorisation (role check)
    if (!allowedRoles.includes(session.role))
      return json({ success: false, error: 'Forbidden' }, 403)

    // Step 3 — Input validation (Zod)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success)
      return json({ success: false, error: parsed.error.message }, 400)

    // Step 4 — Business logic + DB operation
    const supabase = createServiceClient()
    // ... operation ...

    // Step 5 — Typed response
    return json({ success: true, data: result } satisfies ApiResponse<T>, 200)

  } catch (err) {
    console.error('[route-name]', err)
    return json({ success: false, error: 'Internal server error' }, 500)
    // NEVER expose raw Postgres errors to the client
  }
}
```

---

### 1.5 IST Utilities (`src/lib/utils.ts`)

```typescript
export const formatIST = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...options,
  }).format(new Date(date))

export const getTodayIST = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const getPaginationParams = (url: URL) => ({
  page: Math.max(1, parseInt(url.searchParams.get('page') ?? '1')),
  pageSize: Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20'))),
})
```

---

### 1.6 Financial Constants (`src/lib/constants.ts`)

```typescript
export const GST_RATE = 0.18
export const TDS_RATE = 0.10
export const SESSION_EXPIRY_HOURS = 24
export const MAX_FUTURE_ENTRY_DAYS = 30
export const ACTIVITY_LOG_PAGE_SIZE = 20
export const RECEIPT_BUCKET = 'receipts'
export const INVOICE_BUCKET = 'invoices'
```

> Petrol rate and food allowance caps are NOT stored here. They are configurable by the accountant and stored in the `claim_rate_config` table (§5.1).

---

### 1.7 Base Database Tables

These tables already exist in the system. Listed here for FK reference only. Do not re-create.

```
public.users         — id, email, password_hash, full_name, role, is_active, timestamps
public.hospitals     — id, name, code, address, city, created_at
public.service_types — id, name, category ('diagnostics'|'therapeutics'), kit (jsonb), created_at
public.tickets       — id, uid, hospital_id, service_type_id, assigned_fe_id,
                       assigned_manager_id, status, completed_at, timestamps
```

**Confirmed:** `service_types.kit` is already structured JSONB: `[{ "item_id": "uuid", "quantity": 2 }, ...]`

---

## 2. UI Design System

This section is the complete visual specification. Build all new pages to match it exactly. It is derived from the existing `src/app/globals.css` and existing component files.

---

### 2.1 Design Language

- **Style:** Clean, white-surface, minimal. Medical-grade professional.
- **Font:** `Inter` (Google Fonts). Already used across the platform. Fallback: `system-ui, -apple-system, sans-serif`.
- **Base font size:** 14px
- **Background:** `#f8fafc` (light gray page background)
- **Surface (cards, modals, sidebar, header):** `#ffffff`

---

### 2.2 Complete CSS Variable Reference

All variables are defined in `src/app/globals.css` under `:root`. Use these exact names in all new components.

```css
/* Platform primary — Seragen coral/salmon */
--primary-50:  #fef2f4
--primary-100: #fde6e9
--primary-200: #fbd0d8
--primary-300: #f8a9b8
--primary-400: #f27791
--primary-500: #e85a71   /* ← main coral, use for FE/backoffice primary actions */
--primary-600: #d43d5a
--primary-700: #b22d49
--primary-800: #952942
--primary-900: #7f263d

/* Accountant-module accent — rose-pink (DIFFERENT from platform primary) */
/* These are NOT in globals.css — add them for the accountant module only  */
--accent-50:  #fdf2f8
--accent-100: #fce7f3
--accent-200: #fbcfe8
--accent-500: #ec4899   /* ← accountant primary buttons, badges, highlights */
--accent-600: #db2777
--accent-700: #be185d

/* Neutrals */
--gray-50:  #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827

/* Semantic */
--success-50:  #ecfdf5
--success-500: #10b981
--success-600: #059669
--success-700: #047857

--warning-50:  #fffbeb
--warning-500: #f59e0b
--warning-600: #d97706

--error-50:  #fef2f2
--error-500: #ef4444
--error-600: #dc2626
--error-700: #b91c1c

/* Background & Surface */
--background:    #f8fafc
--surface:       #ffffff
--surface-hover: #f1f5f9

/* Text */
--text-primary:   #111827
--text-secondary: #4b5563
--text-muted:     #9ca3af
--text-on-primary:#ffffff

/* Borders */
--border-light:   #e5e7eb
--border-default: #d1d5db
--border-focus:   #e85a71

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)

/* Border radius */
--radius-sm:   0.375rem   (6px)
--radius-md:   0.5rem     (8px)
--radius-lg:   0.75rem    (12px)
--radius-xl:   1rem       (16px)
--radius-full: 9999px

/* Transitions */
--transition-fast:   150ms ease
--transition-normal: 200ms ease
--transition-slow:   300ms ease

/* Layout */
--sidebar-width:           260px
--sidebar-collapsed-width: 70px
--header-height:           64px
```

---

### 2.3 Typography

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title (h1) | 22px | 700 | `--text-primary` |
| Page subtitle | 13px | 400 | `--text-secondary` |
| Section title / modal title | 16px | 700 | `--text-primary` |
| Card stat value | 22–26px | 700 | `--text-primary` (or context colour) |
| Card stat label | 11px | 600 | `--text-muted`, uppercase, letter-spacing 0.04em |
| Table header | 11px | 700 | `--text-muted`, uppercase, letter-spacing 0.04em |
| Table cell — primary | 13px | 400 | `--text-primary` |
| Table cell — secondary | 13px | 400 | `--text-secondary` |
| Table cell — muted (sub-line) | 11.5px | 400 | `--text-muted` |
| Badge text | 11.5px | 600 | varies by badge type |
| Form label | 12px | 600 | `--text-secondary`, uppercase, letter-spacing 0.03em |
| Form input | 13px | 400 | `--text-primary` |
| Form hint / helper | 11px | 400 | `--text-muted` |
| Nav item | 13.5px | 500 | `--text-secondary` (inactive), `--primary-700` (active) |
| Button text | 13px (sm: 12px, lg: base) | 500 | white (primary/danger/success), varies (secondary/outline) |
| Toast text | 13px | 500 | white |

---

### 2.4 Layout Structure

Every new role section follows the existing `DashboardShell` pattern:

```
┌────────────────────────────────────────────────────┐
│  Sidebar (fixed left, 260px wide, 100vh tall)      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Logo area  (64px tall)                      │  │
│  │  Nav items  (scrollable)                     │  │
│  │  Footer     (version text)                   │  │
│  └──────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────┤
│  Header (fixed top, left=260px, right=0, 64px tall)│
│  [Page title]                    [User avatar/pill]│
├────────────────────────────────────────────────────┤
│  Main content area                                 │
│  margin-left: 260px, margin-top: 64px              │
│  padding: 28px 32px (desktop)                      │
│  padding: 16px (mobile)                            │
└────────────────────────────────────────────────────┘
```

**Sidebar:**
- Background: `--surface` (#fff)
- Right border: 1px solid `--border-light`
- Logo text "seragen": 20px, weight 700, colour `--primary-600` (#d43d5a)
- Active nav item: `bg-[--primary-50]`, text `--primary-700`, left icon `--primary-600`
- Inactive nav item: text `--text-secondary`, hover `bg-[--gray-50]`
- Nav item padding: `px-3 py-2.5`, border-radius 8px
- Nav badge (pending count): `bg-[--accent-500]` #ec4899, white text, 11px, rounded-full

**Header:**
- Background: `--surface` (#fff)
- Bottom border: 1px solid `--border-light`
- Page title: 16px, weight 600, `--text-primary`
- User pill: avatar (34×34px, gradient from `--primary-400` to `--primary-600`, white initials 12px bold), name 13px/500, role badge

**Role badges in header:**
- Accountant: `bg-[--accent-100]` text `--accent-700`
- Field Executive: `bg-blue-50` text blue-700
- Backoffice: `bg-purple-50` text purple-600
- Manager: `bg-green-50` text green-700

---

### 2.5 Component Specifications

#### Buttons

Use the existing `Button.tsx` component. Do not create new button styles.

| Variant | Background | Text | Hover | Usage |
|---|---|---|---|---|
| `primary` | `--primary-600` (#d43d5a) | white | `--primary-700` | General platform actions (FE, backoffice) |
| `accent` (accountant only) | `--accent-600` (#db2777) | white | `--accent-700` | All accountant-module primary actions |
| `secondary` | `--gray-100` | `--gray-700` | `--gray-200` | Cancel, secondary actions |
| `outline` | transparent | `--gray-700` | `--gray-50` | Tertiary, export, view |
| `danger` | `--error-600` | white | `--error-700` | Reject, delete |
| `success` | `--success-600` | white | `--success-700` | Approve |
| `ghost` | transparent | `--gray-600` | `--gray-100` | In-table icon actions |

Sizes: `sm` = `px-3 py-1.5 text-sm` | `md` = `px-4 py-2 text-sm` | `lg` = `px-6 py-3 text-base`

All buttons: `rounded-lg`, `font-medium`, `transition-all duration-200`, `disabled:opacity-50`

Loading state: replace content with `<span className="spinner spinner-sm" />` + "Loading..." text. Button disabled during request.

#### Stat Cards

```
┌──────────────────────────────────────────┐
│  [Icon circle 44×44]  LABEL (11px muted) │
│                       VALUE (22-26px 700)│
│                       Sub text (11.5px)  │
└──────────────────────────────────────────┘
```

- Card: `bg-white`, 1px border `--border-light`, `border-radius: 12px`, `box-shadow: --shadow-sm`, `padding: 18px 20px`
- Icon circle: 44×44px, `border-radius: 50%`, coloured background matching semantic context
- Label: 11px, weight 600, `--text-muted`, uppercase, letter-spacing 0.04em
- Value: 22–26px, weight 700
- Sub-text: 11.5px, `--text-muted`

Icon colours per card type (use lucide-react icons):

| Card | Icon | Icon colour | Circle bg |
|---|---|---|---|
| Total Fund Received | `Wallet` | `--success-600` | `--success-50` |
| Funds Allocated | `TrendingDown` | `--primary-500` (#e85a71 coral) | `--primary-50` |
| Available Balance | `Wallet` | `--accent-600` | `--accent-50` |
| Pending Claims (count) | `Clock` | `--warning-500` | `--warning-50` |
| Total Approved (₹) | `BadgeIndianRupee` | `--success-600` | `--success-50` |
| Total Claims (count) | `User` | blue-600 | blue-50 |
| Active Hospitals | `Building2` | `--primary-600` | `--primary-50` |
| Current Allocations | `CheckCircle2` | `--success-600` | `--success-50` |
| Advance Received | `Wallet` | `--primary-600` | `--primary-50` |
| Total Claimed | `ClipboardList` | blue-600 | blue-50 |
| Total Approved | `CheckCircle2` | `--success-600` | `--success-50` |
| Current Balance | `Wallet` | `--success-600` | `--success-50` |
| Total Claimed (mgr) | `ClipboardList` | blue-600 | blue-50 |

**Do NOT use `PiggyBank` icon anywhere.**

#### Badges

Use existing `Badge.tsx` component:

| Context | Variant | Display |
|---|---|---|
| Pending claim/status | `warning` | amber bg `--warning-50`, text `--warning-600` |
| Approved claim/status | `success` | green bg `--success-50`, text `--success-700` |
| Rejected claim/status | `error` | red bg `--error-50`, text `--error-700` |
| Allocation type | `primary` | `--primary-100` bg, `--primary-700` text |
| Expense type | `error` | same as rejected |
| Field Executive role | `default` | `--gray-100` bg, `--gray-700` text |
| Manager role | custom | blue-50 bg, blue-700 text |
| Diagnostics category | `default` | gray |
| Therapeutics category | `primary` | pink |
| Stock Addition (movement log) | `success` | green |
| FE Allocation (movement log) | custom | blue |
| Consumption (movement log) | `error` | red |
| Consumption Override (movement log) | `warning` | amber |

All badges: `rounded-full`, 11.5px, weight 600. Sizes: `sm` = `px-2 py-0.5 text-xs`, `md` = `px-2.5 py-1 text-xs`.

#### Tables

- Wrapper: `bg-white`, 1px border `--border-light`, `border-radius: 12px`, `overflow: hidden`, `box-shadow: --shadow-sm`
- `thead`: background `--gray-50`, bottom border 1px `--border-light`
- `th`: `padding: 11px 16px`, 11px font, weight 700, `--text-muted`, uppercase, letter-spacing 0.04em
- `td`: `padding: 12px 16px`, 13px font
- Row hover: `background: --gray-50`
- Row separator: 1px `--border-light`, last row has no separator

**Negative balance row:** deep red text (`--error-600`) on ALL cells + `border-left: 3px solid --error-600`

**Below-threshold row:** only the quantity cell turns `--error-600`, weight 700. Row itself stays normal.

#### Modals

Use existing `Modal.tsx` component:

- Overlay: `rgba(0,0,0,0.45)` fixed fullscreen
- Modal container: white bg, `border-radius: 16px`, `box-shadow: --shadow-lg`, `max-height: 90vh`, `overflow-y: auto`
- Sizes: `sm` = `max-w-sm` | `md` = `max-w-lg` | `lg` = `max-w-2xl` | `xl` = `max-w-3xl`
- Header: `padding: 20px 24px 16px`, bottom border 1px `--border-light`, flex row with title left + close button right
- Body: `padding: 20px 24px`
- Footer: `padding: 16px 24px`, top border 1px `--border-light`, flex row right-aligned gap-10px
- Close button: 28×28px, `--gray-100` bg, hover `--gray-200`, rounded-lg, `X` icon from lucide-react
- Animation: `scaleIn` — from `opacity: 0, scale: 0.96` to `opacity: 1, scale: 1`, 180ms ease
- **Always:** Escape key closes, backdrop click closes, focus trap on open

#### Forms

- Label: 12px, weight 600, `--text-secondary`, uppercase, letter-spacing 0.03em, `margin-bottom: 6px`
- Input/Textarea/Select: `padding: 9px 12px`, 1px border `--border-default`, `border-radius: 8px`, 13px font, `--text-primary`, `bg-white`. Focus: `border-color: --primary-400`, `box-shadow: 0 0 0 3px rgba(232,90,113,0.08)`
- Error state: `border-color: --error-500`, `box-shadow: 0 0 0 3px rgba(239,68,68,0.08)`, error message 12px `--error-600` below the field
- Hint text: 11px, `--text-muted`, `margin-top: 4px`
- Required indicator: `*` in `--error-600` after label text

#### Tabs (pill-style)

```
┌──────────────────────────────────────┐
│  All  │  Allocations  │  Expenses    │  ← inside gray rounded container
└──────────────────────────────────────┘
```

- Container: `bg-[--gray-100]`, `border-radius: 8px`, `padding: 3px`
- Active tab: `bg-white`, `--text-primary`, `box-shadow: --shadow-sm`, `border-radius: 6px`
- Inactive tab: `--text-secondary`, hover `--text-primary`
- Tab text: 13px, weight 500

#### Filter Pills (status filters)

Used below stat cards on claims pages. Different from nav tabs:

- Pill: `padding: 7px 18px`, `border-radius: 9999px`, 13px, weight 500, 1px border `--border-default`
- Inactive: `--surface` bg, `--text-secondary` text
- Active (accountant module): `--accent-600` bg, white text, `border-color: --accent-600`
- Active (general): `--primary-600` bg, white text

#### Toasts

- Container: fixed, bottom-right, `bg-[--gray-900]`, white text, `border-radius: 10px`, `padding: 12px 18px`, 13px, weight 500, `box-shadow: --shadow-lg`
- Success toast: green `✓` prefix, auto-dismiss after **3 seconds**
- Error toast: red `✕` prefix, auto-dismiss after **5 seconds**, also has a manual dismiss button
- Animation: slide up from bottom, 200ms ease

#### SearchableSelect / SearchableMultiSelect

Use existing components at `src/components/ui/SearchableSelect.tsx` and `SearchableMultiSelect.tsx`.

#### Pagination

- Container: `padding: 12px 16px`, top border 1px `--border-light`, flex row space-between
- Left: "Showing X–Y of Z entries", 13px `--text-secondary`
- Right: page buttons — 1px border `--border-default`, `border-radius: 6px`, 12px, `bg-white`, hover `--gray-50`. Active page: `--primary-600` bg, white text.

---

### 2.6 Required States — Every List, Table, Form, Modal

#### Tables and Lists

Every table/list MUST implement all four states:

| State | Implementation |
|---|---|
| **Loading** | Skeleton rows — gray animated pulse blocks replacing cell content, 3–5 rows |
| **Error** | Error message centred with retry button: `"Failed to load. Try again"` — retry calls the same fetch |
| **Empty** | Centred illustration placeholder + contextual message e.g. `"No fund entries yet"` |
| **Loaded** | Normal table render |

#### Forms

| State | Implementation |
|---|---|
| **Validation error** | Field-level inline error below each invalid field (12px `--error-600`) |
| **Submitting** | Submit button shows spinner + "Loading..." text, button disabled, all inputs disabled |
| **API error** | Red error banner above the form footer: `"Something went wrong. Please try again."` |

#### Destructive Actions

Any action that cannot be undone (rejecting a claim, etc.) must show a confirmation dialog before proceeding.

---

### 2.7 Animation Patterns

Use `framer-motion` to match existing Sidebar.tsx micro-interactions:

- **Nav item hover:** `whileHover={{ x: 2 }}`, `whileTap={{ scale: 0.98 }}`
- **Button tap:** `whileTap={{ scale: 0.98 }}`
- **Modal open:** `scaleIn` — `initial: { opacity: 0, scale: 0.95 }`, `animate: { opacity: 1, scale: 1 }`, `duration: 0.18`
- **Dropdown open:** `initial: { opacity: 0, y: 10, scale: 0.95 }`, `animate: { opacity: 1, y: 0, scale: 1 }`, `duration: 0.15`
- **Page enter:** `animate-fade-in` — defined in globals.css as `fadeIn var(--transition-normal) ease`
- **Card hover (if hover=true):** `whileHover={{ y: -2 }}`

---

### 2.8 Language and Naming Conventions

- The organisation's total available fund balance is called **"Seragen account"** — not "syndicate". The word "syndicate" must not appear anywhere in code, UI labels, comments, or documentation.
- Available balance label: **"Available Seragen Account Balance"**
- Currency: always `₹` prefix with Indian locale formatting (`en-IN`), 2 decimal places
- Dates: always IST, formatted as `"16 May 2026"` (display) or `"YYYY-MM-DD"` (DB/API)
- Status values in DB: lowercase snake_case — `'pending'`, `'approved'`, `'rejected'`, `'completed'`
- The Export Excel button for Fund Management Activity Log lives **inside the Activity Log tab only**. It does NOT appear in the page header.

---

## 3. Role-Page Index

Complete reference of every role, every page, every route, and every component for Slices A–F.

| Role | Route | Page Title | Sidebar Nav Label | Components |
|---|---|---|---|---|
| `accountant` | `/accountant/funds` | Fund Management | Fund Management | `FundStatsCards`, `ReceiveFundsModal`, `AllocateFundsForm`, tabs: ActivityLog / UserBalancesTable / FundEntriesTable / AllocationsTable |
| `accountant` | `/accountant/claims` | Claims Management | Expense Claims | `ClaimsStatCards`, `RateConfigModal`, `ClaimsTable`, `ReviewModal` |
| `accountant` | `/accountant/hospital-charges` | Hospital Charge Allocation | Hospital Charges | `HospitalChargeTable`, `HospitalPricingModal` |
| `accountant` | `/accountant/billing` | Billing & Invoices | Billing & Invoices | `InvoiceTable`, `GenerateInvoiceModal` |
| `accountant` | `/accountant/inventory` | Inventory Logs | Inventory Logs | `MasterInventorySnapshot` (read-only) |
| `field_executive` | `/field-executive` | Field Executive Dashboard | My Assignments | Tabs: ActiveTasksTab / CompletedTab / MyInventoryTab. Each task card opens `TicketDetailModal` |
| `field_executive` | `/field-executive/claims` | My Balance | My Balance | `FEClaimsDashboard` (5 cards), `ExpenseClaimForm`, `MyExpenseClaimsTable` |
| `officer_backoffice` | `/officer-backoffice/inventory` | Inventory Management | Inventory | Tabs: InventoryTab / PerFEHoldingsTab / MovementLogTab / AllocateToFETab / AddStockTab |
| `manager` | `/manager/claims` | My Claims | Claims | `ManagerClaimsDashboard` (3 cards), `ManagerClaimForm`, `MyClaimsTable` |

**Accountant sidebar nav order:** Fund Management → Expense Claims → Hospital Charges → Billing & Invoices → Inventory Logs

**Root redirects on login:**
```typescript
accountant:         '/accountant/funds'
field_executive:    '/field-executive'
officer_backoffice: '/officer-backoffice/inventory'
manager:            '/manager/claims'  // for claims; other manager routes unchanged
```

---

## 4. Slice A — Fund Management

**Owner:** Accountant only
**Dependencies:** `users`, `tickets` (for expense_claims FK)

---

### 4.1 Database Schema

#### `funds` — append-only

```sql
CREATE TABLE public.funds (
  id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  entry_date  date NOT NULL,
  remarks     text,
  entered_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_funds_entry_date ON public.funds(entry_date DESC);
CREATE INDEX idx_funds_entered_by ON public.funds(entered_by);

-- Append-only: block UPDATE and DELETE at DB level
CREATE OR REPLACE FUNCTION public.fn_block_mutation_funds()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'funds is append-only: % is not allowed', TG_OP;
END;
$$;
CREATE TRIGGER trg_block_update_funds
  BEFORE UPDATE ON public.funds
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation_funds();
CREATE TRIGGER trg_block_delete_funds
  BEFORE DELETE ON public.funds
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation_funds();

ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accountant can read funds"
  ON public.funds FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');
CREATE POLICY "accountant can insert funds"
  ON public.funds FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'accountant');
```

#### `fund_allocations` — append-only with snapshot columns

```sql
CREATE TABLE public.fund_allocations (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  entry_date   date NOT NULL,
  remarks      text,
  allocated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Point-in-time snapshots — computed at INSERT time, NEVER updated after INSERT
  recipient_balance_after_alloc       numeric(12,2) NOT NULL,
  recipient_total_expenses_at_alloc   numeric(12,2) NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fund_allocations_user      ON public.fund_allocations(user_id);
CREATE INDEX idx_fund_allocations_date      ON public.fund_allocations(entry_date DESC);
CREATE INDEX idx_fund_allocations_allocator ON public.fund_allocations(allocated_by);

CREATE OR REPLACE FUNCTION public.fn_block_mutation_fund_allocations()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fund_allocations is append-only: % is not allowed', TG_OP;
END;
$$;
CREATE TRIGGER trg_block_update_fund_allocations
  BEFORE UPDATE ON public.fund_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation_fund_allocations();
CREATE TRIGGER trg_block_delete_fund_allocations
  BEFORE DELETE ON public.fund_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation_fund_allocations();

ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;
```

The `expense_claims` table is defined in Slice B §5.1. It is referenced here because approved claims feed the Activity Log and per-user balance calculation.

---

### 4.2 Derived Metrics (never stored — computed at API layer)

```
total_fund                        = SUM(funds.amount)
funds_used                        = SUM(fund_allocations.amount)
available_seragen_account_balance = total_fund - funds_used

per_user_funds_received  = SUM(fund_allocations.amount WHERE user_id = U)
per_user_expenses_logged = SUM(expense_claims.total_amount WHERE claimant_id = U AND status = 'approved')
per_user_current_balance = per_user_funds_received - per_user_expenses_logged  -- can be negative
```

> The three dashboard stat cards react ONLY to fund entries and allocations. Expense approvals do NOT affect the cards — they only affect per-user balance.
>
> Managers may have `total_received = 0` unless explicitly allocated funds. Their `current_balance` will be negative if approved claims exceed received funds. This is by design.

---

### 4.3 Snapshot Computation Logic

Called inside the `POST /api/fund-allocations` transaction, for each row inserted in order:

```typescript
const recipient_total_expenses_at_alloc = await supabase
  .from('expense_claims')
  .select('total_amount')
  .eq('claimant_id', U)
  .eq('status', 'approved')
  .lte('reviewed_at', T)
  // SUM total_amount

const prior_allocations_sum = await supabase
  .from('fund_allocations')
  .select('amount')
  .eq('user_id', U)
  .lt('created_at', T)
  // SUM amount PLUS amounts of any earlier rows in this same batch for same U

const recipient_balance_after_alloc =
  prior_allocations_sum + this_row_amount - recipient_total_expenses_at_alloc
```

**Batch ordering rule:** Multiple rows for the same recipient in one batch must be inserted sequentially (not in parallel). Each row's snapshot must include all prior rows in the same batch for that user.

---

### 4.4 Business Rules

| # | Rule |
|---|------|
| 1 | Allocations only to `role = 'manager'` OR `role = 'field_executive'`. API rejects other roles with 400. |
| 2 | `amount` must be `> 0` with at most 2 decimal places. |
| 3 | `SUM(batch_amounts) ≤ available seragen account balance`. Checked server-side. Client-side value is never trusted. |
| 4 | `entry_date` cannot be more than 30 days in the future. Cannot be earlier than the date of the first fund entry on record. |
| 5 | Multi-row batch is fully atomic: all rows commit or none do (single DB transaction). Partial success is not allowed. |
| 6 | Negative per-user balance on expense approval is permitted. No warning is shown to accountant. |
| 7 | No UPDATE or DELETE on `funds` or `fund_allocations` from any role — enforced by DB triggers AND absence of PATCH/DELETE endpoints. |
| 8 | Corrections are made by creating new reversing entries. Never edit existing rows. |
| 9 | `entry_date` = business date the accountant attaches. `created_at` = actual DB insert timestamp. Activity log sorts by `entry_date`. |
| 10 | Snapshot columns computed server-side within the same transaction as INSERT. Never recomputed after INSERT. |
| 11 | All timestamps and "today" use IST (Asia/Kolkata). |

---

### 4.5 API Surface

#### `GET /api/funds/stats`
- **Auth:** accountant only
- **Logic:** Returns `total_fund`, `funds_used`, and `available_seragen_account_balance`
- **Response:** `ApiResponse<{ total_fund: number, funds_used: number, available_seragen_account_balance: number }>`

---

#### `POST /api/funds/entries`
- **Auth:** accountant only
- **Zod schema:**
  ```typescript
  z.object({
    amount:     z.number().positive().multipleOf(0.01),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remarks:    z.string().max(500).optional(),
  })
  ```
- **Logic:** INSERT into `funds` with `entered_by = session.id`
- **Response:** `ApiResponse<FundEntry>`

---

#### `GET /api/funds/entries`
- **Auth:** accountant only
- **Query params:** `from?`, `to?`, `page?`, `pageSize?`
- **Logic:** SELECT with optional `entry_date BETWEEN from AND to`, ORDER BY `entry_date DESC`, paginated
- **Response:** `ApiResponse<PaginatedResponse<FundEntry>>`

---

#### `POST /api/fund-allocations`
- **Auth:** accountant only
- **Zod schema:**
  ```typescript
  z.object({
    entries: z.array(z.object({
      user_id:    z.string().uuid(),
      amount:     z.number().positive().multipleOf(0.01),
      entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      remarks:    z.string().max(500).optional(),
    })).min(1)
  })
  ```
- **Logic (all within one DB transaction):**
  1. Confirm each `user_id` has `role IN ('manager', 'field_executive')` → 400 if not
  2. Compute `available_seragen_account_balance` server-side
  3. Validate `SUM(entries[].amount) ≤ available_seragen_account_balance` → 400 if not
  4. Validate each `entry_date` (not > 30 days future, not before first fund entry)
  5. For each entry in order: compute snapshot columns → INSERT row
  6. Commit
- **Response:** `ApiResponse<FundAllocation[]>`
- **Errors:** 400 (insufficient balance, invalid role, bad date), 500 (transaction rollback)

---

#### `GET /api/fund-allocations`
- **Auth:** accountant only
- **Query params:** `user_id?`, `from?`, `to?`, `page?`, `pageSize?`
- **Logic:** JOIN users for recipient name/role and allocator name. Filter, paginate, ORDER BY `entry_date DESC`
- **Response:** `ApiResponse<PaginatedResponse<FundAllocation & { recipient_name, recipient_role, allocator_name }>>`

---

#### `GET /api/fund-allocations/user-balances`
- **Auth:** accountant only
- **Logic:**
  ```sql
  SELECT
    u.id AS user_id, u.full_name, u.role,
    COALESCE(SUM(fa.amount), 0) AS total_received,
    COALESCE(SUM(ec.total_amount) FILTER (WHERE ec.status = 'approved'), 0) AS total_expenses,
    COALESCE(SUM(fa.amount), 0) -
      COALESCE(SUM(ec.total_amount) FILTER (WHERE ec.status = 'approved'), 0) AS current_balance
  FROM users u
  LEFT JOIN fund_allocations fa ON fa.user_id = u.id
  LEFT JOIN expense_claims ec  ON ec.claimant_id = u.id
  WHERE u.role IN ('manager', 'field_executive')
  GROUP BY u.id, u.full_name, u.role
  ORDER BY CASE u.role WHEN 'manager' THEN 1 ELSE 2 END, u.full_name ASC;
  ```
- **Response:** `ApiResponse<UserBalance[]>`

---

#### `GET /api/funds/activity-log`
- **Auth:** accountant only
- **Query params:** `type` (all|allocation|expense), `from?`, `to?`, `user_id?`, `page?`, `pageSize?`
- **Logic (UNION query):**
  ```sql
  -- Allocation rows
  SELECT
    fa.id, 'allocation' AS type,
    fa.entry_date AS date,
    fa.user_id, u_r.full_name AS user_name, u_r.role AS user_role,
    fa.amount,
    fa.recipient_balance_after_alloc     AS balance_at_moment,
    fa.recipient_total_expenses_at_alloc AS total_expenses_at_moment,
    fa.remarks AS reference,
    u_a.full_name AS performed_by_name
  FROM fund_allocations fa
  JOIN users u_r ON u_r.id = fa.user_id
  JOIN users u_a ON u_a.id = fa.allocated_by

  UNION ALL

  -- Expense rows (approved claims only)
  SELECT
    ec.id, 'expense' AS type,
    ec.reviewed_at::date AS date,
    ec.claimant_id AS user_id, u_c.full_name, u_c.role,
    ec.total_amount,
    NULL AS balance_at_moment,
    NULL AS total_expenses_at_moment,
    COALESCE(CONCAT(t.uid, ' — ', ec.reason), ec.reason) AS reference,
    u_rv.full_name AS performed_by_name
  FROM expense_claims ec
  JOIN users u_c       ON u_c.id  = ec.claimant_id
  LEFT JOIN users u_rv ON u_rv.id = ec.reviewed_by
  LEFT JOIN tickets t  ON t.id    = ec.ticket_id
  WHERE ec.status = 'approved'
  ```
  Apply type/date/user filters. ORDER BY date DESC. Paginate.
- **Response:** `ApiResponse<PaginatedResponse<ActivityLogRow>>`

---

#### `GET /api/funds/export`
- **Auth:** accountant only
- **Query params:** `type` (all|allocation|expense), `from?`, `to?`
- **Logic:** Same UNION query as activity-log without pagination. Build SheetJS workbook: "Allocations" sheet and/or "Expenses" sheet depending on type. Dates formatted in IST, amounts as ₹X.XX. Stream binary.
- **Response:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

### 4.6 UI Components

#### Page: `/accountant/funds`

**Page header:**
- Title: "Fund Management"
- Subtitle: "Track Seragen account funds, allocations and expense activity"
- Right-aligned buttons: "+ Receive Funds" (`outline` variant) | "+ Allocate Funds" (`accent` variant, rose-pink)
- **No Export Excel button in the page header.** Export is inside the Activity Log tab only.

---

#### `FundStatsCards.tsx`

Three `Card` components in a 3-column responsive grid:

| Card | Label | Icon | Value colour |
|---|---|---|---|
| 1 | TOTAL FUND RECEIVED | `Wallet` (green) | `--text-primary` |
| 2 | FUNDS ALLOCATED | `TrendingDown` (coral `#e85a71`) | `--text-primary` |
| 3 | AVAILABLE BALANCE | `Wallet` (rose-pink `--accent-600`) | `--accent-600` |

Sub-text for card 1: "Last entry: {date}"
Sub-text for card 2: "Across {n} team members"
Sub-text for card 3: "Free to allocate"

- Loads from `GET /api/funds/stats` on mount
- Refreshes after every successful `POST /api/funds/entries` and `POST /api/fund-allocations`
- Implements loading (skeleton) and error (retry) states

---

#### `ReceiveFundsModal.tsx`

Trigger: "+ Receive Funds" button
Modal size: `md`
Title: "Receive Funds"

Fields:
- Amount (₹) * — numeric input, required, positive, 2dp
- Entry Date * — date input, default `getTodayIST()`, max 30 days future
- Remarks — textarea, optional, max 500 chars

On submit: `POST /api/funds/entries` → success toast → close → refresh stats + activity log

---

#### `AllocateFundsForm.tsx`

Trigger: "+ Allocate Funds" button
Modal size: `lg`
Title: "Allocate Funds"

Shows at top: available Seragen account balance as a read-only chip (green bg, ₹ amount, bold).

**Two modes — switch via checkbox "Allocate to multiple users":**

Single mode (default):
- `SearchableSelect` for user — fetches `GET /api/users?role=manager,field_executive`
- Amount (₹) * — numeric
- Entry Date * — date, default today
- Remarks — text, optional

Multi mode (checkbox checked):
- `SearchableMultiSelect` for users
- Checkbox "Same amount for all":
  - ON → single amount input applied to all selected users
  - OFF → one amount row per selected user (each labelled with user name + role badge)
- One Entry Date for the whole batch
- One Remarks for the whole batch
- Client-side validation: SUM(amounts) ≤ available balance (shown as helper text, re-validated server-side)

**Switching between single and multi mode does NOT clear already-entered values.**

On submit: `POST /api/fund-allocations { entries: [...] }` → success toast → refresh stats + activity log + user balances

---

#### Four tabs below the stat cards

Tabs (pill-style, see §2.5): **Activity Log** | **User Balances** | **Fund Entries** | **Allocations**

---

##### Tab 1: Activity Log (`ActivityLog.tsx`)

Filters row:
- Toggle group: All | Allocations | Expenses
- Date range: From → To (date inputs)
- User dropdown: "All Users" (optional filter)
- **Export Excel button** (right-aligned, `outline` variant) → `GET /api/funds/export` with current filter params

Table columns (PAGE_SIZE=20, paginated):

| Column | Allocation row | Expense row |
|---|---|---|
| Date | `entry_date` (IST format) | `reviewed_at` date (IST) |
| Type | Badge: "Allocation" (`primary` badge, pink) | Badge: "Expense" (`error` badge, red) |
| User | Recipient full name + role (muted sub-line) | Claimant full name + role (muted sub-line) |
| Amount | green `+₹X.XX` | red `−₹X.XX` |
| Balance at Moment | `recipient_balance_after_alloc` | `—` |
| Total Expenses Then | `recipient_total_expenses_at_alloc` | `—` |
| Reference / Remarks | remarks text | ticket UID — reason (or reason alone for manager claims) |
| Performed By | accountant name | accountant name (reviewer) |

---

##### Tab 2: User Balances (`UserBalancesTable.tsx`)

- Search bar above (client-side filter by name)
- Role filter pills: All / Managers / Field Executives

Table columns:

| Column | Notes |
|---|---|
| Name + Role | Bold name, muted role on sub-line |
| Total Funds Received | green text |
| Total Expenses | red text |
| Current Balance | default text; if negative: `--error-600` text + `border-left: 2px solid --error-600` on the entire row |

Managers with no allocation show Total Received = ₹0.00. Their approved claim expenses still appear under Total Expenses.

Source: `GET /api/fund-allocations/user-balances`

---

##### Tab 3: Fund Entries

Filters: Date range (From / To)

Table columns: Entry Date | Amount | Remarks | Entered By | Created At (IST timestamp)

Source: `GET /api/funds/entries` (paginated, ORDER BY entry_date DESC)

---

##### Tab 4: Allocations

Filters: User dropdown | Date range

Table columns: Entry Date | Recipient (name + role badge) | Amount (green) | Balance After | Expenses at Time | Remarks | Allocated By

Source: `GET /api/fund-allocations` (paginated, ORDER BY entry_date DESC)

---

## 5. Slice B — Expense Claims

**Owners:** field_executive (submit), manager (submit), accountant (review + rate config)
**Depends on:** `expense_claims` table (defined here), `tickets`, `claim_rate_config`

---

### 5.1 Database Schema

#### `expense_claims`

```sql
CREATE TABLE public.expense_claims (
  id                        uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  claimant_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ticket_id                 uuid REFERENCES public.tickets(id) ON DELETE SET NULL,

  outstation_travel         boolean NOT NULL DEFAULT false,
  from_place                text,
  to_place                  text,

  distance_km               numeric(8,2),
  petrol_amount             numeric(12,2) NOT NULL DEFAULT 0,
  petrol_rate_at_submission numeric(8,2),

  breakfast_amount          numeric(12,2) NOT NULL DEFAULT 0,
  lunch_amount              numeric(12,2) NOT NULL DEFAULT 0,
  dinner_amount             numeric(12,2) NOT NULL DEFAULT 0,

  reimbursement_items       jsonb NOT NULL DEFAULT '[]'::jsonb,

  accommodation_amount      numeric(12,2) NOT NULL DEFAULT 0,
  travel_allowance_amount   numeric(12,2) NOT NULL DEFAULT 0,

  miscellaneous_amount      numeric(12,2) NOT NULL DEFAULT 0,
  miscellaneous_description text,

  reason                    text,          -- required for manager free-standing claims only

  proof_urls                text[] NOT NULL DEFAULT '{}',

  notes                     text,

  total_amount              numeric(12,2) NOT NULL,

  status                    varchar(15) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
  reviewed_by               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at               timestamptz,
  review_notes              text,

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX idx_expense_claims_claimant ON public.expense_claims(claimant_id);
CREATE INDEX idx_expense_claims_ticket   ON public.expense_claims(ticket_id);
CREATE INDEX idx_expense_claims_status   ON public.expense_claims(status);
CREATE INDEX idx_expense_claims_created  ON public.expense_claims(created_at DESC);

CREATE TRIGGER trigger_expense_claims_updated_at
  BEFORE UPDATE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
```

#### `claim_rate_config` — singleton table

```sql
CREATE TABLE public.claim_rate_config (
  id                 uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  petrol_rate_per_km numeric(8,2) NOT NULL DEFAULT 4.00,
  breakfast_max      numeric(8,2) NOT NULL DEFAULT 100.00,
  lunch_max          numeric(8,2) NOT NULL DEFAULT 150.00,
  dinner_max         numeric(8,2) NOT NULL DEFAULT 150.00,
  updated_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at         timestamptz DEFAULT now()
);
-- Always exactly ONE row. Seed it with the defaults above on first deploy.
-- Only UPDATE this row. Never INSERT new rows.
```

Seed the singleton row:
```sql
INSERT INTO public.claim_rate_config
  (petrol_rate_per_km, breakfast_max, lunch_max, dinner_max)
VALUES (4.00, 100.00, 150.00, 150.00);
```

---

### 5.2 Business Rules

| # | Rule |
|---|------|
| 1 | FE claims MUST have a `ticket_id`. Ticket `status` must be `'completed'` and `assigned_fe_id` must match session user. |
| 2 | Manager claims MUST have `ticket_id = NULL` (free-standing). `reason` field is required for manager claims. |
| 3 | One pending/approved claim per FE per ticket. Rejected claims can be resubmitted as new rows (old rejected row stays). |
| 4 | Only accountant can change `status` (pending → approved or rejected). |
| 5 | Approval deducts from per-user balance (derived — no separate DB write). Approved claims appear in accountant's Activity Log as expense rows. |
| 6 | Manager claim approval deducts from Seragen account balance and appears in the Activity Log under that manager's name. |
| 7 | Claimant cannot edit or delete a submitted claim. |
| 8 | Proof upload is optional for both FE and manager. Files go to Supabase Storage bucket `'receipts'`, path `{claim_id}/{filename}`. Multiple files allowed; stored as URL array in `proof_urls`. |
| 9 | Partial approval is NOT supported. Full amount only. |
| 10 | `petrol_amount = distance_km × petrol_rate_per_km` (from `claim_rate_config`). Computed client-side for display; verified server-side (±0.01 tolerance). `petrol_rate_at_submission` stores the rate active at time of submission. |
| 11 | `breakfast_amount ≤ breakfast_max`, `lunch_amount ≤ lunch_max`, `dinner_amount ≤ dinner_max`. Caps enforced server-side → 400 if exceeded. |
| 12 | `total_amount` = sum of all amount fields. Computed server-side before INSERT. Client-side total is display-only. |
| 13 | `claim_rate_config` has exactly one row. Accountant updates it via the Rate Config button. Changes apply to new submissions only. `petrol_rate_at_submission` preserves the rate active at submission time for audit. |

---

### 5.3 API Surface

#### `GET /api/claim-rate-config`
- **Auth:** accountant, field_executive, manager
- **Logic:** SELECT the single row
- **Response:** `ApiResponse<ClaimRateConfig>`

---

#### `PATCH /api/claim-rate-config`
- **Auth:** accountant only
- **Zod schema:**
  ```typescript
  z.object({
    petrol_rate_per_km: z.number().positive().multipleOf(0.01).optional(),
    breakfast_max:      z.number().positive().multipleOf(0.01).optional(),
    lunch_max:          z.number().positive().multipleOf(0.01).optional(),
    dinner_max:         z.number().positive().multipleOf(0.01).optional(),
  }).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' })
  ```
- **Logic:** UPDATE the single row. `updated_by = session.id`, `updated_at = NOW()`
- **Response:** `ApiResponse<ClaimRateConfig>`

---

#### `POST /api/expense-claims`
- **Auth:** field_executive, manager
- **Zod schema:**
  ```typescript
  z.object({
    ticket_id:                 z.string().uuid().optional(),
    outstation_travel:         z.boolean().default(false),
    from_place:                z.string().max(200).optional(),
    to_place:                  z.string().max(200).optional(),
    distance_km:               z.number().min(0).optional(),
    petrol_amount:             z.number().min(0).default(0),
    breakfast_amount:          z.number().min(0).default(0),
    lunch_amount:              z.number().min(0).default(0),
    dinner_amount:             z.number().min(0).default(0),
    reimbursement_items:       z.array(z.object({
                                 name:   z.string().max(100),
                                 amount: z.number().min(0),
                               })).default([]),
    accommodation_amount:      z.number().min(0).default(0),
    travel_allowance_amount:   z.number().min(0).default(0),
    miscellaneous_amount:      z.number().min(0).default(0),
    miscellaneous_description: z.string().max(500).optional(),
    reason:                    z.string().max(1000).optional(),
    proof_urls:                z.array(z.string().url()).default([]),
    notes:                     z.string().max(1000).optional(),
  })
  ```
- **Logic:**
  - If FE: `ticket_id` required; ticket must be `completed` and `assigned_fe_id = session.id`; no existing pending/approved claim from this FE for this ticket
  - If manager: `ticket_id` must be null/omitted; `reason` is required
  - Fetch `claim_rate_config`. Validate petrol_amount and food caps server-side.
  - Compute `total_amount` server-side
  - INSERT with `claimant_id = session.id`, `status = 'pending'`, `petrol_rate_at_submission = config.petrol_rate_per_km`
- **Response:** `ApiResponse<ExpenseClaim>`

---

#### `GET /api/expense-claims`
- **Auth:** accountant (all), field_executive (own), manager (own)
- **Query params:** `status?`, `from?`, `to?`, `user_id?` (accountant only), `page?`, `pageSize?`
- **Logic:** FE/manager filtered to `claimant_id = session.id`. JOIN users for claimant name, JOIN tickets for ticket UID and patient name.
- **Response:** `ApiResponse<PaginatedResponse<ExpenseClaim & { claimant_name, ticket_uid, patient_name }>>`

---

#### `GET /api/expense-claims/stats`
- **Auth:** accountant, field_executive, manager
- **Logic (role-dependent response shape):**
  - **Accountant:** `{ pending_count: number, total_approved_amount: number, total_claims_count: number }`
  - **FE:** `{ advance_received: number, total_claimed: number, total_approved: number, pending_count: number, current_balance: number }`
    - `advance_received` = SUM of fund_allocations for this FE
    - `current_balance` = advance_received − total_approved
  - **Manager:** `{ total_claimed: number, total_approved: number, pending_count: number }`
- **Response:** `ApiResponse<ClaimsStats>`

---

#### `PATCH /api/expense-claims/[id]`
- **Auth:** accountant only
- **Zod schema:**
  ```typescript
  z.object({
    status:       z.enum(['approved','rejected']),
    review_notes: z.string().max(1000).optional(),
  }).refine(d => d.status === 'approved' || !!d.review_notes,
    { message: 'review_notes required when rejecting' })
  ```
- **Logic:**
  1. Fetch claim, confirm `status = 'pending'` → 400 if already reviewed
  2. UPDATE `status`, `reviewed_by = session.id`, `reviewed_at = NOW()`
  3. If `status = 'rejected'` and no `review_notes` → 400
- **Response:** `ApiResponse<ExpenseClaim>`

---

### 5.4 UI — Accountant Claims Management Page (`/accountant/claims`)

#### `ClaimsStatCards.tsx`

Three stat cards in a 3-column grid at the top of the page:

| Card | Label | Icon | Value |
|---|---|---|---|
| 1 | PENDING CLAIMS | `Clock` (amber) | count (integer) |
| 2 | TOTAL APPROVED (FILTERED) | `BadgeIndianRupee` (green) | ₹ amount |
| 3 | TOTAL CLAIMS | `User` (blue) | count (integer) |

Data from `GET /api/expense-claims/stats`. Card 2 updates when the status filter pill changes.

---

#### Filter pills + Rate Config

Below the stat cards, one row with two elements:

**Left:** Filter pills — **All** | **Pending** | **Approved** | **Rejected**
- Selecting a pill filters the table below and refreshes Card 2 (Total Approved filtered)
- Active pill: `--accent-600` bg (#db2777), white text

**Right:** Rate Config button (small, `outline` variant, gear icon)
- Label: "⚙ Rate Config"
- Opens `RateConfigModal.tsx`

---

#### `RateConfigModal.tsx`

Modal size: `md`
Title: "Claim Rate Configuration"

Info notice at top: "Changes apply to new submissions only. The rate active at time of submission is preserved for audit."

Fields:
- Petrol Rate (₹/km) — numeric, 2dp, current value pre-populated from `GET /api/claim-rate-config`
- Breakfast Max (₹) — numeric, 2dp
- Lunch Max (₹) — numeric, 2dp
- Dinner Max (₹) — numeric, 2dp

On save: `PATCH /api/claim-rate-config` → success toast → close

---

#### `ClaimsTable.tsx`

Filters (toolbar):
- Search input: "Search claimant or ticket..."
- Date range: From → To
- User dropdown: "All Users"

Table columns: Date | Claimant | Role | Ticket (link if exists, "—" for manager claims) | Total Amount | Status badge | Actions

Actions column (pending rows only):
- "Approve" button (`success` variant, small) → quick-approve via `ReviewModal`
- "Review" button (`outline` variant, small) → full-detail `ReviewModal`

Approved/Rejected rows: show review date as muted text in actions column. No action buttons.

---

#### `ReviewModal.tsx`

Modal size: `lg`
Title: "Review Expense Claim"
Sub-title: "{ticket UID} — {claimant name}"

**Claim detail section** (gray bg box):
- Grid (2 columns): Claimant | Ticket UID | Submitted date | Total Amount (larger text)
- Separator line
- Structured breakdown:
  - Outstation Travel: Yes/No + from/to places if yes
  - Petrol: distance km × rate = ₹ amount
  - Breakfast / Lunch / Dinner amounts
  - Reimbursement items (list of name + amount)
  - Accommodation amount
  - Travel Allowance amount
  - Miscellaneous: amount + description
  - Notes
  - Reason (for manager claims)
- Separator line
- Proof Uploads section:
  - If `proof_urls` is non-empty: for each URL, show image preview (if image) or download link (if PDF)
  - If empty: "No proof uploaded"

**Reject notes field** (hidden initially):
- Appears when Reject button is clicked
- Label: "Rejection Reason *"
- Textarea, required, max 1000 chars
- If submitted without notes → client validation error

**Footer buttons:**
- Cancel (`secondary`)
- Reject (`danger`) — shows rejection notes field, then `PATCH { status: 'rejected', review_notes }`
- Approve (`success`) — `PATCH { status: 'approved' }`
- Both action buttons show loading state during request

---

### 5.5 UI — FE Claims Page (`/field-executive/claims`)

#### `FEClaimsDashboard.tsx`

Five stat cards in a 5-column grid:

| Position | Label | Icon | Notes |
|---|---|---|---|
| 1 | ADVANCE RECEIVED | `Wallet` (pink `--primary-600`) | ₹ amount |
| 2 | TOTAL CLAIMED | `ClipboardList` (blue) | ₹ amount |
| 3 | TOTAL APPROVED | `CheckCircle2` (green) | ₹ amount |
| 4 | PENDING CLAIMS | `Clock` (amber) | count |
| 5 | CURRENT BALANCE | `Wallet` (green) | ₹ amount; red border on card if negative |

Card 5 (Current Balance): if negative, apply `border: 1px solid --error-500` on the card and display value in `--error-600`.

Data from `GET /api/expense-claims/stats` (own user, FE shape).

---

#### Raise Claim Button

- Visible only when FE has at least one completed ticket with no existing pending/approved claim
- `btn-coral` variant, label "+ Raise Claim"
- Opens `ExpenseClaimForm.tsx` modal

---

#### `ExpenseClaimForm.tsx`

Triggered from completed ticket page (Claim Expenses button) OR from Raise Claim button on My Balance page.

Modal size: `lg`, scrollable body
Title: "Expense Claim"
Sub-title: "{ticket UID} — {ticket name}" (pre-populated from the ticket)

The form is one scrollable modal with these sections in this exact order:

**1. Outstation Travel toggle**
- Row with pink background (`--primary-50`), icon (bus/vehicle), label "Outstation Travel?", sub-text "Enable for city/state travel expenses", toggle switch on right
- Toggle starts in ON state (pink) by default
- When ON: shows "From Place" + "To Place" text inputs side by side below

**2. Petrol (₹X/KM)**
- Section title: "PETROL (₹{rate}/KM)" — rate pulled from `GET /api/claim-rate-config`
- "Distance (km)" label
- Two fields side by side: Distance input (numeric) | Amount (read-only, auto-calculated = distance × rate, shows in `--primary-600`)

**3. Food Allowance**
- Section title: "FOOD ALLOWANCE"
- Three rows: Breakfast (max ₹{breakfast_max}) | Lunch (max ₹{lunch_max}) | Dinner (max ₹{dinner_max})
- Each row: label + max cap as sub-text on left, number input on right
- Client-side: prevents input exceeding cap, shows cap as placeholder/helper text

**4. Reimbursement**
- Section title: "REIMBURSEMENT" with "+ ADD ITEM" button on the right
- Default items (pre-populated): Tea | Coffee | Snacks | Water Bottle — each with a number input
- "+ ADD ITEM" appends a new row with a name text input + amount number input
- Each row is removable

**5. Accommodation & Travel Allowance**
- Two fields side by side:
  - "ACCOMMODATION" — single ₹ amount input
  - "TRAVEL ALLOWANCE" — single ₹ amount input

**6. Proof / Support Photos**
- Section title: "PROOF / SUPPORT PHOTOS"
- Upload area: dashed pink border (`--primary-300`), pink background (`--primary-50`), camera icon (`--primary-400`), label "Upload Petrol Bills / Hotel Receipts"
- Multiple files allowed
- Upload flow: `input[type=file]` → `supabase.storage.from('receipts').upload(...)` → get URL → add to `proof_urls` array

**7. Miscellaneous Expenses**
- Section title: "+ MISCELLANEOUS EXPENSES"
- "AMOUNT (₹)" label + numeric input
- "DESCRIPTION (GLOVES, SPONGE, ETC.)" label + text input, placeholder "What was this for?"

**8. Notes (Optional)**
- Section title: "NOTES (OPTIONAL)"
- Textarea, placeholder "Any additional info..."

**Footer (pinned at bottom of modal):**
- Left: "Total Claim Amount" label + live-calculated total in `--primary-600`, 18px bold (`₹0.00` format)
- Total = petrol_amount + breakfast + lunch + dinner + sum(reimbursement_items) + accommodation + travel_allowance + miscellaneous
- Total is display-only; server recomputes it
- Right: Cancel (`secondary`) | Submit Claim (`btn-coral`, primary, disabled when total = 0)

On submit: `POST /api/expense-claims` → success toast → close → refresh FE claims list and stat cards

---

#### My Expense Claims Table

Below the stat cards.

Columns: Date Filed | Ticket | Patient | Claimed | Approved Amt | Status badge | Notes (shows `review_notes` if rejected, "—" otherwise)

Status badges: Approved (green) | Pending (amber) | Rejected (red)

Source: `GET /api/expense-claims` (own claims, paginated, filter by status if pill selected)

---

### 5.6 UI — Manager Claims Page (`/manager/claims`)

#### `ManagerClaimsDashboard.tsx`

Three stat cards in a 3-column grid:

| Card | Label | Icon | Value |
|---|---|---|---|
| 1 | TOTAL CLAIMED | `ClipboardList` (blue) | ₹ amount |
| 2 | TOTAL APPROVED | `CheckCircle2` (green) | ₹ amount |
| 3 | PENDING CLAIMS | `Clock` (amber) | count |

Data from `GET /api/expense-claims/stats` (own user, manager shape).

---

#### Raise Claim Button

- Always visible for managers (not conditional on tickets)
- `btn-coral` variant, label "+ Raise Claim"
- Opens `ManagerClaimForm.tsx`

---

#### `ManagerClaimForm.tsx`

Simple modal. Modal size: `md`. Title: "Raise Expense Claim"

Fields:
- Reason * — textarea, required, max 1000 chars, placeholder "Explain the reason for this expense..."
- Amount (₹) * — numeric, required, positive, 2dp
- Proof Upload — optional, same upload flow as FE (`supabase.storage.from('receipts').upload(...)`)

`ticket_id` is always null for manager claims.

On submit: `POST /api/expense-claims` (reason required, no ticket_id) → success toast → close → refresh

---

#### My Claims Table

Below the stat cards.

Columns: Date Filed | Reason (truncated to 60 chars) | Claimed | Approved Amt | Status badge | Notes

Source: `GET /api/expense-claims` (own claims, paginated)

---

## 6. Slice C — Hospital Charge Allocation

**Owner:** Accountant ONLY. No other role has access.
**Depends on:** `hospitals`, `service_types`

---

### 6.1 Business Rules

| # | Rule |
|---|------|
| 1 | Active charge for a (hospital, service_type) pair = row where `effective_from ≤ TODAY ≤ valid_until` (or `valid_until IS NULL`). |
| 2 | Multiple active rows for same pair → use row with latest `created_at`. |
| 3 | `valid_until` must be `≥ effective_from` (DB CHECK). |
| 4 | `amount ≥ 0` (complimentary services are allowed). |
| 5 | No UPDATE or DELETE — corrections are new rows with a new `effective_from`. |
| 6 | Historical rows persist. Shown when "Show History" toggle is ON. |
| 7 | GST and TDS are independent booleans per row. Rates are constants: GST = 18%, TDS = 10%. |
| 8 | Only the accountant can create and view hospital charges. |

---

### 6.2 Database Schema

```sql
CREATE TABLE public.hospital_service_charges (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  hospital_id      uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  service_type_id  uuid NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
  amount           numeric(12,2) NOT NULL CHECK (amount >= 0),
  gst_applicable   boolean NOT NULL DEFAULT false,
  tds_applicable   boolean NOT NULL DEFAULT false,
  effective_from   date NOT NULL,
  valid_until      date,
  created_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= effective_from)
);

CREATE INDEX idx_hsc_hospital  ON public.hospital_service_charges(hospital_id);
CREATE INDEX idx_hsc_service   ON public.hospital_service_charges(service_type_id);
CREATE INDEX idx_hsc_effective ON public.hospital_service_charges(effective_from DESC);

ALTER TABLE public.hospital_service_charges ENABLE ROW LEVEL SECURITY;
```

---

### 6.3 Active Charge Lookup Query

Used internally by Slice D invoice generation:

```sql
SELECT *
FROM hospital_service_charges
WHERE hospital_id     = :hospital_id
  AND service_type_id = :service_type_id
  AND effective_from <= CURRENT_DATE
  AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
ORDER BY created_at DESC
LIMIT 1;
```

---

### 6.4 API Surface

#### `GET /api/hospital-charges`
- **Auth:** accountant only
- **Query params:** `hospital_id?`, `service_type_id?`, `active_only?` (boolean, default false), `page?`, `pageSize?`
- **Logic:** When `active_only=true`, apply active charge WHERE clause. JOIN hospitals and service_types for names. ORDER BY `effective_from DESC`.
- **Response:** `ApiResponse<PaginatedResponse<HospitalServiceCharge & { hospital_name, service_name, service_category }>>`

---

#### `POST /api/hospital-charges`
- **Auth:** accountant only
- **Zod schema:**
  ```typescript
  z.object({
    hospital_id:     z.string().uuid(),
    service_type_id: z.string().uuid(),
    amount:          z.number().min(0).multipleOf(0.01),
    gst_applicable:  z.boolean(),
    tds_applicable:  z.boolean(),
    effective_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    valid_until:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).refine(d => !d.valid_until || d.valid_until >= d.effective_from,
    { message: 'valid_until must be on or after effective_from' })
  ```
- **Logic:** INSERT with `created_by = session.id`
- **Response:** `ApiResponse<HospitalServiceCharge>`

---

### 6.5 UI Components

#### Page: `/accountant/hospital-charges`

**Page header:**
- Title: "Hospital Charge Allocation"
- Subtitle: "Manage service charge rates per hospital"
- Right: "+ Add Allocation" button (`accent` variant)

**Two summary stat cards:**

| Card | Label | Icon |
|---|---|---|
| 1 | ACTIVE HOSPITALS | `Building2` (pink) |
| 2 | CURRENT ALLOCATIONS | `CheckCircle2` (green) |

**Filter toolbar (below stat cards, in a card container):**
- Search bar: placeholder "Search by hospital or service name..."
- All Hospitals dropdown
- "Hide History" / "Show History" button (toggles `active_only` query param)

---

#### Hospital Charges Table

**Exact column order:**

| Column | Notes |
|---|---|
| HOSPITAL | Hospital name |
| DIAGNOSTICS | Service name if `service_category = 'diagnostics'`, else "—" |
| THERAPEUTICS | Service name if `service_category = 'therapeutics'`, else "—" |
| AMOUNT (₹) | Formatted currency |
| GST | ✓ (success badge) if `gst_applicable = true`, else "—" |
| TDS | ✓ (success badge) if `tds_applicable = true`, else "—" |
| START DATE | `effective_from` formatted |
| END DATE | `valid_until` formatted, or "Open-ended" if null |
| ACTIONS | "Edit" button (`outline`, small) → opens modal pre-filled for that hospital |

Note on DIAGNOSTICS / THERAPEUTICS columns: each row is for one specific service. If that service's category is diagnostics, its name goes under DIAGNOSTICS and THERAPEUTICS shows "—". Vice versa for therapeutics.

---

#### Hospital Pricing Management Table Modal

Modal size: `xl`
Title: "Hospital Pricing Management Table"

**Top header section (inside a gray bg box):**

Four fields in a 4-column grid:
- Target Hospital * — `SearchableSelect` (required; highlighted with pink border when empty)
- Service Category — dropdown: All / Diagnostics / Therapeutics
- Effective From * — date input, required
- Valid Until — date input, optional (labelled "Optional")

**Search bar below header:** placeholder "Search for a service in the table..."

**Per-service rows table:**

| Column | Notes |
|---|---|
| SERVICE NAME | Service name on line 1; category label below in small pink caps (e.g. "DIAGNOSTICS") |
| CURRENT (₹) | Read-only; shows current active charge, or "–" if none |
| NEW (₹) | Numeric input, format "0.00" |
| GST | Toggle switch |
| TDS | Toggle switch |

On submit: `POST /api/hospital-charges` once for every row where NEW (₹) has been filled in (non-zero or explicitly set). Success toast → close → refresh table.

---

## 7. Slice D — Billing & Invoice

**Owner:** Accountant
**Depends on:** Slice C (`hospital_service_charges`), `tickets`, `hospitals`, `service_types`

---

### 7.1 Business Rules

| # | Rule |
|---|------|
| 1 | Ticket must have `status = 'completed'` before invoice can be generated. |
| 2 | One invoice per ticket (UNIQUE constraint on `ticket_id`). |
| 3 | No active charge for ticket's hospital + service_type → 400, cannot generate. |
| 4 | Invoice is immutable once generated. No regeneration. |
| 5 | `total_amount = base_amount + gst_amount - tds_amount` |
| 6 | GST = `base_amount × 0.18` if `gst_applicable = true`, else 0 |
| 7 | TDS = `base_amount × 0.10` if `tds_applicable = true`, else 0 |
| 8 | Invoice UID format: `INV-YYYYMMDD-####` — sequence resets daily (IST), padded to 4 digits. |
| 9 | PDF stored in Supabase Storage bucket `'invoices'`, path `{invoice_id}/invoice.pdf`. |

---

### 7.2 Database Schema

```sql
CREATE TABLE public.invoices (
  id                         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  uid                        varchar(30) NOT NULL UNIQUE,
  ticket_id                  uuid NOT NULL UNIQUE REFERENCES public.tickets(id) ON DELETE RESTRICT,
  hospital_service_charge_id uuid NOT NULL REFERENCES public.hospital_service_charges(id),
  base_amount                numeric(12,2) NOT NULL,
  gst_amount                 numeric(12,2) NOT NULL DEFAULT 0,
  tds_amount                 numeric(12,2) NOT NULL DEFAULT 0,
  total_amount               numeric(12,2) NOT NULL,
  pdf_url                    text NOT NULL,
  generated_by               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  generated_at               timestamptz DEFAULT now(),
  created_at                 timestamptz DEFAULT now()
);

CREATE INDEX idx_invoices_ticket ON public.invoices(ticket_id);
CREATE INDEX idx_invoices_date   ON public.invoices(generated_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
```

---

### 7.3 Invoice UID Generation

```typescript
// Server-side, inside POST /api/invoices handler:
const todayIST    = getTodayIST()                    // "2026-05-16"
const dateCompact = todayIST.replace(/-/g, '')       // "20260516"

const { count } = await supabase
  .from('invoices')
  .select('*', { count: 'exact', head: true })
  .like('uid', `INV-${dateCompact}-%`)

const sequence = String((count ?? 0) + 1).padStart(4, '0')
const uid = `INV-${dateCompact}-${sequence}`          // "INV-20260516-0001"
```

---

### 7.4 API Surface

#### `POST /api/invoices`
- **Auth:** accountant only
- **Zod schema:** `z.object({ ticket_id: z.string().uuid() })`
- **Logic (8 steps in order):**
  1. Fetch ticket by `ticket_id` → 404 if not found
  2. Confirm `ticket.status = 'completed'` → 400 if not
  3. Confirm no existing invoice for this `ticket_id` → 409 Conflict if exists
  4. Fetch active charge (§6.3) for `ticket.hospital_id` + `ticket.service_type_id` → 400 if none
  5. Calculate: `base = charge.amount`, `gst = gst_applicable ? base × 0.18 : 0`, `tds = tds_applicable ? base × 0.10 : 0`, `total = base + gst − tds`
  6. Generate UID (§7.3)
  7. Generate PDF via `lib/pdf-utils.ts` → upload to `invoices` bucket → get URL
  8. INSERT invoice row
- **Response:** `ApiResponse<Invoice>`

---

#### `GET /api/invoices`
- **Auth:** accountant only
- **Query params:** `from?`, `to?`, `hospital_id?`, `page?`, `pageSize?`
- **Logic:** JOIN tickets, hospitals, service_types. ORDER BY `generated_at DESC`. Paginated.
- **Response:** `ApiResponse<PaginatedResponse<Invoice & { ticket_uid, hospital_name, service_name }>>`

---

#### `GET /api/invoices/[id]/pdf`
- **Auth:** accountant only
- **Logic:** Fetch invoice, generate signed Supabase Storage URL (60-min expiry) → 302 redirect
- **Response:** 302 redirect to signed URL

---

### 7.5 PDF Layout

> Final invoice design to be provided by Anish. The following dynamic fields are confirmed. Do not hard-code them.

Dynamic fields (populate from DB at generation time):
- Invoice UID (e.g. INV-20260516-0001)
- Generated date and time in IST
- Hospital name, address, city
- Service type name and category
- Ticket UID
- Base amount, GST amount (with rate), TDS amount (with rate), Total amount
- Generated by (accountant full name)

---

### 7.6 UI Components

#### Page: `/accountant/billing`

**Page header:**
- Title: "Billing & Invoices"
- Right: "+ Generate Invoice" button (`accent` variant)

**Filter toolbar:** Date range (From / To) | Hospital dropdown | Search (by invoice UID or ticket UID)

**Invoices table columns:** Invoice UID | Ticket UID | Hospital | Service | Base Amount | GST | TDS | Total | Date | Actions

Actions per row: "View PDF" (`outline`, opens signed URL in new tab) | "Download" (`secondary`, file download)

---

#### `GenerateInvoiceModal.tsx`

Modal size: `lg`
Title: "Generate Invoice"

- `SearchableSelect` for completed tickets with no existing invoice — fetches `GET /api/tickets?status=completed&no_invoice=true`
- On ticket selection: shows info box + invoice preview card:
  - Hospital, Service, Active charge rate
  - Estimated total with GST/TDS breakdown (read-only)
- Confirm button (`accent`, "Generate & Save PDF") — disabled until a ticket is selected
- Error display if no active charge exists for the selected ticket

On confirm: `POST /api/invoices` → success toast → close → refresh invoice table

---

## 8. Slice E — Backoffice Inventory

**Owner:** officer_backoffice (write), field_executive (read own + 24hr override), accountant (read — Slice F)
**Depends on:** `service_types` (kit JSONB — already structured), `users`, `tickets`

---

### 8.1 Business Rules

| # | Rule |
|---|------|
| 1 | Only `officer_backoffice` can add stock, set cost, set thresholds, and create FE allocations. |
| 2 | Warehouse stock = `SUM(inventory_stock.quantity) − SUM(inventory_allocations.quantity)` per item. |
| 3 | FE stock = `SUM(allocations.quantity WHERE to_user_id = FE) − SUM(consumptions.quantity_used WHERE fe_id = FE)` per item. |
| 4 | Allocation to FE must not exceed current warehouse stock → 400 if insufficient. |
| 5 | On ticket completion: auto-create one consumption row per kit item using `kit_default_quantity`. Fully automatic — no FE input needed. |
| 6 | FE can override `quantity_used` within 24 hours of `ticket.completed_at`. Requires `override_reason`. |
| 7 | FE stock cannot go negative via override → 400. |
| 8 | `service_types.kit` is structured JSONB: `[{ "item_id": "uuid", "quantity": 2 }]`. Already in this format — no migration needed. |
| 9 | Each item has a `minimum_threshold`. If warehouse stock OR FE holding drops below this value, the quantity is shown in red (`--error-600`) everywhere it appears. |
| 10 | Each item has a `cost_per_unit` (set by backoffice). Used in Slice F total cost calculation. |
| 11 | The inventory section within each ticket page shows the kit items and quantities required. |

---

### 8.2 Database Schema

```sql
CREATE TABLE public.inventory_items (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name              varchar(100) NOT NULL UNIQUE,
  unit              varchar(30) NOT NULL DEFAULT 'piece',
  cost_per_unit     numeric(12,2) NOT NULL DEFAULT 0,
  minimum_threshold integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE public.inventory_stock (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  item_id    uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  notes      text,
  added_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_inv_stock_item ON public.inventory_stock(item_id);

CREATE TABLE public.inventory_allocations (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  item_id      uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  from_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  to_user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  quantity     integer NOT NULL CHECK (quantity > 0),
  allocated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX idx_inv_alloc_item ON public.inventory_allocations(item_id);
CREATE INDEX idx_inv_alloc_to   ON public.inventory_allocations(to_user_id);

CREATE TABLE public.inventory_consumptions (
  id                   uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  item_id              uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  fe_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ticket_id            uuid NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  quantity_used        integer NOT NULL CHECK (quantity_used > 0),
  kit_default_quantity integer NOT NULL,
  overridden           boolean NOT NULL DEFAULT false,
  override_reason      text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (item_id, fe_id, ticket_id)
);
CREATE INDEX idx_inv_cons_item   ON public.inventory_consumptions(item_id);
CREATE INDEX idx_inv_cons_fe     ON public.inventory_consumptions(fe_id);
CREATE INDEX idx_inv_cons_ticket ON public.inventory_consumptions(ticket_id);
```

---

### 8.3 Stock Level Queries

```sql
-- Warehouse stock per item
SELECT
  ii.id, ii.name, ii.unit, ii.cost_per_unit, ii.minimum_threshold,
  COALESCE(SUM(s.quantity), 0)  AS total_added,
  COALESCE(SUM(a.quantity), 0)  AS total_allocated,
  COALESCE(SUM(s.quantity), 0) - COALESCE(SUM(a.quantity), 0) AS warehouse_stock,
  (COALESCE(SUM(s.quantity), 0) - COALESCE(SUM(a.quantity), 0)) < ii.minimum_threshold
    AS below_threshold
FROM inventory_items ii
LEFT JOIN inventory_stock       s ON s.item_id = ii.id
LEFT JOIN inventory_allocations a ON a.item_id = ii.id
GROUP BY ii.id, ii.name, ii.unit, ii.cost_per_unit, ii.minimum_threshold;

-- FE stock per item for a given FE
SELECT
  ii.id, ii.name, ii.unit, ii.minimum_threshold,
  COALESCE(SUM(a.quantity), 0)          AS received,
  COALESCE(SUM(c.quantity_used), 0)     AS consumed,
  COALESCE(SUM(a.quantity), 0) - COALESCE(SUM(c.quantity_used), 0) AS current_holding,
  (COALESCE(SUM(a.quantity), 0) - COALESCE(SUM(c.quantity_used), 0)) < ii.minimum_threshold
    AS below_threshold
FROM inventory_items ii
LEFT JOIN inventory_allocations  a ON a.item_id = ii.id AND a.to_user_id = :fe_id
LEFT JOIN inventory_consumptions c ON c.item_id = ii.id AND c.fe_id      = :fe_id
GROUP BY ii.id, ii.name, ii.unit, ii.minimum_threshold;
```

---

### 8.4 Auto-Consumption on Ticket Completion

This function must be called inside the **existing** `PATCH /api/tickets/[id]` route handler, at the point where `status` transitions to `'completed'`. It must run within the same request, not as a background job.

```typescript
async function autoCreateConsumptions(ticketId: string): Promise<void> {
  const supabase = createServiceClient()

  // Fetch ticket with service_type kit
  const { data: ticket } = await supabase
    .from('tickets')
    .select('assigned_fe_id, service_types(kit)')
    .eq('id', ticketId)
    .single()

  const kit: Array<{ item_id: string; quantity: number }> =
    ticket?.service_types?.kit ?? []
  const feId = ticket?.assigned_fe_id

  if (!feId || kit.length === 0) return

  for (const kitItem of kit) {
    await supabase
      .from('inventory_consumptions')
      .upsert(
        {
          item_id:              kitItem.item_id,
          fe_id:                feId,
          ticket_id:            ticketId,
          quantity_used:        kitItem.quantity,
          kit_default_quantity: kitItem.quantity,
          overridden:           false,
        },
        { onConflict: 'item_id,fe_id,ticket_id', ignoreDuplicates: true }
      )
  }
}
```

The `onConflict: ignoreDuplicates` makes this idempotent — safe to call multiple times.

---

### 8.5 API Surface

#### `GET /api/inventory`
- **Auth:** officer_backoffice, accountant
- **Logic:** Run warehouse stock query (§8.3). Returns per-item stock with `below_threshold` flag.
- **Response:** `ApiResponse<InventoryItem[]>`

---

#### `POST /api/inventory`
- **Auth:** officer_backoffice only
- **Fields:** `item_id` (uuid), `quantity` (positive integer), `notes?` (string)
- **Logic:** Confirm item exists → INSERT into `inventory_stock` with `added_by = session.id`
- **Response:** `ApiResponse<{ id: string }>`

---

#### `PATCH /api/inventory/items/[id]`
- **Auth:** officer_backoffice only
- **Fields:** `cost_per_unit?` (numeric ≥ 0), `minimum_threshold?` (integer ≥ 0)
- **Logic:** UPDATE `inventory_items` row
- **Response:** `ApiResponse<InventoryItem>`

---

#### `POST /api/inventory/allocations`
- **Auth:** officer_backoffice only
- **Fields:** `item_id` (uuid), `to_user_id` (uuid), `quantity` (positive integer)
- **Logic:** Confirm `to_user_id` has `role = 'field_executive'`. Compute warehouse stock server-side. Reject 400 if insufficient. INSERT allocation row.
- **Response:** `ApiResponse<InventoryAllocation>`

---

#### `GET /api/inventory/allocations`
- **Auth:** officer_backoffice, accountant; field_executive (own `to_user_id` only)
- **Query params:** `item_id?`, `to_user_id?`, `from?`, `to?`, `page?`, `pageSize?`
- **Response:** `ApiResponse<PaginatedResponse<InventoryAllocation & { item_name, to_user_name, allocated_by_name }>>`

---

#### `POST /api/inventory/consumptions` (FE override — 24hr window only)
- **Auth:** field_executive only
- **Fields:** `consumption_id` (uuid), `quantity_used` (positive integer), `override_reason` (string)
- **Logic:**
  1. Fetch consumption row, confirm `fe_id = session.id`
  2. Fetch ticket, confirm `ticket.completed_at ≥ NOW() − 24h` → 400 if window expired
  3. Compute new FE stock after override. Confirm not negative → 400 if so
  4. UPDATE `quantity_used`, `overridden = true`, `override_reason`
- **Response:** `ApiResponse<InventoryConsumption>`

---

#### `GET /api/inventory/consumptions`
- **Auth:** officer_backoffice, accountant; field_executive (own only)
- **Query params:** `item_id?`, `fe_id?`, `ticket_id?`, `page?`, `pageSize?`
- **Response:** `ApiResponse<PaginatedResponse<InventoryConsumption & { item_name, fe_name, ticket_uid }>>`

---

### 8.6 UI — Backoffice Inventory Page (`/officer-backoffice/inventory`)

**Page header:**
- Title: "Inventory Management"
- Subtitle: "Manage warehouse stock, FE allocations and track all movements"

**Five tabs (pill-style):** Inventory | Per-FE Holdings | Movement Log | Allocate to FE | Add Stock

---

#### Inventory Tab

Table columns: Item Name | Unit | Cost/Unit (₹) | Total Added | Warehouse Stock | Min Threshold | Actions

- Warehouse Stock cell: shown in `--error-600` (red, bold) if `below_threshold = true`
- Actions per row:
  - "Set Threshold" (`outline`, small) → inline form or small modal to UPDATE `minimum_threshold`
  - "Update Cost" (`outline`, small) → inline form or small modal to UPDATE `cost_per_unit`

---

#### Per-FE Holdings Tab

- FE selector dropdown at top: "— Select Field Executive —" (all users with `role = 'field_executive'`)
- Until selected: show empty state "Select a field executive to view their holdings"
- On selection: fetch data and render table

Table columns: Item Name | Unit | Received from Backoffice | Consumed on Tickets | Current Holding | Min Threshold

- **Current Holding cell shown in `--error-600` (red, bold) if `below_threshold = true`**
- This signals the backoffice to allocate more stock to that FE

Data: `GET /api/inventory/allocations?to_user_id=X` + `GET /api/inventory/consumptions?fe_id=X`

---

#### Movement Log Tab

Unified timeline of all inventory movements.

Filters: Type toggle (All | Stock Additions | FE Allocations | Consumptions) | Item dropdown | FE dropdown | Date range (From / To)

Table columns: Date | Movement Type (badge) | Item | Quantity | From | To / FE | Ticket (link if applicable) | Notes / Reason

Movement type badge colours:
- Stock Addition: `success` badge (green)
- FE Allocation: blue (custom: `bg-blue-50 text-blue-700`)
- Consumption: `error` badge (red)
- Consumption Override: `warning` badge (amber)

Data: combined from `inventory_stock`, `inventory_allocations`, `inventory_consumptions`
Paginated (PAGE_SIZE=20)

---

#### Allocate to FE Tab

Form fields (inline, not a separate modal):
- SearchableSelect: Item
- SearchableSelect: Field Executive
- Quantity * (integer) — shows "Current warehouse stock: {n} units" as helper text below
- Client-side warning if quantity > warehouse stock. Server re-validates.

Submit button: "Allocate" (`btn-coral`)

Below the form: Allocation History table
Columns: Date | Item | FE Name | Quantity | Allocated By

---

#### Add Stock Tab

Form fields (inline):
- SearchableSelect: Item — with option to create a new item inline
- Quantity * (integer)
- Notes (textarea, optional)

Submit button: "Add Stock" (`btn-coral`)

Below the form: Stock Addition History table
Columns: Date | Item | Quantity | Notes | Added By

---

### 8.7 UI — FE Inventory

#### FE Dashboard — My Inventory Tab

The FE dashboard has three tabs: **Active Tasks | Completed | My Inventory**

My Inventory tab:
- Section label: "YOUR SUPPLIES ({count})" — 12px, weight 600, `--text-muted`, uppercase
- 2-column card grid

Each card:
```
┌──────────────────────────────────────┐
│  [Icon box]   Item name              │
│               Current Stock (muted)  │
│               {quantity}             │
└──────────────────────────────────────┘
```
- Card: white bg, 1px border `--border-light`, 12px radius, padding 16px, flex row with 14px gap
- Icon box: 44×44px, `--primary-50` bg, 12px radius, icon from lucide-react
- Item name: 13px, weight 600
- "Current Stock" label: 11px, `--text-muted`
- Quantity: 22px, weight 700, `--text-primary`. If `below_threshold = true` → `--error-600` instead

If any item is below threshold: show warning text below the grid — `--error-600`, 12px: "⚠ {item name} is below minimum threshold"

Data: FE stock query (§8.3) filtered to `session.id`

---

#### Ticket Inventory Section (within each ticket page)

Shown on every ticket detail page when `service_type.kit` is non-empty. Visible to FE.

- Section title: "REQUIRED INVENTORY" with a box/package icon
- Info note: "These quantities will be automatically deducted from your stock when this ticket is closed. No action needed from you."
- Table columns: Item Name | Unit | Required Quantity | Your Current Stock
- "Your Current Stock" cell: shown in `--error-600` with ⚠ if current stock = required quantity or lower

---

#### Override Quantity Section (within Completed ticket page — 24hr window only)

Shown on a completed ticket's detail page only when `ticket.completed_at ≥ NOW() − 24h`.

- Section title: "INVENTORY USED" with package icon
- Timer notice: "⏱ Override window open — closes in ~{hrs} hrs" (`--warning-600` text)
- Info note: "Quantities were automatically deducted when this ticket was closed. If the actual quantity used was different (e.g. breakage, damage), you can override within 24 hours with a reason."

Table columns: Item Name | Unit | Kit Default | Qty Used | Status | Action

- Qty Used cell: green bg `--success-50`, `--success-700` text (auto-deducted)
- Status badge: "Auto" (gray) by default; "Overridden" (amber) after override
- Action: "Override" button (`outline`, small) — visible for each row; disabled + shows "Done" after override

Override inline form (expands below the row when Override is clicked):
- Background: `--warning-50`, `--warning-600` border, 10px radius
- Title: "Override: {item name}" in `--warning-600`
- Fields (side by side): Actual Quantity Used * (numeric, min 1) | Reason * (text input, required)
- Buttons: "Save Override" (`btn-coral`) | "Cancel" (`secondary`)

On Save Override:
- `POST /api/inventory/consumptions` with `consumption_id`, new `quantity_used`, `override_reason`
- Updates the row's Qty Used display to amber "overridden" badge
- Disables the Override button
- Success toast

---

## 9. Slice F — Accountant Inventory Logs

**Owner:** Accountant (read-only)
**New tables:** None. **New API routes:** None. Reuses `GET /api/inventory`.

---

### 9.1 UI Components

#### Page: `/accountant/inventory`

**Page header:**
- Title: "Inventory Logs"
- Subtitle: "Read-only master snapshot of all inventory items"
- No add/edit buttons. Accountant is read-only here.

**Single table — Master Inventory Snapshot:**

| Column | Source |
|---|---|
| Item Name | `inventory_items.name` |
| Unit | `inventory_items.unit` |
| Total Added | `SUM(inventory_stock.quantity)` |
| Total Allocated (to FEs) | `SUM(inventory_allocations.quantity)` |
| Total Consumed (by FEs) | `SUM(inventory_consumptions.quantity_used)` |
| Warehouse Stock | Total Added − Total Allocated |
| Remaining | Warehouse Stock — shown in **`--error-600` (red, bold)** if `below_threshold = true` |
| Cost per Quantity (₹) | `inventory_items.cost_per_unit` |
| Total Cost (₹) | `cost_per_unit × warehouse_stock` |

Data from `GET /api/inventory`. Full loading/error/empty states required.

---

## 10. Cross-Cutting Infrastructure

### 10.1 Middleware (`src/middleware.ts`)

Add these entries to `roleRoutes`. Do not remove existing entries.

```typescript
const roleRoutes: Record<string, UserRole[]> = {
  // ── Existing routes (unchanged) ──────────────────────────────
  // ... keep all existing entries ...

  // ── New routes for Slices A–F ─────────────────────────────────
  '/accountant':              ['accountant'],
  '/manager/claims':          ['manager'],          // new manager claims page
  '/api/funds':               ['accountant'],
  '/api/fund-allocations':    ['accountant'],
  '/api/expense-claims':      ['accountant', 'manager', 'field_executive'],
  '/api/claim-rate-config':   ['accountant', 'manager', 'field_executive'],
  '/api/hospital-charges':    ['accountant'],
  '/api/invoices':            ['accountant'],
  '/api/inventory':           ['officer_backoffice', 'field_executive', 'accountant'],
  '/api/users':               ['accountant', 'manager'],  // needed for user dropdowns in fund allocation
}
```

---

### 10.2 Auth Helpers (`src/lib/auth.ts`)

Add these functions. Do not remove existing ones.

```typescript
export function canAccessAccountantDashboard(role: UserRole): boolean {
  return role === 'accountant'
}
export function canManageFunds(role: UserRole): boolean {
  return role === 'accountant'
}
export function canManageHospitalCharges(role: UserRole): boolean {
  return role === 'accountant'
}
export function canConfigureClaimRates(role: UserRole): boolean {
  return role === 'accountant'
}
export function canManageInventory(role: UserRole): boolean {
  return role === 'officer_backoffice'
}
export function canViewInventoryLogs(role: UserRole): boolean {
  return role === 'accountant' || role === 'officer_backoffice'
}
```

---

### 10.3 Root Redirect (`src/app/page.tsx`)

Add to `roleRedirects`. Do not change existing entries.

```typescript
accountant:         '/accountant/funds',
// manager and field_executive already redirect to their existing dashboards
// Add manager claims redirect if manager has no existing landing page:
// manager: '/manager/claims'  — confirm with team whether to change existing manager redirect
```

---

### 10.4 Storage Buckets

| Bucket | Used by | Access rule |
|---|---|---|
| `receipts` | Expense claim proof uploads (FE + manager) | Authenticated users, own claims only |
| `invoices` | Generated invoice PDFs | Accountant only; signed URLs with 60-min expiry |

---

### 10.5 Seed Data (`supabase/migrations/006_seed.sql`)

Add to existing seed file:

```sql
-- One user per new role
INSERT INTO users (email, password_hash, full_name, role)
VALUES
  ('accountant@swft.dev', '{bcrypt-hash-of-Accountant@1234}', 'Test Accountant', 'accountant');
-- officer_backoffice and field_executive users already exist in existing seed

-- Claim rate config singleton
INSERT INTO claim_rate_config (petrol_rate_per_km, breakfast_max, lunch_max, dinner_max)
VALUES (4.00, 100.00, 150.00, 150.00);

-- Sample inventory items
INSERT INTO inventory_items (name, unit, cost_per_unit, minimum_threshold)
VALUES
  ('SGN-RML-0024', 'kit',   450.00, 20),
  ('EDTA tubes',   'piece',  12.00, 50);
```

---

### 10.6 Route Group Structure

New pages follow the existing route group pattern:

```
src/app/
  (dashboard)/
    accountant/
      funds/page.tsx
      claims/page.tsx
      hospital-charges/page.tsx
      billing/page.tsx
      inventory/page.tsx
    layout.tsx          ← uses DashboardShell, reuse existing

  (backoffice)/
    officer-backoffice/
      inventory/page.tsx   ← modify existing page to add new tabs

  (field-executive)/
    field-executive/
      claims/page.tsx       ← new page
      layout.tsx            ← existing, add My Balance nav link
      tickets/[id]/page.tsx ← modify existing to add inventory section + override

  (manager)/               ← may already exist; add claims/page.tsx
    manager/
      claims/page.tsx       ← new page
```

---

## 11. Resolved Decisions

All items below are confirmed and final. Do not re-open without explicit instruction.

| # | Slice | Decision | Status |
|---|---|---|---|
| D1 | B | Receipt/proof upload is optional for both FE and manager | Confirmed |
| D2 | B | Rejected claims can be resubmitted as new rows. Old rejected row stays. | Confirmed |
| D3 | B | Partial approval is NOT supported — full amount only | Confirmed |
| D4 | B | One active (pending or approved) claim per FE per ticket | Confirmed |
| D5 | B | Manager claims are free-standing (no ticket reference) | Confirmed |
| D6 | B | Petrol rate and food caps are configurable by accountant only, stored in claim_rate_config | Confirmed |
| D7 | B | Petrol rate at time of submission is snapshot-stored in petrol_rate_at_submission | Confirmed |
| D8 | C | GST = 18%, TDS = 10% — hardcoded constants | Confirmed |
| D9 | C | Multiple active charges for same hospital+service pair → latest created_at wins | Confirmed |
| D10 | C | Hospital charges accessible and manageable by accountant only | Confirmed |
| D11 | D | Invoice generation is manual — accountant triggers it | Confirmed |
| D12 | D | One invoice per ticket, no regeneration | Confirmed |
| D13 | E | service_types.kit is already structured JSONB — no migration needed | Confirmed |
| D14 | E | Inventory deduction on ticket close is fully automatic | Confirmed |
| D15 | E | FE override window = 24 hours from ticket.completed_at | Confirmed |
| D16 | E | Negative FE stock not allowed via override | Confirmed |
| D17 | E | No colour attribute on inventory items | Confirmed |
| D18 | A | Managers can receive fund allocations (option retained even if not used in practice) | Confirmed |
| D19 | All | The word "syndicate" is prohibited. Use "Seragen account" | Confirmed |
| D20 | All | No admin access to any Slice A–F route or page | Confirmed |
| D21 | A | Export Excel button is ONLY inside the Activity Log tab, NOT in the page header | Confirmed |
| D22 | A | PiggyBank icon must NOT be used anywhere | Confirmed |

---

## 12. Remaining Open Items

These are the only unresolved items. Everything else is confirmed.

| # | Section | Question | What it blocks |
|---|---|---|---|
| O1 | D | Final invoice PDF layout and design — Anish to provide | `lib/pdf-utils.ts`, PDF rendering in `POST /api/invoices` |

---

*End of SWFT Architecture & Logic Specification v3.0*
*Supersedes v2.0. All confirmed decisions from v1.0 and v2.0 are incorporated.*
*Only O1 (invoice PDF design) remains open.*
