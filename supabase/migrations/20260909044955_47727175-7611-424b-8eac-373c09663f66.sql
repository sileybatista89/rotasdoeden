
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
    coalesce(nullif(_payload->>'language',''), 'pt'),
    coalesce(nullif(_payload->>'channel',''), 'seo'),
    coalesce(nullif(_payload->>'market_state',''), 'sem_evidencia'),
    coalesce(nullif(_payload->>'hypothesis',''), 'Sem hipótese formulada.'),
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

REVOKE EXECUTE ON FUNCTION public.acquisition_save_plan(jsonb) FROM anon, authenticated;
