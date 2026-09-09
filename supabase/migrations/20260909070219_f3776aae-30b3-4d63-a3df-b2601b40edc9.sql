-- ============ FASE 7D: PRICING ENGINE ============

CREATE TABLE public.pricing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_currency text NOT NULL DEFAULT 'EUR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','active','archived')),
  current_version_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pricing_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.pricing_policies(id),
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','active','archived')),
  base_currency text NOT NULL DEFAULT 'EUR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  margin_mode text NOT NULL DEFAULT 'markup' CHECK (margin_mode IN ('markup','target_margin')),
  min_margin_pct numeric NOT NULL DEFAULT 0 CHECK (min_margin_pct >= 0 AND min_margin_pct < 100),
  target_margin_pct numeric NOT NULL DEFAULT 0 CHECK (target_margin_pct >= 0 AND target_margin_pct < 100),
  component_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  flight_protection jsonb NOT NULL DEFAULT '{"method":"percentage","value":0}'::jsonb,
  fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplements jsonb NOT NULL DEFAULT '[]'::jsonb,
  operational_costs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rounding_mode text NOT NULL DEFAULT 'none' CHECK (rounding_mode IN ('none','nearest_1','nearest_5','nearest_10','nearest_50')),
  valid_from date,
  valid_until date,
  change_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (policy_id, version_number),
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)
);

ALTER TABLE public.pricing_policies
  ADD CONSTRAINT pricing_policies_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.pricing_policy_versions(id);

CREATE TABLE public.pricing_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.pricing_policies(id),
  policy_version_id uuid REFERENCES public.pricing_policy_versions(id),
  policy_version_number integer,
  product_id uuid REFERENCES public.travel_products(id),
  product_version_id uuid REFERENCES public.travel_product_versions(id),
  calculation_kind text NOT NULL DEFAULT 'simulation' CHECK (calculation_kind IN ('simulation','commercial')),
  status text NOT NULL CHECK (status IN ('estimated','confirmed','requires_review')),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  cost_total numeric NOT NULL DEFAULT 0,
  markup_total numeric NOT NULL DEFAULT 0,
  gross_margin_pct numeric,
  subtotal numeric NOT NULL DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_policy_versions_policy ON public.pricing_policy_versions(policy_id, version_number DESC);
CREATE INDEX idx_pricing_calculations_policy ON public.pricing_calculations(policy_version_id, created_at DESC);
CREATE INDEX idx_pricing_calculations_product ON public.pricing_calculations(product_id, created_at DESC);
CREATE UNIQUE INDEX uniq_pricing_policy_version_active
  ON public.pricing_policy_versions(status) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE ON public.pricing_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pricing_policy_versions TO authenticated;
GRANT SELECT, INSERT ON public.pricing_calculations TO authenticated;
GRANT ALL ON public.pricing_policies TO service_role;
GRANT ALL ON public.pricing_policy_versions TO service_role;
GRANT ALL ON public.pricing_calculations TO service_role;

ALTER TABLE public.pricing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_policies_admin_select" ON public.pricing_policies
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "pricing_policies_admin_insert" ON public.pricing_policies
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "pricing_policies_admin_update" ON public.pricing_policies
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "pricing_policy_versions_admin_select" ON public.pricing_policy_versions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "pricing_policy_versions_admin_insert" ON public.pricing_policy_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "pricing_policy_versions_admin_update" ON public.pricing_policy_versions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "pricing_calculations_admin_select" ON public.pricing_calculations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "pricing_calculations_admin_insert" ON public.pricing_calculations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_pricing_policies_updated_at BEFORE UPDATE ON public.pricing_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_pricing_policy_versions_updated_at BEFORE UPDATE ON public.pricing_policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== guards =====
CREATE OR REPLACE FUNCTION public.guard_pricing_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Registos de pricing não podem ser eliminados. Use arquivar.';
END;
$$;

CREATE TRIGGER guard_pricing_policies_delete BEFORE DELETE ON public.pricing_policies
  FOR EACH ROW EXECUTE FUNCTION public.guard_pricing_delete();
CREATE TRIGGER guard_pricing_policy_versions_delete BEFORE DELETE ON public.pricing_policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_pricing_delete();
CREATE TRIGGER guard_pricing_calculations_delete BEFORE DELETE ON public.pricing_calculations
  FOR EACH ROW EXECUTE FUNCTION public.guard_pricing_delete();

CREATE OR REPLACE FUNCTION public.guard_pricing_calculation_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Cálculos de preço são imutáveis.';
END;
$$;

CREATE TRIGGER guard_pricing_calculations_update BEFORE UPDATE ON public.pricing_calculations
  FOR EACH ROW EXECUTE FUNCTION public.guard_pricing_calculation_update();

