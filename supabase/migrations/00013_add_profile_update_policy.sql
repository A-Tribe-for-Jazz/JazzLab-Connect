-- 00013_add_profile_update_policy.sql
-- Allow users to update their own profiles and protect sensitive fields (role, organization_id)

-- Enable RLS update policy for users on their own profiles
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Trigger function to ensure role and organization_id cannot be changed by non-master-admins
CREATE OR REPLACE FUNCTION public.prevent_profile_role_org_change()
RETURNS trigger AS $$
BEGIN
  -- Check if the actor is NOT a master_admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) IS DISTINCT FROM 'master_admin'::public.user_role THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'You are not authorized to modify the role or organization_id fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to profiles
CREATE TRIGGER ensure_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_org_change();
