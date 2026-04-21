
-- KYC files: remove owner delete, keep admin-only delete
DROP POLICY IF EXISTS "Owners delete own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own kyc document" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own kyc" ON storage.objects;

DROP POLICY IF EXISTS "Admins delete kyc files" ON storage.objects;
CREATE POLICY "Admins delete kyc files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.is_admin(auth.uid())
);
