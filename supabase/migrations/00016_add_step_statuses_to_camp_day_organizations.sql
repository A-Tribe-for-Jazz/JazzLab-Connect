-- 00016_add_step_statuses_to_camp_day_organizations.sql
-- Add step status columns to camp_day_organizations table to share step status among users of same organization

ALTER TABLE public.camp_day_organizations 
ADD COLUMN IF NOT EXISTS step_1_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS step_2_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS step_3_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS step_4_status TEXT DEFAULT 'pending';

-- Add RLS update policy for partners on camp_day_organizations
CREATE POLICY "Partners can update their own organization's camp days" 
ON public.camp_day_organizations 
FOR UPDATE 
USING (
  (auth_user_role() = 'partner'::user_role) AND (organization_id = auth_user_org())
);
