ALTER TABLE public.discovery_opportunity_history
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS previous_status text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS changed_by uuid;

CREATE INDEX IF NOT EXISTS discovery_opportunities_discovered_idx
  ON public.discovery_opportunities (discovered_at DESC);
CREATE INDEX IF NOT EXISTS discovery_opportunity_history_opp_idx
  ON public.discovery_opportunity_history (opportunity_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.discovery_stats()
RETURNS TABLE(
  total bigint,
  novas bigint,
  em_analise bigint,
  aceites bigint,
  rejeitadas bigint,
  expiradas bigint,
  avg_score numeric,
  avg_confidence numeric,
  distinct_countries bigint,
  distinct_markets bigint,
  total_cost numeric,
  avg_cost numeric,
  last_run_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _total bigint; _cost numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins may read discovery statistics';
  END IF;

  SELECT count(*) INTO _total FROM public.discovery_opportunities;
  SELECT COALESCE(SUM(c.estimated_cost), 0) INTO _cost
    FROM public.agent_costs c WHERE c.agent_type = 'discovery';

  RETURN QUERY
  SELECT
    _total,
    count(*) FILTER (WHERE o.status = 'nova'),
    count(*) FILTER (WHERE o.status = 'em_analise'),
    count(*) FILTER (WHERE o.status = 'aceite'),
    count(*) FILTER (WHERE o.status = 'rejeitada'),
    count(*) FILTER (WHERE o.status = 'expirada'),
    ROUND(AVG(o.opportunity_score), 2),
    ROUND(AVG(o.confidence_score), 2),
    count(DISTINCT lower(o.country)),
    count(DISTINCT lower(o.market)) FILTER (WHERE o.market IS NOT NULL),
    _cost,
    CASE WHEN _total > 0 THEN ROUND(_cost / _total, 6) ELSE NULL END,
    (SELECT max(r.started_at) FROM public.agent_runs r WHERE r.agent_type = 'discovery')
  FROM public.discovery_opportunities o;
END;
$$;

REVOKE ALL ON FUNCTION public.discovery_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discovery_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_opportunity_status(
  _opportunity_id uuid,
  _status text,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _old text; _o public.discovery_opportunities%ROWTYPE; _clean text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins may change opportunity status';
  END IF;

  IF _status NOT IN ('nova','em_analise','aceite','rejeitada','expirada') THEN
    RAISE EXCEPTION 'Invalid opportunity status';
  END IF;

  _clean := NULLIF(trim(COALESCE(_note, '')), '');

  IF _status IN ('rejeitada','expirada') AND (_clean IS NULL OR char_length(_clean) < 2) THEN
    RAISE EXCEPTION 'A note is required to reject or expire an opportunity';
  END IF;

  SELECT status INTO _old FROM public.discovery_opportunities WHERE id = _opportunity_id;
  IF _old IS NULL THEN RAISE EXCEPTION 'Opportunity not found'; END IF;

  UPDATE public.discovery_opportunities
     SET status = _status, updated_at = now()
   WHERE id = _opportunity_id
  RETURNING * INTO _o;

  INSERT INTO public.discovery_opportunity_history(
    opportunity_id, metrics, opportunity_score, confidence_score, evidence_type,
    source, task_id, run_id, status, previous_status, note, changed_by)
  VALUES (_o.id, _o.metrics, _o.opportunity_score, _o.confidence_score, _o.evidence_type,
    _o.source, _o.task_id, _o.run_id, _status, _old, _clean, auth.uid());

  INSERT INTO public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'alterar_estado_oportunidade', 'discovery_opportunities', _o.id,
    jsonb_build_object('previous_status', _old, 'status', _status, 'note', _clean,
                       'query', _o.query, 'country', _o.country));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_opportunity_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_opportunity_status(uuid, text, text) TO authenticated;