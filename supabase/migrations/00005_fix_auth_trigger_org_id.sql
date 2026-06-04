-- Fix the auth trigger to include organization_id

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id)
  VALUES (
    new.id, 
    -- Fallback to the first part of the email address, or 'Invited User' if email is somehow missing
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''), 
      NULLIF(split_part(new.email, '@', 1), ''),
      'Invited User'
    ), 
    -- Safely cast the role, defaulting to partner
    COALESCE(
      (new.raw_user_meta_data->>'role')::public.user_role, 
      'partner'::public.user_role
    ),
    -- Extract organization_id from meta_data if present
    NULLIF(new.raw_user_meta_data->>'organization_id', '')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Retroactively fix any existing profiles that are missing their organization_id
UPDATE public.profiles p
SET organization_id = NULLIF(u.raw_user_meta_data->>'organization_id', '')::uuid
FROM auth.users u
WHERE p.id = u.id 
  AND p.organization_id IS NULL 
  AND u.raw_user_meta_data->>'organization_id' IS NOT NULL;
