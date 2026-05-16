-- Fix the auth trigger to handle search_path and missing metadata

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
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
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
