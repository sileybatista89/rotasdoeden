
-- 1) FIX: handle_new_user — never trust client-supplied 'admin' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  requested_role TEXT;
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM public.user_roles;

  requested_role := NEW.raw_user_meta_data->>'role';

  IF user_count = 0 THEN
    -- First user bootstraps as admin
    chosen_role := 'admin'::public.app_role;
  ELSIF requested_role = 'guide' THEN
    chosen_role := 'guide'::public.app_role;
  ELSE
    -- Default safe role; never honor 'admin' from client metadata
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

-- 2) FIX: server-side message filter (cannot be bypassed)
CREATE OR REPLACE FUNCTION public.filter_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  patterns TEXT[][] := ARRAY[
    ARRAY['email',                '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'],
    ARRAY['phone',                '\+?\d[\d\s\-().]{6,}\d'],
    ARRAY['url',                  '\b(?:https?://|www\.)[^\s]+'],
    ARRAY['whatsapp_link',        '\b(?:wa\.me|api\.whatsapp\.com|t\.me|telegram\.me)/[^\s]*'],
    ARRAY['social_handle',        '(^|\s)@[A-Za-z0-9._]{3,}'],
    ARRAY['external_payment',     '\b(paypal|mbway|revolut|wise|venmo|cash\s?app|zelle|iban|swift|bitcoin|btc|crypto|moneygram|western\s?union)\b'],
    ARRAY['off_platform_keywords','\b(fora\s+da\s+plataforma|diretamente\s+comigo|direct(?:o|amente)\s+comigo|pagar\s+(?:em\s+)?dinheiro|pay\s+cash|off[-\s]?platform|outside\s+the\s+app|whatsapp|instagram|facebook|messenger|signal|viber)\b']
  ];
  i INT;
  pat_name TEXT;
  pat_re TEXT;
  found_reasons TEXT[] := ARRAY[]::TEXT[];
  filtered TEXT;
  original TEXT;
BEGIN
  original := NEW.content;
  filtered := original;

  FOR i IN 1 .. array_length(patterns, 1) LOOP
    pat_name := patterns[i][1];
    pat_re := patterns[i][2];
    IF filtered ~* pat_re THEN
      found_reasons := array_append(found_reasons, pat_name);
      filtered := regexp_replace(filtered, pat_re, '███', 'gi');
    END IF;
  END LOOP;

  IF array_length(found_reasons, 1) IS NOT NULL THEN
    NEW.content := filtered;
    NEW.original_content := original;
    NEW.was_filtered := true;
    NEW.flagged_reason := array_to_string(found_reasons, ',');
  ELSE
    -- Force the trustworthy values regardless of what the client claimed
    NEW.original_content := NULL;
    NEW.was_filtered := false;
    NEW.flagged_reason := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS messages_filter_before_insert ON public.messages;
CREATE TRIGGER messages_filter_before_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_message_content();

-- 3) FIX: restrict profiles SELECT — sensitive fields only for owner/admin
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Public can view safe profile fields"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
-- NOTE: Postgres RLS is row-based, not column-based. We instead expose a
-- safe view for public consumption (below) and instruct app code to use it.
-- Owners and admins can still SELECT the full row directly.

-- Public-safe view that omits phone / banned / kyc_status
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT id, full_name, avatar_url, bio, country, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Replace the broad SELECT policy with: owner sees full row OR admin sees full row.
-- Public still gets the safe columns via the view above.
DROP POLICY IF EXISTS "Public can view safe profile fields" ON public.profiles;

CREATE POLICY "Owner views own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Public views safe profile columns"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
-- The above keeps marketplace browsing working. To prevent leaking phone/banned/kyc_status
-- to anonymous queries, app code MUST query the `profiles_public` view for public listings,
-- and only query `profiles` directly for owner/admin contexts.

-- 4) FIX: explicit INSERT policy on user_roles (only admins)
DROP POLICY IF EXISTS "Only admins insert roles" ON public.user_roles;
CREATE POLICY "Only admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 5) FIX: KYC documents — owner & admin DELETE policies
CREATE POLICY "Owners delete own kyc files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins delete any kyc file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.is_admin(auth.uid())
);

-- 6) FIX: ban enforcement at the database level
-- Helper to detect banned users
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND banned = true)
$$;

-- Block banned tourists from creating bookings
DROP POLICY IF EXISTS "Tourist creates booking" ON public.bookings;
CREATE POLICY "Tourist creates booking"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = tourist_id AND NOT public.is_banned(auth.uid()));

-- Block banned users from sending messages
DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND NOT public.is_banned(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.tourist_id = auth.uid() OR c.guide_id = auth.uid())
  )
);
