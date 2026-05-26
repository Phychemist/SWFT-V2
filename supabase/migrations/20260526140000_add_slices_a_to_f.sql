-- SWFT Slices A-F Integration Migration SQL
-- Path: supabase/migrations/20260526140000_add_slices_a_to_f.sql

-- ─────────────────────────────────────────────────────────────
-- SLICE A: FUND MANAGEMENT
-- ─────────────────────────────────────────────────────────────

-- 1. Create funds table (append-only)
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

-- Block UPDATE and DELETE on funds table at DB level
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant can read funds"
  ON public.funds FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant can insert funds"
  ON public.funds FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'accountant');


-- 2. Create fund_allocations table (append-only with snapshots)
CREATE TABLE public.fund_allocations (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  entry_date   date NOT NULL,
  remarks      text,
  allocated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Snapshot fields
  recipient_balance_after_alloc       numeric(12,2) NOT NULL,
  recipient_total_expenses_at_alloc   numeric(12,2) NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fund_allocations_user      ON public.fund_allocations(user_id);
CREATE INDEX idx_fund_allocations_date      ON public.fund_allocations(entry_date DESC);
CREATE INDEX idx_fund_allocations_allocator ON public.fund_allocations(allocated_by);

-- Block UPDATE and DELETE on fund_allocations table at DB level
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

-- Enable RLS
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant can read allocations"
  ON public.fund_allocations FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant can insert allocations"
  ON public.fund_allocations FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "managers can view own allocations"
  ON public.fund_allocations FOR SELECT
  USING (
    user_id = auth.uid()
    AND auth.jwt() ->> 'role' = 'manager'
  );

CREATE POLICY "field_execs can view own allocations"
  ON public.fund_allocations FOR SELECT
  USING (
    user_id = auth.uid()
    AND auth.jwt() ->> 'role' = 'field_executive'
  );


-- ─────────────────────────────────────────────────────────────
-- SLICE B: EXPENSE CLAIMS
-- ─────────────────────────────────────────────────────────────

-- 3. Create claim_rate_config table (singleton)
CREATE TABLE public.claim_rate_config (
  id                 uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  petrol_rate_per_km numeric(8,2) NOT NULL DEFAULT 4.00,
  breakfast_max      numeric(8,2) NOT NULL DEFAULT 100.00,
  lunch_max          numeric(8,2) NOT NULL DEFAULT 150.00,
  dinner_max         numeric(8,2) NOT NULL DEFAULT 150.00,
  updated_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at         timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claim_rate_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone logged in can view config"
  ON public.claim_rate_config FOR SELECT
  USING (true);

CREATE POLICY "accountant can update config"
  ON public.claim_rate_config FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'accountant');


-- 4. Create expense_claims table
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

-- Automatic update for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_expense_claims_updated_at
  BEFORE UPDATE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant can read all claims"
  ON public.expense_claims FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant can review claims"
  ON public.expense_claims FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "users can view own claims"
  ON public.expense_claims FOR SELECT
  USING (claimant_id = auth.uid());

CREATE POLICY "users can submit own claims"
  ON public.expense_claims FOR INSERT
  WITH CHECK (claimant_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- SLICE C: HOSPITAL CHARGES
-- ─────────────────────────────────────────────────────────────

-- 5. Create hospital_service_charges table (append-only via API design - NO database trigger)
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

-- Enable RLS
ALTER TABLE public.hospital_service_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant can read charges"
  ON public.hospital_service_charges FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant can insert charges"
  ON public.hospital_service_charges FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'accountant');


-- ─────────────────────────────────────────────────────────────
-- SLICE D: BILLING & INVOICES
-- ─────────────────────────────────────────────────────────────

-- 6. Create invoices table
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

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant can read invoices"
  ON public.invoices FOR SELECT
  USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant can generate invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'accountant');


-- ─────────────────────────────────────────────────────────────
-- SLICE E: BACKOFFICE INVENTORY
-- ─────────────────────────────────────────────────────────────

-- 7. Create inventory_items table
CREATE TABLE public.inventory_items (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name              varchar(100) NOT NULL UNIQUE,
  unit              varchar(30) NOT NULL DEFAULT 'piece',
  cost_per_unit     numeric(12,2) NOT NULL DEFAULT 0,
  minimum_threshold integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone logged in can read inventory items"
  ON public.inventory_items FOR SELECT
  USING (true);

CREATE POLICY "backoffice can manage inventory items"
  ON public.inventory_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'officer_backoffice');


-- 8. Create inventory_stock table
CREATE TABLE public.inventory_stock (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  item_id    uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  notes      text,
  added_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inv_stock_item ON public.inventory_stock(item_id);

-- Enable RLS
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backoffice and accountant can read stock"
  ON public.inventory_stock FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('officer_backoffice', 'accountant'));

CREATE POLICY "backoffice can add stock"
  ON public.inventory_stock FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'officer_backoffice');


-- 9. Create inventory_allocations table
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

-- Enable RLS
ALTER TABLE public.inventory_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backoffice and accountant can read allocations"
  ON public.inventory_allocations FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('officer_backoffice', 'accountant'));

CREATE POLICY "backoffice can allocate stock"
  ON public.inventory_allocations FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'officer_backoffice');

CREATE POLICY "FE can view own allocations"
  ON public.inventory_allocations FOR SELECT
  USING (
    to_user_id = auth.uid()
    AND auth.jwt() ->> 'role' = 'field_executive'
  );


-- 10. Create inventory_consumptions table
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

CREATE TRIGGER trigger_inventory_consumptions_updated_at
  BEFORE UPDATE ON public.inventory_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.inventory_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backoffice and accountant can read consumptions"
  ON public.inventory_consumptions FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('officer_backoffice', 'accountant'));

CREATE POLICY "FE can view own consumptions"
  ON public.inventory_consumptions FOR SELECT
  USING (
    fe_id = auth.uid()
  );

CREATE POLICY "FE can update own consumptions for override"
  ON public.inventory_consumptions FOR UPDATE
  USING (
    fe_id = auth.uid()
    AND auth.jwt() ->> 'role' = 'field_executive'
  );

CREATE POLICY "system can insert consumptions"
  ON public.inventory_consumptions FOR INSERT
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────

-- 1. Create a default Accountant account (hashing password 'Accountant@1234')
INSERT INTO public.users (username, password_hash, full_name, role)
VALUES (
  'accountant',
  '$2b$12$Kk0GpeV1jV6F7z2X9H3i/O7a/n8m5G2Z9l8m6C8O1gE1wE2wE3wE4', -- Hashed value of 'Accountant@1234'
  'Test Accountant',
  'accountant'
) ON CONFLICT DO NOTHING;

-- 2. Seed claim_rate_config singleton
INSERT INTO public.claim_rate_config (petrol_rate_per_km, breakfast_max, lunch_max, dinner_max)
VALUES (4.00, 100.00, 150.00, 150.00);

-- 3. Seed testing inventory items
INSERT INTO public.inventory_items (name, unit, cost_per_unit, minimum_threshold)
VALUES
  ('SGN-RML-0024', 'kit',   450.00, 20),
  ('EDTA tubes',   'piece',  12.00, 50)
ON CONFLICT (name) DO NOTHING;
