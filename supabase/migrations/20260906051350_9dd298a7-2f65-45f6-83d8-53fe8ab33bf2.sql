CREATE OR REPLACE FUNCTION public.content_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'draft', count(*) FILTER (WHERE status = 'draft'),
    'in_review', count(*) FILTER (WHERE status = 'in_review'),
    'approved', count(*) FILTER (WHERE status = 'approved'),
    'published', count(*) FILTER (WHERE status = 'published'),
    'rejected', count(*) FILTER (WHERE status = 'rejected'),
    'archived', count(*) FILTER (WHERE status = 'archived'),
    'quality_passed', count(*) FILTER (WHERE quality_passed),
    'languages', count(DISTINCT lower(language)),
    'content_types', count(DISTINCT content_type),
    'from_opportunities', count(*) FILTER (WHERE discovery_opportunity_id IS NOT NULL),
    'latest_created_at', max(created_at)
  ) INTO result
  FROM public.content_items;

  result := result
    || jsonb_build_object('pending_publications',
        (SELECT count(*) FROM public.content_publications WHERE status = 'pending'))
    || jsonb_build_object('content_cost',
        (SELECT coalesce(sum(estimated_cost), 0) FROM public.agent_costs WHERE agent_type = 'content'))
    || jsonb_build_object('content_runs',
        (SELECT count(*) FROM public.agent_runs WHERE agent_type = 'content'));

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.content_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.content_stats() TO authenticated;
