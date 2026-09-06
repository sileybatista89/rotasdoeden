-- ============ Phase 3: discovery data model + orchestrator support ============

-- 1. Chaining / per-run cost control on tasks
ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_cost_per_run numeric(12,4) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS agent_tasks_parent_idx ON public.agent_tasks(parent_task_id);

-- 2. Runtime configuration (weights, batch size, lease, chaining limits)
CREATE TABLE IF NOT EXISTS public.agent_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_config TO authenticated;
GRANT ALL ON public.agent_config TO service_role;
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read agent config" ON public.agent_config;
CREATE POLICY "Admins read agent config" ON public.agent_config
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update agent config" ON public.agent_config;
CREATE POLICY "Admins update agent config" ON public.agent_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS agent_config_updated ON public.agent_config;
CREATE TRIGGER agent_config_updated BEFORE UPDATE ON public.agent_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.agent_config(key, value, description) VALUES
  ('discovery_score_weights',
   '{"travel_intent":30,"stp_relevance":20,"volume":15,"potential_value":15,"competition":10,"seasonality":10}'::jsonb,
   'Pesos do opportunity score (0-100 no total).'),
  ('discovery_limits',
   '{"max_signals_per_run":50,"cache_ttl_hours":24,"min_confidence_to_save":0}'::jsonb,
   'Limites de lote e cache do Discovery Agent.'),
  ('orchestrator_limits',
   '{"lease_timeout_minutes":10,"max_chain_depth":3,"max_children_per_task":5,"task_timeout_ms":110000}'::jsonb,
   'Limites de execução, lease e encadeamento do orquestrador.')
ON CONFLICT (key) DO NOTHING;

-- 3. Discovery opportunities
CREATE TABLE IF NOT EXISTS public.discovery_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market text,
  country text NOT NULL,
  language text NOT NULL,
  query text NOT NULL,
  intent text,
  intent_confidence numeric(5,2) CHECK (intent_confidence IS NULL OR (intent_confidence >= 0 AND intent_confidence <= 100)),
  category text,
  season text,
  source text NOT NULL,
  source_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_type text NOT NULL DEFAULT 'observed'
    CHECK (evidence_type IN ('observed','interpreted','hypothesis','recommendation')),
  opportunity_score numeric(5,2) NOT NULL DEFAULT 0
    CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  confidence_score numeric(5,2) NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  rationale text,
  recommended_action text,
  status text NOT NULL DEFAULT 'nova'
    CHECK (status IN ('nova','em_analise','aceite','rejeitada','expirada')),
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_opportunities_unique_idx
  ON public.discovery_opportunities (lower(country), lower(language), lower(query));
CREATE INDEX IF NOT EXISTS discovery_opportunities_score_idx
  ON public.discovery_opportunities (opportunity_score DESC, discovered_at DESC);
CREATE INDEX IF NOT EXISTS discovery_opportunities_status_idx
  ON public.discovery_opportunities (status);

GRANT SELECT, UPDATE ON public.discovery_opportunities TO authenticated;
GRANT ALL ON public.discovery_opportunities TO service_role;
ALTER TABLE public.discovery_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read opportunities" ON public.discovery_opportunities;
CREATE POLICY "Admins read opportunities" ON public.discovery_opportunities
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update opportunities" ON public.discovery_opportunities;
CREATE POLICY "Admins update opportunities" ON public.discovery_opportunities
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS discovery_opportunities_updated ON public.discovery_opportunities;
CREATE TRIGGER discovery_opportunities_updated BEFORE UPDATE ON public.discovery_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. History (never lose previous metrics/scores)
CREATE TABLE IF NOT EXISTS public.discovery_opportunity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  opportunity_score numeric(5,2),
  confidence_score numeric(5,2),
  evidence_type text,
  source text,
  task_id uuid,
  run_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_history_opportunity_idx
  ON public.discovery_opportunity_history(opportunity_id, recorded_at DESC);

GRANT SELECT ON public.discovery_opportunity_history TO authenticated;
GRANT ALL ON public.discovery_opportunity_history TO service_role;
ALTER TABLE public.discovery_opportunity_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read opportunity history" ON public.discovery_opportunity_history;
CREATE POLICY "Admins read opportunity history" ON public.discovery_opportunity_history
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Cache (service role only, no user access)
CREATE TABLE IF NOT EXISTS public.discovery_cache (
  cache_key text PRIMARY KEY,
  source text NOT NULL,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS discovery_cache_expires_idx ON public.discovery_cache(expires_at);

GRANT ALL ON public.discovery_cache TO service_role;
ALTER TABLE public.discovery_cache ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) may use the cache.

