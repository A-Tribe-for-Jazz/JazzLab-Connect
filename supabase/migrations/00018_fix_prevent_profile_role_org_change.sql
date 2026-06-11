-- 00018_fix_prevent_profile_role_org_change.sql
-- Allow role and organization_id modifications when auth.uid() is null (e.g. from Supabase Studio/dashboard)

CREATE OR REPLACE FUNCTION public.prevent_profile_role_org_change()
RETURNS trigger AS $$
BEGIN
  -- Check if the actor is NOT a master_admin and an auth session exists
  IF auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) IS DISTINCT FROM 'master_admin'::public.user_role THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'You are not authorized to modify the role or organization_id fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
