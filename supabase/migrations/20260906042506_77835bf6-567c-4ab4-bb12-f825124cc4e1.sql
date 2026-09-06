DROP POLICY IF EXISTS "No user access to discovery cache" ON public.discovery_cache;
CREATE POLICY "No user access to discovery cache" ON public.discovery_cache
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);