-- 6. Stuck-task recovery
CREATE OR REPLACE FUNCTION public.agent_recover_stuck_tasks(_timeout_minutes integer DEFAULT 10)
RETURNS TABLE(task_id uuid, agent_type agent_type, retry_count integer, released_status agent_task_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to recover agent tasks';
  END IF;

  RETURN QUERY
  UPDATE public.agent_tasks t
     SET status = CASE
           WHEN t.retry_count + 1 > t.max_retries THEN 'permanently_failed'::agent_task_status
           ELSE 'pending'::agent_task_status END,
         retry_count = t.retry_count + 1,
         locked_at = NULL,
         last_error = 'lease_expired',
         failed_at = now(),
         scheduled_for = now() + interval '1 minute',
         updated_at = now()
   WHERE t.status = 'running'
     AND t.locked_at IS NOT NULL
     AND t.locked_at < now() - make_interval(mins => GREATEST(COALESCE(_timeout_minutes, 10), 1))
  RETURNING t.id, t.agent_type, t.retry_count, t.status;
END; $$;

REVOKE ALL ON FUNCTION public.agent_recover_stuck_tasks(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_recover_stuck_tasks(integer) TO service_role;

-- 7. Heartbeat while a task runs
CREATE OR REPLACE FUNCTION public.agent_task_heartbeat(_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.agent_tasks SET locked_at = now(), updated_at = now()
   WHERE id = _task_id AND status = 'running';
END; $$;

REVOKE ALL ON FUNCTION public.agent_task_heartbeat(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_task_heartbeat(uuid) TO service_role;

-- 8. Save an opportunity with deduplication + history
CREATE OR REPLACE FUNCTION public.discovery_save_opportunity(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid; _country text; _language text; _query text; _source text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only server functions may save opportunities';
  END IF;

  _country  := NULLIF(trim(_payload->>'country'), '');
  _language := NULLIF(trim(_payload->>'language'), '');
  _query    := NULLIF(trim(_payload->>'query'), '');
  _source   := NULLIF(trim(_payload->>'source'), '');

  IF _country IS NULL OR _language IS NULL OR _query IS NULL THEN
    RAISE EXCEPTION 'country, language and query are required';
  END IF;
  IF _source IS NULL THEN
    RAISE EXCEPTION 'An opportunity without a source cannot be saved';
  END IF;

  INSERT INTO public.discovery_opportunities AS o (
    market, country, language, query, intent, intent_confidence, category, season,
    source, source_reference, metrics, evidence_type, opportunity_score, confidence_score,
    rationale, recommended_action, task_id, run_id, discovered_at, expires_at
  ) VALUES (
    _payload->>'market', _country, _language, _query,
    _payload->>'intent',
    NULLIF(_payload->>'intent_confidence','')::numeric,
    _payload->>'category', _payload->>'season',
    _source,
    COALESCE(_payload->'source_reference','{}'::jsonb),
    COALESCE(_payload->'metrics','{}'::jsonb),
    COALESCE(NULLIF(_payload->>'evidence_type',''),'observed'),
    COALESCE(NULLIF(_payload->>'opportunity_score','')::numeric, 0),
    COALESCE(NULLIF(_payload->>'confidence_score','')::numeric, 0),
    _payload->>'rationale', _payload->>'recommended_action',
    NULLIF(_payload->>'task_id','')::uuid, NULLIF(_payload->>'run_id','')::uuid,
    now(),
    NULLIF(_payload->>'expires_at','')::timestamptz
  )
  ON CONFLICT (lower(country), lower(language), lower(query)) DO UPDATE
    SET metrics = EXCLUDED.metrics,
        intent = COALESCE(EXCLUDED.intent, o.intent),
        intent_confidence = COALESCE(EXCLUDED.intent_confidence, o.intent_confidence),
        category = COALESCE(EXCLUDED.category, o.category),
        season = COALESCE(EXCLUDED.season, o.season),
        market = COALESCE(EXCLUDED.market, o.market),
        source = EXCLUDED.source,
        source_reference = EXCLUDED.source_reference,
        evidence_type = EXCLUDED.evidence_type,
        opportunity_score = EXCLUDED.opportunity_score,
        confidence_score = EXCLUDED.confidence_score,
        rationale = COALESCE(EXCLUDED.rationale, o.rationale),
        recommended_action = COALESCE(EXCLUDED.recommended_action, o.recommended_action),
        task_id = COALESCE(EXCLUDED.task_id, o.task_id),
        run_id = COALESCE(EXCLUDED.run_id, o.run_id),
        discovered_at = now(),
        expires_at = COALESCE(EXCLUDED.expires_at, o.expires_at),
        status = CASE WHEN o.status = 'expirada' THEN 'nova' ELSE o.status END,
        updated_at = now()
  RETURNING o.id INTO _id;

  INSERT INTO public.discovery_opportunity_history(
    opportunity_id, metrics, opportunity_score, confidence_score, evidence_type, source, task_id, run_id)
  SELECT id, metrics, opportunity_score, confidence_score, evidence_type, source, task_id, run_id
    FROM public.discovery_opportunities WHERE id = _id;

  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.discovery_save_opportunity(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_save_opportunity(jsonb) TO service_role;

-- 9. Cache helpers
CREATE OR REPLACE FUNCTION public.discovery_cache_get(_key text)
RETURNS TABLE(response jsonb, expired boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT c.response, (c.expires_at <= now()) AS expired, c.created_at
    FROM public.discovery_cache c WHERE c.cache_key = _key;
END; $$;

REVOKE ALL ON FUNCTION public.discovery_cache_get(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_cache_get(text) TO service_role;

CREATE OR REPLACE FUNCTION public.discovery_cache_put(_key text, _source text, _request jsonb, _response jsonb, _ttl_hours integer DEFAULT 24)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.discovery_cache(cache_key, source, request, response, expires_at)
  VALUES (_key, _source, COALESCE(_request,'{}'::jsonb), _response,
          now() + make_interval(hours => GREATEST(COALESCE(_ttl_hours,24),1)))
  ON CONFLICT (cache_key) DO UPDATE
    SET response = EXCLUDED.response, request = EXCLUDED.request, source = EXCLUDED.source,
        created_at = now(), expires_at = EXCLUDED.expires_at;
END; $$;

REVOKE ALL ON FUNCTION public.discovery_cache_put(text, text, jsonb, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_cache_put(text, text, jsonb, jsonb, integer) TO service_role;

-- 10. Approval closure
CREATE OR REPLACE FUNCTION public.agent_review_approval(_approval_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _task uuid; _agent agent_type; _action text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins may review agent approvals';
  END IF;
  IF NOT _approve AND char_length(trim(coalesce(_reason,''))) < 2 THEN
    RAISE EXCEPTION 'A reason is required when rejecting';
  END IF;

  UPDATE public.agent_approvals
     SET status = CASE WHEN _approve THEN 'approved'::agent_approval_status ELSE 'rejected'::agent_approval_status END,
         reviewed_by = auth.uid(), reviewed_at = now(),
         rejection_reason = CASE WHEN _approve THEN NULL ELSE _reason END
   WHERE id = _approval_id AND status = 'pending'
   RETURNING task_id, agent_type, action_type INTO _task, _agent, _action;

  IF _task IS NULL THEN RAISE EXCEPTION 'Pending approval not found'; END IF;

  UPDATE public.agent_tasks
     SET status = CASE WHEN _approve THEN 'pending'::agent_task_status ELSE 'cancelled'::agent_task_status END,
         scheduled_for = now(),
         last_error = CASE WHEN _approve THEN NULL ELSE 'approval_rejected: ' || _reason END,
         updated_at = now()
   WHERE id = _task AND status = 'waiting_approval';

  INSERT INTO public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(),
          CASE WHEN _approve THEN 'aprovar_acao_agente' ELSE 'recusar_acao_agente' END,
          'agent_approvals', _approval_id,
          jsonb_build_object('task_id', _task, 'agent_type', _agent, 'action_type', _action, 'reason', _reason));
END; $$;

REVOKE ALL ON FUNCTION public.agent_review_approval(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_review_approval(uuid, boolean, text) TO authenticated, service_role;

-- 11. Discovery policies (tools) — free by default, nothing spends money
INSERT INTO public.agent_policies(agent_type, action_key, level) VALUES
  ('discovery','search_console_data','free'),
  ('discovery','classify_intent','free'),
  ('discovery','analyze_market','free'),
  ('discovery','score_opportunity','free'),
  ('discovery','save_opportunity','free'),
  ('discovery','google_keyword_research','approval_required'),
  ('discovery','search_web','approval_required'),
  ('discovery','discover_opportunities','free')
ON CONFLICT (agent_type, action_key) DO NOTHING;