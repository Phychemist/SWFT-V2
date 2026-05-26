-- Add location (maps link) and contact fields to hospitals table
ALTER TABLE "public"."hospitals"
    ADD COLUMN IF NOT EXISTS "location" text,
    ADD COLUMN IF NOT EXISTS "contact" character varying(100);
