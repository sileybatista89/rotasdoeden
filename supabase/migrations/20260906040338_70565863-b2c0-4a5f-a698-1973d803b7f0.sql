-- ===== Enums =====
CREATE TYPE public.agent_type AS ENUM ('content','discovery','acquisition','conversion','orchestrator');
CREATE TYPE public.agent_task_status AS ENUM ('pending','queued','running','waiting_approval','completed','failed','permanently_failed','cancelled');
CREATE TYPE public.agent_permission_level AS ENUM ('free','approval_required','forbidden');
CREATE TYPE public.agent_approval_status AS ENUM ('pending','approved','rejected','expired','cancelled');

-- ===== agent_tasks =====
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type public.agent_type NOT NULL,
  task_type text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  status public.agent_task_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  idempotency_key text NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_tasks_idempotency_key_unique UNIQUE (idempotency_key),
  CONSTRAINT agent_tasks_priority_range CHECK (priority BETWEEN 1 AND 1000),
  CONSTRAINT agent_tasks_max_retries_range CHECK (max_retries BETWEEN 0 AND 10)
);
CREATE INDEX agent_tasks_queue_idx ON public.agent_tasks (status, scheduled_for, priority);
CREATE INDEX agent_tasks_agent_idx ON public.agent_tasks (agent_type, status);

GRANT SELECT, INSERT, UPDATE ON public.agent_tasks TO authenticated;
GRANT ALL ON public.agent_tasks TO service_role;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent tasks" ON public.agent_tasks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== agent_runs =====
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  agent_type public.agent_type NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  model_provider text,
  model_name text,
  status text NOT NULL DEFAULT 'running',
  input_summary text,
  output_summary text,
  tool_calls_count integer NOT NULL DEFAULT 0,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(12,6) NOT NULL DEFAULT 0,
  duration_ms integer,
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_runs_status_check CHECK (status IN ('running','completed','failed','blocked','timeout')),
  CONSTRAINT agent_runs_task_attempt_unique UNIQUE (task_id, attempt)
);
CREATE INDEX agent_runs_task_idx ON public.agent_runs (task_id);
CREATE INDEX agent_runs_created_idx ON public.agent_runs (created_at DESC);

GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent runs" ON public.agent_runs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===== agent_costs =====
CREATE TABLE public.agent_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  agent_type public.agent_type NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(12,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_costs_date_idx ON public.agent_costs (usage_date);
CREATE INDEX agent_costs_agent_date_idx ON public.agent_costs (agent_type, usage_date);

GRANT SELECT ON public.agent_costs TO authenticated;
GRANT ALL ON public.agent_costs TO service_role;
ALTER TABLE public.agent_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent costs" ON public.agent_costs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===== agent_approvals =====
CREATE TABLE public.agent_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  agent_type public.agent_type NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.agent_approval_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_approvals_status_idx ON public.agent_approvals (status, requested_at DESC);

GRANT SELECT, UPDATE ON public.agent_approvals TO authenticated;
GRANT ALL ON public.agent_approvals TO service_role;
ALTER TABLE public.agent_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent approvals" ON public.agent_approvals FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins review agent approvals" ON public.agent_approvals FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== agent_policies =====
CREATE TABLE public.agent_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type public.agent_type NOT NULL,
  action_key text NOT NULL,
  level public.agent_permission_level NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_policies_unique UNIQUE (agent_type, action_key)
);

GRANT SELECT, INSERT, UPDATE ON public.agent_policies TO authenticated;
GRANT ALL ON public.agent_policies TO service_role;
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent policies" ON public.agent_policies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== agent_settings =====
CREATE TABLE public.agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  agent_type public.agent_type,
  daily_limit numeric(12,4) NOT NULL DEFAULT 0,
  monthly_limit numeric(12,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  paused boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_settings_scope_check CHECK (scope IN ('global','agent')),
  CONSTRAINT agent_settings_scope_agent_check CHECK ((scope = 'global' AND agent_type IS NULL) OR (scope = 'agent' AND agent_type IS NOT NULL))
);
CREATE UNIQUE INDEX agent_settings_global_unique ON public.agent_settings (scope) WHERE scope = 'global';
CREATE UNIQUE INDEX agent_settings_agent_unique ON public.agent_settings (agent_type) WHERE scope = 'agent';

GRANT SELECT, INSERT, UPDATE ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent settings" ON public.agent_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ===== updated_at triggers (reuse existing function) =====
CREATE TRIGGER agent_tasks_updated BEFORE UPDATE ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER agent_approvals_updated BEFORE UPDATE ON public.agent_approvals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER agent_policies_updated BEFORE UPDATE ON public.agent_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER agent_settings_updated BEFORE UPDATE ON public.agent_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Atomic task claim (idempotency / no double execution) =====
CREATE OR REPLACE FUNCTION public.agent_claim_task(_limit integer DEFAULT 1)
RETURNS SETOF public.agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to claim agent tasks';
  END IF;

  RETURN QUERY
  UPDATE public.agent_tasks t
     SET status = 'running',
         started_at = COALESCE(t.started_at, now()),
         locked_at = now(),
         retry_count = t.retry_count + CASE WHEN t.started_at IS NULL THEN 0 ELSE 1 END,
         updated_at = now()
   WHERE t.id IN (
     SELECT id FROM public.agent_tasks
      WHERE status IN ('pending','queued')
        AND scheduled_for <= now()
      ORDER BY priority ASC, scheduled_for ASC
      FOR UPDATE SKIP LOCKED
      LIMIT GREATEST(COALESCE(_limit,1), 1)
   )
  RETURNING t.*;
END; $$;

REVOKE ALL ON FUNCTION public.agent_claim_task(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_claim_task(integer) TO service_role;

-- ===== Cost totals helper (admin dashboards / limit checks) =====
CREATE OR REPLACE FUNCTION public.agent_cost_totals(_agent public.agent_type DEFAULT NULL)
RETURNS TABLE(daily_total numeric, monthly_total numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(estimated_cost) FILTER (WHERE usage_date = (now() AT TIME ZONE 'utc')::date), 0),
    COALESCE(SUM(estimated_cost) FILTER (WHERE usage_date >= date_trunc('month', (now() AT TIME ZONE 'utc')::date)::date), 0)
  FROM public.agent_costs
  WHERE (_agent IS NULL OR agent_type = _agent);
$$;

REVOKE ALL ON FUNCTION public.agent_cost_totals(public.agent_type) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_cost_totals(public.agent_type) TO authenticated, service_role;