-- versões não-draft são imutáveis (exceto transições de estado / activated_at)
CREATE OR REPLACE FUNCTION public.guard_pricing_policy_version_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.margin_mode IS DISTINCT FROM OLD.margin_mode
      OR NEW.min_margin_pct IS DISTINCT FROM OLD.min_margin_pct
      OR NEW.target_margin_pct IS DISTINCT FROM OLD.target_margin_pct
      OR NEW.component_rules IS DISTINCT FROM OLD.component_rules
      OR NEW.flight_protection IS DISTINCT FROM OLD.flight_protection
      OR NEW.fees IS DISTINCT FROM OLD.fees
      OR NEW.supplements IS DISTINCT FROM OLD.supplements
      OR NEW.operational_costs IS DISTINCT FROM OLD.operational_costs
      OR NEW.rounding_mode IS DISTINCT FROM OLD.rounding_mode
      OR NEW.base_currency IS DISTINCT FROM OLD.base_currency
      OR NEW.version_number IS DISTINCT FROM OLD.version_number
      OR NEW.policy_id IS DISTINCT FROM OLD.policy_id
    THEN
      RAISE EXCEPTION 'Versão de política já submetida é imutável. Crie uma nova versão.';
    END IF;
  END IF;
  IF OLD.status = 'archived' AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'Versão arquivada não pode ser reaberta.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_pricing_policy_version_update BEFORE UPDATE ON public.pricing_policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_pricing_policy_version_update();

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION public.admin_save_pricing_policy(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _existing public.pricing_policies;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  _id := NULLIF(_payload->>'id','')::uuid;

  IF _id IS NULL THEN
    INSERT INTO public.pricing_policies (name, description, base_currency, notes, created_by)
    VALUES (
      COALESCE(NULLIF(trim(_payload->>'name'),''), 'Política sem nome'),
      NULLIF(_payload->>'description',''),
      COALESCE(NULLIF(_payload->>'base_currency',''), 'EUR'),
      NULLIF(_payload->>'notes',''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.pricing_policy_versions (policy_id, version_number, base_currency, created_by, change_reason)
    VALUES (_id, 1, COALESCE(NULLIF(_payload->>'base_currency',''), 'EUR'), auth.uid(), 'Versão inicial');

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'pricing_policy_created', 'pricing_policy', _id, _payload);
  ELSE
    SELECT * INTO _existing FROM public.pricing_policies WHERE id = _id;
    IF _existing.id IS NULL THEN RAISE EXCEPTION 'Política inexistente'; END IF;
    UPDATE public.pricing_policies SET
      name = COALESCE(NULLIF(trim(_payload->>'name'),''), name),
      description = COALESCE(NULLIF(_payload->>'description',''), description),
      notes = COALESCE(NULLIF(_payload->>'notes',''), notes)
    WHERE id = _id;
    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'pricing_policy_updated', 'pricing_policy', _id, _payload);
  END IF;

  RETURN jsonb_build_object('id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_policy_version(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _policy_id uuid; _next integer; _status text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  _id := NULLIF(_payload->>'id','')::uuid;

  IF _id IS NOT NULL THEN
    SELECT status INTO _status FROM public.pricing_policy_versions WHERE id = _id;
    IF _status IS NULL THEN RAISE EXCEPTION 'Versão inexistente'; END IF;
    IF _status <> 'draft' THEN RAISE EXCEPTION 'Só é possível editar versões em rascunho. Crie uma nova versão.'; END IF;
  ELSE
    _policy_id := NULLIF(_payload->>'policy_id','')::uuid;
    IF _policy_id IS NULL THEN RAISE EXCEPTION 'policy_id obrigatório'; END IF;
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next
      FROM public.pricing_policy_versions WHERE policy_id = _policy_id;
    INSERT INTO public.pricing_policy_versions (policy_id, version_number, created_by)
    VALUES (_policy_id, _next, auth.uid()) RETURNING id INTO _id;
  END IF;

  UPDATE public.pricing_policy_versions SET
    base_currency = COALESCE(NULLIF(_payload->>'base_currency',''), base_currency),
    margin_mode = COALESCE(NULLIF(_payload->>'margin_mode',''), margin_mode),
    min_margin_pct = COALESCE((_payload->>'min_margin_pct')::numeric, min_margin_pct),
    target_margin_pct = COALESCE((_payload->>'target_margin_pct')::numeric, target_margin_pct),
    component_rules = COALESCE(_payload->'component_rules', component_rules),
    flight_protection = COALESCE(_payload->'flight_protection', flight_protection),
    fees = COALESCE(_payload->'fees', fees),
    supplements = COALESCE(_payload->'supplements', supplements),
    operational_costs = COALESCE(_payload->'operational_costs', operational_costs),
    rounding_mode = COALESCE(NULLIF(_payload->>'rounding_mode',''), rounding_mode),
    valid_from = COALESCE(NULLIF(_payload->>'valid_from','')::date, valid_from),
    valid_until = COALESCE(NULLIF(_payload->>'valid_until','')::date, valid_until),
    change_reason = COALESCE(NULLIF(_payload->>'change_reason',''), change_reason)
  WHERE id = _id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'pricing_policy_version_saved', 'pricing_policy_version', _id, _payload);

  RETURN jsonb_build_object('id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_policy_version_status(_version_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _v public.pricing_policy_versions;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF _status NOT IN ('draft','under_review','active','archived') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
  SELECT * INTO _v FROM public.pricing_policy_versions WHERE id = _version_id;
  IF _v.id IS NULL THEN RAISE EXCEPTION 'Versão inexistente'; END IF;

  IF _status = 'active' THEN
    IF _v.status <> 'under_review' THEN
      RAISE EXCEPTION 'Só é possível ativar uma versão em revisão.';
    END IF;
    UPDATE public.pricing_policy_versions SET status = 'archived'
      WHERE status = 'active' AND id <> _version_id;
    UPDATE public.pricing_policies SET status = 'archived'
      WHERE status = 'active' AND id <> _v.policy_id;
    UPDATE public.pricing_policy_versions SET status = 'active', activated_at = now() WHERE id = _version_id;
    UPDATE public.pricing_policies SET status = 'active', current_version_id = _version_id WHERE id = _v.policy_id;
  ELSIF _status = 'under_review' THEN
    IF _v.status <> 'draft' THEN RAISE EXCEPTION 'Só rascunhos podem ir para revisão.'; END IF;
    UPDATE public.pricing_policy_versions SET status = 'under_review' WHERE id = _version_id;
  ELSIF _status = 'draft' THEN
    IF _v.status <> 'under_review' THEN RAISE EXCEPTION 'Apenas versões em revisão podem voltar a rascunho.'; END IF;
    UPDATE public.pricing_policy_versions SET status = 'draft' WHERE id = _version_id;
  ELSE
    UPDATE public.pricing_policy_versions SET status = 'archived' WHERE id = _version_id;
    UPDATE public.pricing_policies SET status = 'archived', current_version_id = current_version_id
      WHERE id = _v.policy_id AND current_version_id = _version_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'pricing_policy_version_status_changed', 'pricing_policy_version', _version_id,
          jsonb_build_object('from', _v.status, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('id', _version_id, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_pricing_calculation(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  INSERT INTO public.pricing_calculations (
    policy_id, policy_version_id, policy_version_number, product_id, product_version_id,
    calculation_kind, status, currency, cost_total, markup_total, gross_margin_pct,
    subtotal, final_price, input, result, warnings, validation_errors, created_by
  ) VALUES (
    NULLIF(_payload->>'policy_id','')::uuid,
    NULLIF(_payload->>'policy_version_id','')::uuid,
    NULLIF(_payload->>'policy_version_number','')::integer,
    NULLIF(_payload->>'product_id','')::uuid,
    NULLIF(_payload->>'product_version_id','')::uuid,
    COALESCE(NULLIF(_payload->>'calculation_kind',''), 'simulation'),
    COALESCE(NULLIF(_payload->>'status',''), 'requires_review'),
    COALESCE(NULLIF(_payload->>'currency',''), 'EUR'),
    COALESCE((_payload->>'cost_total')::numeric, 0),
    COALESCE((_payload->>'markup_total')::numeric, 0),
    NULLIF(_payload->>'gross_margin_pct','')::numeric,
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'final_price')::numeric, 0),
    COALESCE(_payload->'input', '{}'::jsonb),
    COALESCE(_payload->'result', '{}'::jsonb),
    COALESCE(_payload->'warnings', '[]'::jsonb),
    COALESCE(_payload->'validation_errors', '[]'::jsonb),
    auth.uid()
  ) RETURNING id INTO _id;
  RETURN jsonb_build_object('id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pricing_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_admin(auth.uid()) THEN jsonb_build_object(
    'policies', (SELECT count(*) FROM public.pricing_policies),
    'draft_versions', (SELECT count(*) FROM public.pricing_policy_versions WHERE status = 'draft'),
    'review_versions', (SELECT count(*) FROM public.pricing_policy_versions WHERE status = 'under_review'),
    'active_versions', (SELECT count(*) FROM public.pricing_policy_versions WHERE status = 'active'),
    'calculations', (SELECT count(*) FROM public.pricing_calculations)
  ) ELSE '{}'::jsonb END;
$$;

REVOKE ALL ON FUNCTION public.guard_pricing_delete() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_pricing_calculation_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_pricing_policy_version_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_pricing_policy(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_save_policy_version(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_policy_version_status(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_record_pricing_calculation(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.pricing_stats() FROM anon;