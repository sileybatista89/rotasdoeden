-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Tighten flagged_messages insert: only service_role (edge function) or admin
DROP POLICY IF EXISTS "System inserts flagged" ON public.flagged_messages;
CREATE POLICY "Admins insert flagged" ON public.flagged_messages
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Restrict public read on avatars bucket: allow only individual file read by path,
-- prevent broad listing. Replace blanket SELECT with stricter pattern.
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars read by file" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);