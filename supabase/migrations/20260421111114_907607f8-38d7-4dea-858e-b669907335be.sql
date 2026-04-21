
-- 1. Remove the overly-permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Public views safe profile columns" ON public.profiles;

-- Ensure the public-safe view is readable
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2. avatars bucket - DELETE policy for owners
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. kyc-documents bucket - UPDATE policy for owners (and admins)
DROP POLICY IF EXISTS "Users update own kyc document" ON storage.objects;
CREATE POLICY "Users update own kyc document"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);
