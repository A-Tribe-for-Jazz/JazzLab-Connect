-- 00014_add_logo_url_to_organizations.sql
-- Add logo_url column to organizations table

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
