-- Add group_together column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS group_together BOOLEAN DEFAULT FALSE;
