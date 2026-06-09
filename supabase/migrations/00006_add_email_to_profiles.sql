-- 00006_add_email_to_profiles.sql
-- Add email column to profiles and update handle_new_user trigger

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id, email)
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
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
