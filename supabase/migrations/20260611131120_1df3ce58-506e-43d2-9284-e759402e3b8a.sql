
-- 1) Ensure guard/trigger functions are actually attached
DROP TRIGGER IF EXISTS bookings_guard_update ON public.bookings;
CREATE TRIGGER bookings_guard_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_update();

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

DROP TRIGGER IF EXISTS messages_filter_content ON public.messages;
CREATE TRIGGER messages_filter_content
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.filter_message_content();

DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
CREATE TRIGGER messages_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- updated_at triggers
DROP TRIGGER IF EXISTS services_set_updated_at ON public.services;
CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Fix conversation creation: only tourist can initiate
DROP POLICY IF EXISTS "Participants create conversation" ON public.conversations;
CREATE POLICY "Tourist creates conversation"
ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = tourist_id
  AND public.has_role(guide_id, 'guide'::public.app_role)
  AND tourist_id <> guide_id
  AND NOT public.is_banned(auth.uid())
);

-- 3) KYC owner UPDATE policy on storage
DROP POLICY IF EXISTS "KYC owner update" ON storage.objects;
CREATE POLICY "KYC owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4) Revoke EXECUTE on trigger-only and admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_message()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.filter_message_content()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_booking_update()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_update()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()            FROM PUBLIC, anon, authenticated;

-- Helper functions used in RLS: keep EXECUTE for authenticated only
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)                        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_banned(uuid)                       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)                        TO authenticated;
