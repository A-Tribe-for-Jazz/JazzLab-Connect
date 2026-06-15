-- Add highlight_incomplete column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS highlight_incomplete BOOLEAN DEFAULT FALSE;
