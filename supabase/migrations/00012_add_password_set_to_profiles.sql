-- 00012_add_password_set_to_profiles.sql
-- Add password_set column to profiles to track if a user has finished their initialization setup

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;

-- Update existing profiles to true so they don't get forced to set password
UPDATE public.profiles SET password_set = true;

-- Update trigger function to explicitly set password_set to false for newly created profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id, email, password_set)
  VALUES (
    new.id, 
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''), 
      NULLIF(split_part(new.email, '@', 1), ''),
      'Invited User'
    ), 
    COALESCE(
      (new.raw_user_meta_data->>'role')::public.user_role, 
      'partner'::public.user_role
    ),
    NULLIF(new.raw_user_meta_data->>'organization_id', '')::uuid,
    new.email,
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
