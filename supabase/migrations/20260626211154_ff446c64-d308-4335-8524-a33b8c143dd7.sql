
-- 1) Restrict messages.original_content to admins only.
--    Column-level revoke prevents the regular authenticated role from
--    reading the unfiltered version of other participants' messages.
REVOKE SELECT (original_content) ON public.messages FROM authenticated;
REVOKE SELECT (original_content) ON public.messages FROM anon;

-- Admin read path: SECURITY DEFINER function that enforces admin role
-- and returns flagged messages with original content.
CREATE OR REPLACE FUNCTION public.admin_list_flagged_messages(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  content text,
  original_content text,
  flagged_reason text,
  created_at timestamptz,
  sender_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins may read flagged messages';
  END IF;

  RETURN QUERY
  SELECT m.id, m.content, m.original_content, m.flagged_reason, m.created_at, m.sender_id
  FROM public.messages m
  WHERE m.was_filtered = true
  ORDER BY m.created_at DESC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_flagged_messages(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_flagged_messages(int) TO authenticated;

-- 2) Tighten "Guide updates own service" policy: require the user still
--    holds the guide role at the time of update (WITH CHECK).
DROP POLICY IF EXISTS "Guide updates own service" ON public.services;

CREATE POLICY "Guide updates own service"
ON public.services
FOR UPDATE
TO authenticated
USING (
  auth.uid() = guide_id
  AND NOT public.is_banned(auth.uid())
  AND public.has_role(auth.uid(), 'guide'::public.app_role)
)
WITH CHECK (
  auth.uid() = guide_id
  AND NOT public.is_banned(auth.uid())
  AND public.has_role(auth.uid(), 'guide'::public.app_role)
);
