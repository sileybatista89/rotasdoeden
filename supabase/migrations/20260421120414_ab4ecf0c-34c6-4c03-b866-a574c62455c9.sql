
-- ============================================================
-- 1) STORAGE: KYC bucket cleanup
-- ============================================================

-- Remove duplicate admin-delete policy
DROP POLICY IF EXISTS "Admins delete any kyc file" ON storage.objects;

-- Owners must NOT be able to overwrite their submitted KYC docs (evidence integrity)
DROP POLICY IF EXISTS "Users update own kyc document" ON storage.objects;

CREATE POLICY "Admins update kyc files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'kyc-documents' AND public.is_admin(auth.uid()));

-- ============================================================
-- 2) BOOKINGS: tighten update policy with WITH CHECK + authenticated role
-- ============================================================

DROP POLICY IF EXISTS "Tourist updates own booking" ON public.bookings;
DROP POLICY IF EXISTS "Tourist views own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guide views received bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin views all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin updates any booking" ON public.bookings;

CREATE POLICY "Tourist views own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = tourist_id);

CREATE POLICY "Guide views received bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = guide_id);

CREATE POLICY "Admin views all bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Tourist updates own booking"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = tourist_id)
  WITH CHECK (auth.uid() = tourist_id);

CREATE POLICY "Admin updates any booking"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 3) CONVERSATIONS: authenticated only
-- ============================================================

DROP POLICY IF EXISTS "Participants view conversation" ON public.conversations;
DROP POLICY IF EXISTS "Participants create conversation" ON public.conversations;
DROP POLICY IF EXISTS "Admin updates conversation" ON public.conversations;

CREATE POLICY "Participants view conversation"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = tourist_id
    OR auth.uid() = guide_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Participants create conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tourist_id OR auth.uid() = guide_id);

CREATE POLICY "Admin updates conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 4) MESSAGES: authenticated only on SELECT
-- ============================================================

DROP POLICY IF EXISTS "Participants view messages" ON public.messages;

CREATE POLICY "Participants view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.tourist_id = auth.uid() OR c.guide_id = auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================================
-- 5) FLAGGED MESSAGES: trigger-only inserts (remove client path)
-- ============================================================

DROP POLICY IF EXISTS "Admins insert flagged" ON public.flagged_messages;
DROP POLICY IF EXISTS "Admin views flagged" ON public.flagged_messages;
DROP POLICY IF EXISTS "Admin updates flagged" ON public.flagged_messages;

CREATE POLICY "Admin views flagged"
  ON public.flagged_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin updates flagged"
  ON public.flagged_messages FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
-- No INSERT policy: rows are created by the SECURITY DEFINER handle_new_message trigger.

-- ============================================================
-- 6) KYC SUBMISSIONS table: authenticated only
-- ============================================================

DROP POLICY IF EXISTS "Users view own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users insert own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins view all kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins update kyc" ON public.kyc_submissions;

CREATE POLICY "Users view own kyc"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own kyc"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all kyc"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update kyc"
  ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 7) PROFILES: confirm authenticated-only (already correct, normalize)
-- ============================================================

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 8) USER_ROLES: confirm authenticated-only on SELECT too
-- ============================================================

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
