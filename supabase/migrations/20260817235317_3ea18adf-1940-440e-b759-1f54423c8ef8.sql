DROP POLICY IF EXISTS "Avatars read by file" ON storage.objects;
CREATE POLICY "Avatars public image read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND array_length(storage.foldername(name), 1) = 1
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND lower(storage.filename(name)) ~ '\.(png|jpe?g|webp|gif|avif)$'
);