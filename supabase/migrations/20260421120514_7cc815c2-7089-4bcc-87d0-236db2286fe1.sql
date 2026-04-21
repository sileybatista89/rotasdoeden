
-- ============================================================
-- 1) PROFILES: prevent self-unban / self-kyc-promotion
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot change ban or kyc status
  IF NEW.banned IS DISTINCT FROM OLD.banned THEN
    RAISE EXCEPTION 'Only admins may change the banned flag';
  END IF;

  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Only admins may change kyc_status';
  END IF;

  -- Identity fields are immutable
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id is immutable';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_update();

-- ============================================================
-- 2) CONVERSATIONS: prevent impersonation on creation
-- ============================================================

DROP POLICY IF EXISTS "Participants create conversation" ON public.conversations;

CREATE POLICY "Participants create conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    -- Creator must be one of the two participants
    (auth.uid() = tourist_id OR auth.uid() = guide_id)
    -- The guide-side participant must actually have the guide role
    AND public.has_role(guide_id, 'guide'::public.app_role)
    -- The two sides must be different users
    AND tourist_id <> guide_id
  );
