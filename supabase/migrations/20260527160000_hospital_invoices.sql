-- Alter public.invoices to allow multiple tickets per invoice
ALTER TABLE public.invoices ALTER COLUMN ticket_id DROP NOT NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_ticket_id_key;

-- Add Hospital and Date Range columns to public.invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS annexure_url text;

-- Add invoice relation to public.tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_invoice ON public.tickets(invoice_id);
