-- Remove "first user becomes admin" rule. New users default to 'tourist' or 'guide' (per signup choice).
-- Admins are now assigned manually only.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_role TEXT;
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  requested_role := NEW.raw_user_meta_data->>'role';

  IF requested_role = 'guide' THEN
    chosen_role := 'guide'::public.app_role;
  ELSE
    -- Default safe role; never honor 'admin' from client metadata.
    -- Admins must be promoted manually by an existing admin via user_roles.
    chosen_role := 'tourist'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);

  IF chosen_role = 'guide' THEN
    UPDATE public.profiles SET kyc_status = 'pending' WHERE id = NEW.id;
  ELSE
    UPDATE public.profiles SET kyc_status = 'verified' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;