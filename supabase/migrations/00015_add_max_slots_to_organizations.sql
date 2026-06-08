-- 00015_add_max_slots_to_organizations.sql
-- Add max_slots column to organizations table

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS max_slots INTEGER;
