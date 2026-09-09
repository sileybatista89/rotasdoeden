-- =========================================================
-- 1. MEASUREMENT (first-party attribution)
-- =========================================================
CREATE TABLE public.traffic_visitors (
  visitor_id uuid PRIMARY KEY,
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_utm_content text,
  first_utm_term text,
  first_referrer_host text,
  first_landing_path text,
  first_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.traffic_visitors TO service_role;
GRANT SELECT ON public.traffic_visitors TO authenticated;
ALTER TABLE public.traffic_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "traffic_visitors_admin_read" ON public.traffic_visitors
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.traffic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.traffic_visitors(visitor_id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL,
  path text,
  entity_type text,
  entity_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  language text,
  value numeric,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT traffic_events_type_check CHECK (
    event_type IN ('visit','service_view','guide_view','booking_started','booking_paid','contact_started')
  )
);
GRANT ALL ON public.traffic_events TO service_role;
GRANT SELECT ON public.traffic_events TO authenticated;
ALTER TABLE public.traffic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "traffic_events_admin_read" ON public.traffic_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX traffic_events_visitor_idx ON public.traffic_events (visitor_id, created_at DESC);
CREATE INDEX traffic_events_type_date_idx ON public.traffic_events (event_type, created_at DESC);
CREATE INDEX traffic_events_campaign_idx ON public.traffic_events (utm_campaign, created_at DESC);

CREATE TRIGGER traffic_visitors_set_updated_at
  BEFORE UPDATE ON public.traffic_visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Booking attribution (first-party only)
ALTER TABLE public.bookings
  ADD COLUMN visitor_id uuid,
  ADD COLUMN attribution jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Write-only ingestion endpoint. No reads, no personal data, strict allowlist.
CREATE OR REPLACE FUNCTION public.record_traffic_event(
  _visitor_id uuid,
  _event_type text,
  _path text DEFAULT NULL,
  _attribution jsonb DEFAULT '{}'::jsonb,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s text := left(nullif(_attribution->>'utm_source',''), 100);
  m text := left(nullif(_attribution->>'utm_medium',''), 100);
  c text := left(nullif(_attribution->>'utm_campaign',''), 150);
  ct text := left(nullif(_attribution->>'utm_content',''), 150);
  tm text := left(nullif(_attribution->>'utm_term',''), 150);
  rh text := left(nullif(_attribution->>'referrer_host',''), 150);
  lg text := left(nullif(_attribution->>'language',''), 10);
  p  text := left(nullif(_path,''), 300);
BEGIN
  IF _visitor_id IS NULL THEN
    RAISE EXCEPTION 'visitor_id obrigatorio';
  END IF;
  IF _event_type NOT IN ('visit','service_view','guide_view','booking_started','contact_started') THEN
    RAISE EXCEPTION 'event_type invalido';
  END IF;

  INSERT INTO public.traffic_visitors (
    visitor_id, first_utm_source, first_utm_medium, first_utm_campaign,
    first_utm_content, first_utm_term, first_referrer_host, first_landing_path, first_language
  ) VALUES (_visitor_id, s, m, c, ct, tm, rh, p, lg)
  ON CONFLICT (visitor_id) DO NOTHING;

  INSERT INTO public.traffic_events (
    visitor_id, user_id, event_type, path, entity_type, entity_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_host, language
  ) VALUES (
    _visitor_id, auth.uid(), _event_type, p, left(_entity_type, 50), _entity_id,
    s, m, c, ct, tm, rh, lg
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_traffic_event(uuid, text, text, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_traffic_event(uuid, text, text, jsonb, text, uuid) TO anon, authenticated;

-- =========================================================
-- 2. ACQUISITION MODEL (admin-only; nothing runs automatically)
-- =========================================================
CREATE TABLE public.acquisition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_opportunity_id uuid REFERENCES public.discovery_opportunities(id),
  market text NOT NULL,
  country text,
  language text NOT NULL,
  channel text NOT NULL,
  market_state text NOT NULL DEFAULT 'sem_evidencia',
  hypothesis text NOT NULL,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  message jsonb NOT NULL DEFAULT '{}'::jsonb,
  offer jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective text,
  target_metric jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost numeric NOT NULL DEFAULT 0,
  acquisition_score numeric NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  decision text NOT NULL DEFAULT 'esperar',
  status text NOT NULL DEFAULT 'rascunho',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  task_id uuid REFERENCES public.agent_tasks(id),
  run_id uuid REFERENCES public.agent_runs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_plans_status_check CHECK (status IN ('rascunho','em_revisao','aprovado','rejeitado','arquivado')),
  CONSTRAINT acquisition_plans_decision_check CHECK (decision IN ('perseguir','esperar','descartar')),
  CONSTRAINT acquisition_plans_market_state_check CHECK (market_state IN ('descoberto','potencial','prioritario','ativo','sem_evidencia'))
);
GRANT SELECT, INSERT, UPDATE ON public.acquisition_plans TO authenticated;
GRANT ALL ON public.acquisition_plans TO service_role;
ALTER TABLE public.acquisition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_plans_admin_read" ON public.acquisition_plans
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "acquisition_plans_admin_update" ON public.acquisition_plans
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX acquisition_plans_dedup_idx
  ON public.acquisition_plans (coalesce(discovery_opportunity_id, '00000000-0000-0000-0000-000000000000'::uuid), market, language, channel)
  WHERE status <> 'arquivado';

CREATE TABLE public.acquisition_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.acquisition_plans(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  purpose text,
  language text,
  content_id uuid REFERENCES public.content_items(id),
  requested_task_id uuid REFERENCES public.agent_tasks(id),
  status text NOT NULL DEFAULT 'necessario',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_assets_status_check CHECK (status IN ('necessario','pedido','em_producao','pronto','rejeitado'))
);
GRANT SELECT, INSERT, UPDATE ON public.acquisition_assets TO authenticated;
GRANT ALL ON public.acquisition_assets TO service_role;
ALTER TABLE public.acquisition_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_assets_admin_read" ON public.acquisition_assets
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "acquisition_assets_admin_update" ON public.acquisition_assets
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.acquisition_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.acquisition_plans(id) ON DELETE CASCADE,
  channel text NOT NULL,
  name text NOT NULL,
  utm_campaign text,
  status text NOT NULL DEFAULT 'rascunho',
  requested_budget numeric NOT NULL DEFAULT 0,
  budget_cap numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  period_start date,
  period_end date,
  stop_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_id uuid REFERENCES public.agent_approvals(id),
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_campaigns_status_check CHECK (status IN ('rascunho','aguarda_aprovacao','aprovada','ativa','pausada','terminada','rejeitada')),
  CONSTRAINT acquisition_campaigns_budget_check CHECK (requested_budget >= 0 AND budget_cap >= 0)
);
GRANT SELECT, INSERT, UPDATE ON public.acquisition_campaigns TO authenticated;
GRANT ALL ON public.acquisition_campaigns TO service_role;
ALTER TABLE public.acquisition_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_campaigns_admin_read" ON public.acquisition_campaigns
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "acquisition_campaigns_admin_update" ON public.acquisition_campaigns
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.acquisition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.acquisition_plans(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.acquisition_campaigns(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  visits integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  measured_from text NOT NULL DEFAULT 'first_party',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_results_period_check CHECK (period_end >= period_start)
);
GRANT SELECT ON public.acquisition_results TO authenticated;
GRANT ALL ON public.acquisition_results TO service_role;
ALTER TABLE public.acquisition_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_results_admin_read" ON public.acquisition_results
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX acquisition_results_unique_idx
  ON public.acquisition_results (coalesce(campaign_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(plan_id,'00000000-0000-0000-0000-000000000000'::uuid), period_start, period_end);

CREATE TABLE public.acquisition_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  market text,
  channel text,
  language text,
  conclusion text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  plan_id uuid REFERENCES public.acquisition_plans(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.agent_tasks(id),
  run_id uuid REFERENCES public.agent_runs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_learning_scope_check CHECK (scope IN ('mercado','canal','mensagem','oferta','geral'))
);
GRANT SELECT ON public.acquisition_learning TO authenticated;
GRANT ALL ON public.acquisition_learning TO service_role;
ALTER TABLE public.acquisition_learning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acquisition_learning_admin_read" ON public.acquisition_learning
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER acquisition_plans_set_updated_at BEFORE UPDATE ON public.acquisition_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER acquisition_assets_set_updated_at BEFORE UPDATE ON public.acquisition_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER acquisition_campaigns_set_updated_at BEFORE UPDATE ON public.acquisition_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. CONFIGURATION (budgets stay at zero)
-- =========================================================
INSERT INTO public.agent_config (key, value, description) VALUES
  ('acquisition_score_weights', '{
     "travel_intent": 25,
     "stp_relevance": 15,
     "conversion_potential": 15,
     "service_capacity": 15,
     "acquisition_cost": 10,
     "market_size": 8,
     "seasonality": 6,
     "margin": 6
   }'::jsonb, 'Pesos do score de aquisicao. A confianca multiplica o total, nao soma.'),
  ('acquisition_limits', '{
     "max_plans_per_run": 3,
     "cache_ttl_hours": 24,
     "min_confidence_to_pursue": 0.5,
     "campaign_budget_cap": 0,
     "period_budget_cap": 0,
     "total_budget_cap": 0,
     "max_cost_per_booking": 0,
     "min_days_before_evaluation": 14
   }'::jsonb, 'Limites de aquisicao. Orcamento de campanha a zero: nenhum gasto autorizado.'),
  ('acquisition_models', '{
     "provider": "lovable",
     "analysis_model": "google/gemini-3.6-flash",
     "plan_model": "google/gemini-3.6-flash"
   }'::jsonb, 'Modelos usados pelo agente de aquisicao.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.agent_policies (agent_type, action_key, level, description) VALUES
  ('acquisition','read_internal_data','free','Ler dados internos reais da plataforma'),
  ('acquisition','read_attribution','free','Ler resultados de atribuicao propria'),
  ('acquisition','search_console_data','free','Ler procura observada no Search Console'),
  ('acquisition','draft_acquisition_plan','free','Criar plano de aquisicao em rascunho'),
  ('acquisition','score_acquisition','free','Pontuar e priorizar oportunidades'),
  ('acquisition','request_content_asset','free','Pedir ativo de conteudo em rascunho'),
  ('acquisition','draft_campaign','free','Preparar campanha em rascunho'),
  ('acquisition','create_external_draft','approval_required','Criar rascunho num canal externo'),
  ('acquisition','set_budget','approval_required','Definir ou alterar orcamento'),
  ('acquisition','contact_partner','approval_required','Contactar parceiros externos'),
  ('acquisition','external_communication','approval_required','Enviar mensagens externas'),
  ('acquisition','delete_acquisition_data','forbidden','Apagar planos, campanhas ou resultados')
ON CONFLICT DO NOTHING;