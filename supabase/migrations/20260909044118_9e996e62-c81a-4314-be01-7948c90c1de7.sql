
ALTER TABLE public.acquisition_plans ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_plans_dedupe_key_uidx ON public.acquisition_plans (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.acquisition_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.acquisition_plans(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'admin',
  action text NOT NULL,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acquisition_plan_history TO authenticated;
GRANT ALL ON public.acquisition_plan_history TO service_role;
ALTER TABLE public.acquisition_plan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read acquisition plan history" ON public.acquisition_plan_history;
CREATE POLICY "Admins read acquisition plan history" ON public.acquisition_plan_history
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS acquisition_plan_history_plan_idx ON public.acquisition_plan_history(plan_id, created_at DESC);

-- ---------------------------------------------------------------- agent RPCs
CREATE OR REPLACE FUNCTION public.acquisition_save_plan(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _existing uuid;
  _key text := nullif(btrim(_payload->>'dedupe_key'), '');
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _key IS NOT NULL THEN
    SELECT id INTO _existing FROM public.acquisition_plans WHERE dedupe_key = _key;
    IF _existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'plan_id', _existing, 'created', false, 'duplicate', true);
    END IF;
  END IF;

  INSERT INTO public.acquisition_plans (
    discovery_opportunity_id, market, country, language, channel, market_state,
    hypothesis, audience, message, offer, objective, target_metric,
    estimated_cost, acquisition_score, confidence_score, score_breakdown,
    evidence, rationale, decision, status, task_id, run_id, dedupe_key
  ) VALUES (
    nullif(_payload->>'discovery_opportunity_id','')::uuid,
    coalesce(nullif(_payload->>'market',''), 'desconhecido'),
    nullif(_payload->>'country',''),
    nullif(_payload->>'language',''),
    nullif(_payload->>'channel',''),
    coalesce(nullif(_payload->>'market_state',''), 'sem_evidencia'),
    nullif(_payload->>'hypothesis',''),
    coalesce(_payload->'audience', '{}'::jsonb),
    coalesce(_payload->'message', '{}'::jsonb),
    coalesce(_payload->'offer', '{}'::jsonb),
    nullif(_payload->>'objective',''),
    coalesce(_payload->'target_metric', '{}'::jsonb),
    coalesce((_payload->>'estimated_cost')::numeric, 0),
    coalesce((_payload->>'acquisition_score')::numeric, 0),
    coalesce((_payload->>'confidence_score')::numeric, 0),
    coalesce(_payload->'score_breakdown', '{}'::jsonb),
    coalesce(_payload->'evidence', '[]'::jsonb),
    nullif(_payload->>'rationale',''),
    coalesce(nullif(_payload->>'decision',''), 'esperar'),
    'rascunho',
    nullif(_payload->>'task_id','')::uuid,
    nullif(_payload->>'run_id','')::uuid,
    _key
  ) RETURNING id INTO _id;

  INSERT INTO public.acquisition_plan_history (plan_id, actor_kind, action, new_status, note)
  VALUES (_id, 'agent', 'plan_created', 'rascunho', nullif(_payload->>'rationale',''));

  RETURN jsonb_build_object('ok', true, 'plan_id', _id, 'created', true, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.acquisition_request_asset(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _plan uuid := nullif(_payload->>'plan_id','')::uuid;
  _type text := nullif(_payload->>'asset_type','');
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _plan IS NULL OR _type IS NULL THEN
    RAISE EXCEPTION 'plan_and_type_required';
  END IF;

  SELECT id INTO _id FROM public.acquisition_assets
   WHERE plan_id = _plan AND asset_type = _type
     AND coalesce(language,'') = coalesce(nullif(_payload->>'language',''),'');
  IF _id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'asset_id', _id, 'created', false, 'duplicate', true);
  END IF;

  INSERT INTO public.acquisition_assets (plan_id, asset_type, purpose, language, requested_task_id, status, note)
  VALUES (_plan, _type, nullif(_payload->>'purpose',''), nullif(_payload->>'language',''),
          nullif(_payload->>'requested_task_id','')::uuid,
          coalesce(nullif(_payload->>'status',''), 'necessario'),
          nullif(_payload->>'note',''))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'asset_id', _id, 'created', true, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.acquisition_save_campaign_draft(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _plan uuid := nullif(_payload->>'plan_id','')::uuid;
  _channel text := nullif(_payload->>'channel','');
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _plan IS NULL OR _channel IS NULL THEN
    RAISE EXCEPTION 'plan_and_channel_required';
  END IF;

  SELECT id INTO _id FROM public.acquisition_campaigns WHERE plan_id = _plan AND channel = _channel;
  IF _id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'campaign_id', _id, 'created', false, 'duplicate', true);
  END IF;

  -- Drafts only, and never with money attached in this phase.
  INSERT INTO public.acquisition_campaigns (plan_id, channel, name, status, requested_budget, budget_cap, stop_conditions)
  VALUES (_plan, _channel,
          coalesce(nullif(_payload->>'name',''), _channel),
          'rascunho', 0, 0,
          coalesce(_payload->'stop_conditions', '{}'::jsonb))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'campaign_id', _id, 'created', true, 'duplicate', false);
END;
$$;

-- ---------------------------------------------------------------- admin RPCs
CREATE OR REPLACE FUNCTION public.acquisition_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'rascunho', count(*) FILTER (WHERE status = 'rascunho'),
    'em_revisao', count(*) FILTER (WHERE status = 'em_revisao'),
    'aprovado', count(*) FILTER (WHERE status = 'aprovado'),
    'rejeitado', count(*) FILTER (WHERE status = 'rejeitado'),
    'arquivado', count(*) FILTER (WHERE status = 'arquivado'),
    'markets', count(DISTINCT lower(market)),
    'opportunities', count(DISTINCT discovery_opportunity_id),
    'avg_score', coalesce(round(avg(acquisition_score)::numeric, 1), 0),
    'latest_created_at', max(created_at)
  ) INTO result FROM public.acquisition_plans;

  RETURN result
    || jsonb_build_object(
      'campaigns_draft', (SELECT count(*) FROM public.acquisition_campaigns WHERE status = 'rascunho'),
      'campaigns_awaiting', (SELECT count(*) FROM public.acquisition_campaigns WHERE status = 'aguarda_aprovacao'),
      'campaigns_active', (SELECT count(*) FROM public.acquisition_campaigns WHERE status = 'ativa'),
      'assets_total', (SELECT count(*) FROM public.acquisition_assets),
      'results_total', (SELECT count(*) FROM public.acquisition_results),
      'learning_total', (SELECT count(*) FROM public.acquisition_learning),
      'accepted_opportunities', (SELECT count(*) FROM public.discovery_opportunities WHERE status = 'aceite'),
      'acquisition_cost', (SELECT coalesce(sum(estimated_cost), 0) FROM public.agent_costs WHERE agent_type = 'acquisition'),
      'acquisition_runs', (SELECT count(*) FROM public.agent_runs WHERE agent_type = 'acquisition'),
      'last_run_at', (SELECT max(created_at) FROM public.agent_runs WHERE agent_type = 'acquisition')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.acquisition_markets()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb) INTO result
  FROM (
    SELECT market,
           market_state,
           count(*) AS plans,
           count(DISTINCT discovery_opportunity_id) AS opportunities,
           round(avg(acquisition_score)::numeric, 1) AS avg_score,
           round(avg(confidence_score)::numeric, 2) AS avg_confidence,
           sum(jsonb_array_length(coalesce(evidence, '[]'::jsonb))) AS evidence_count,
           max(created_at) AS last_analysis
      FROM public.acquisition_plans
     GROUP BY market, market_state
     ORDER BY avg(acquisition_score) DESC NULLS LAST
  ) m;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_plan_status(_plan_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _prev text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Publication, spending and campaign execution are intentionally impossible here.
  IF _status NOT IN ('rascunho','em_revisao','rejeitado','arquivado') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF _status IN ('rejeitado','arquivado') AND (_note IS NULL OR btrim(_note) = '') THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  SELECT status INTO _prev FROM public.acquisition_plans WHERE id = _plan_id;
  IF _prev IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  UPDATE public.acquisition_plans
     SET status = _status,
         review_note = coalesce(_note, review_note),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _plan_id;

  INSERT INTO public.acquisition_plan_history (plan_id, actor_id, actor_kind, action, previous_status, new_status, note)
  VALUES (_plan_id, auth.uid(), 'admin', 'status_change', _prev, _status, _note);

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'acquisition_plan_status_change', 'acquisition_plan', _plan_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'plan_id', _plan_id, 'status', _status, 'previous_status', _prev);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquisition_save_plan(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquisition_request_asset(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquisition_save_campaign_draft(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquisition_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquisition_markets() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan_status(uuid, text, text) FROM anon;
