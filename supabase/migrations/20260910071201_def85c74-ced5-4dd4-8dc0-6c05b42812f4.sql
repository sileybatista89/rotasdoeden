-- ============ FASE 7G: QUOTE ENGINE ============

CREATE SEQUENCE IF NOT EXISTS public.travel_quote_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'Q-' || lpad(nextval('public.travel_quote_number_seq')::text, 6, '0');
$$;

CREATE TABLE public.travel_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE DEFAULT public.next_quote_number(),
  product_id uuid REFERENCES public.travel_products(id),
  product_version_id uuid REFERENCES public.travel_product_versions(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','calculated','sent','awaiting_confirmation','accepted','superseded','expired','cancelled')),
  sale_currency text NOT NULL DEFAULT 'EUR' CHECK (sale_currency ~ '^[A-Z]{3}$'),
  current_version_id uuid,
  version_count integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'admin' CHECK (channel IN ('admin','public','agent')),
  visitor_id uuid,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_name text,
  customer_email text,
  public_token_hash text UNIQUE,
  public_token_expires_at timestamptz,
  idempotency_key text UNIQUE,
  expires_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz
);

CREATE TABLE public.travel_quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.travel_quotes(id),
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','calculated','sent','awaiting_confirmation','accepted','superseded','expired','cancelled')),
  customer_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy_id uuid REFERENCES public.pricing_policies(id),
  policy_version_id uuid REFERENCES public.pricing_policy_versions(id),
  policy_version_number integer,
  pricing_calculation_id uuid REFERENCES public.pricing_calculations(id),
  pricing_status text CHECK (pricing_status IN ('estimated','confirmed','requires_review')),
  total_cost numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  cost_currency text CHECK (cost_currency ~ '^[A-Z]{3}$'),
  sale_currency text CHECK (sale_currency ~ '^[A-Z]{3}$'),
  fx_rate numeric,
  fx_at timestamptz,
  flight_offer_id uuid REFERENCES public.flight_offers(id),
  flight_provider_offer_id text,
  flight_expires_at timestamptz,
  flight_snapshot jsonb,
  valid_until timestamptz,
  validity_limited_by text,
  confirmable boolean NOT NULL DEFAULT false,
  blocking_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_reason text,
  previous_version_id uuid REFERENCES public.travel_quote_versions(id),
  previous_price numeric,
  price_difference numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  UNIQUE (quote_id, version_number)
);

ALTER TABLE public.travel_quotes
  ADD CONSTRAINT travel_quotes_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.travel_quote_versions(id);

CREATE TABLE public.travel_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id uuid NOT NULL REFERENCES public.travel_quote_versions(id),
  line_order integer NOT NULL DEFAULT 0,
  component_id uuid REFERENCES public.package_components(id),
  rate_id uuid REFERENCES public.component_rates(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  display_name text NOT NULL,
  component_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  rule_mode text,
  rule_pct numeric,
  selling_price numeric NOT NULL DEFAULT 0,
  currency text,
  rate_kind text,
  rate_status text,
  source_type text,
  source_reference text,
  rate_valid_from date,
  rate_valid_until date,
  validity_unknown boolean NOT NULL DEFAULT false,
  cancellation_type text,
  cancellation_summary text,
  estimated boolean NOT NULL DEFAULT false,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_travel_quotes_status ON public.travel_quotes(status, created_at DESC);
CREATE INDEX idx_travel_quotes_product ON public.travel_quotes(product_id, created_at DESC);
CREATE INDEX idx_travel_quote_versions_quote ON public.travel_quote_versions(quote_id, version_number DESC);
CREATE INDEX idx_travel_quote_items_version ON public.travel_quote_items(quote_version_id, line_order);

GRANT SELECT, INSERT, UPDATE ON public.travel_quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.travel_quote_versions TO authenticated;
GRANT SELECT, INSERT ON public.travel_quote_items TO authenticated;
GRANT ALL ON public.travel_quotes TO service_role;
GRANT ALL ON public.travel_quote_versions TO service_role;
GRANT ALL ON public.travel_quote_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.travel_quote_number_seq TO service_role;

ALTER TABLE public.travel_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_quotes_admin_select" ON public.travel_quotes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "travel_quotes_admin_insert" ON public.travel_quotes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "travel_quotes_admin_update" ON public.travel_quotes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "travel_quote_versions_admin_select" ON public.travel_quote_versions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "travel_quote_versions_admin_insert" ON public.travel_quote_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "travel_quote_versions_admin_update" ON public.travel_quote_versions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "travel_quote_items_admin_select" ON public.travel_quote_items
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "travel_quote_items_admin_insert" ON public.travel_quote_items
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_travel_quotes_updated_at BEFORE UPDATE ON public.travel_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_travel_quote_versions_updated_at BEFORE UPDATE ON public.travel_quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== guards =====
CREATE OR REPLACE FUNCTION public.guard_quote_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Cotações não podem ser eliminadas. Use cancelar ou substituir.';
END;
$$;

CREATE TRIGGER guard_travel_quotes_delete BEFORE DELETE ON public.travel_quotes
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_delete();
CREATE TRIGGER guard_travel_quote_versions_delete BEFORE DELETE ON public.travel_quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_delete();
CREATE TRIGGER guard_travel_quote_items_delete BEFORE DELETE ON public.travel_quote_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_delete();

CREATE OR REPLACE FUNCTION public.guard_quote_item_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'As linhas de uma cotação são imutáveis.';
END;
$$;

CREATE TRIGGER guard_travel_quote_items_update BEFORE UPDATE ON public.travel_quote_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_item_update();

CREATE OR REPLACE FUNCTION public.guard_quote_version_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.customer_criteria IS DISTINCT FROM OLD.customer_criteria
      OR NEW.policy_version_id IS DISTINCT FROM OLD.policy_version_id
      OR NEW.pricing_calculation_id IS DISTINCT FROM OLD.pricing_calculation_id
      OR NEW.total_cost IS DISTINCT FROM OLD.total_cost
      OR NEW.total_price IS DISTINCT FROM OLD.total_price
      OR NEW.cost_currency IS DISTINCT FROM OLD.cost_currency
      OR NEW.sale_currency IS DISTINCT FROM OLD.sale_currency
      OR NEW.fx_rate IS DISTINCT FROM OLD.fx_rate
      OR NEW.flight_offer_id IS DISTINCT FROM OLD.flight_offer_id
      OR NEW.flight_provider_offer_id IS DISTINCT FROM OLD.flight_provider_offer_id
      OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
      OR NEW.version_number IS DISTINCT FROM OLD.version_number
      OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
    THEN
      RAISE EXCEPTION 'Versão de cotação já emitida é imutável. Crie uma nova versão.';
    END IF;
  END IF;
  IF OLD.status IN ('superseded','cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Versão substituída ou cancelada não pode mudar de estado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_travel_quote_version_update BEFORE UPDATE ON public.travel_quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_version_update();

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION public.quote_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_admin(auth.uid()) THEN jsonb_build_object(
    'total', (SELECT count(*) FROM public.travel_quotes),
    'draft', (SELECT count(*) FROM public.travel_quotes WHERE status = 'draft'),
    'calculated', (SELECT count(*) FROM public.travel_quotes WHERE status = 'calculated'),
    'sent', (SELECT count(*) FROM public.travel_quotes WHERE status = 'sent'),
    'accepted', (SELECT count(*) FROM public.travel_quotes WHERE status = 'accepted'),
    'expired', (SELECT count(*) FROM public.travel_quotes WHERE status = 'expired'),
    'cancelled', (SELECT count(*) FROM public.travel_quotes WHERE status = 'cancelled'),
    'versions', (SELECT count(*) FROM public.travel_quote_versions)
  ) ELSE '{}'::jsonb END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_quote_status(_quote_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _q public.travel_quotes; _allowed boolean := false;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT * INTO _q FROM public.travel_quotes WHERE id = _quote_id;
  IF _q.id IS NULL THEN RAISE EXCEPTION 'Cotação inexistente'; END IF;

  _allowed := CASE
    WHEN _q.status = 'calculated' AND _status IN ('sent','cancelled') THEN true
    WHEN _q.status = 'sent' AND _status IN ('awaiting_confirmation','accepted','cancelled','expired') THEN true
    WHEN _q.status = 'awaiting_confirmation' AND _status IN ('accepted','cancelled','expired') THEN true
    WHEN _q.status = 'draft' AND _status IN ('cancelled') THEN true
    WHEN _status = 'expired' AND _q.status IN ('calculated','sent','awaiting_confirmation') THEN true
    ELSE false END;
  IF NOT _allowed THEN
    RAISE EXCEPTION 'Transição de estado não permitida: % -> %', _q.status, _status;
  END IF;

  IF _status = 'accepted' AND (_q.expires_at IS NOT NULL AND _q.expires_at < now()) THEN
    RAISE EXCEPTION 'Cotação expirada. É necessário recalcular antes de aceitar.';
  END IF;

  UPDATE public.travel_quotes SET
    status = _status,
    sent_at = CASE WHEN _status = 'sent' THEN now() ELSE sent_at END,
    accepted_at = CASE WHEN _status = 'accepted' THEN now() ELSE accepted_at END,
    cancelled_at = CASE WHEN _status = 'cancelled' THEN now() ELSE cancelled_at END
  WHERE id = _quote_id;

  UPDATE public.travel_quote_versions SET status = _status
    WHERE id = _q.current_version_id AND status NOT IN ('superseded','cancelled');

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'quote_status_changed', 'travel_quote', _quote_id,
          jsonb_build_object('from', _q.status, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('id', _quote_id, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.guard_quote_delete() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_quote_item_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_quote_version_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.next_quote_number() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_stats() FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_quote_status(uuid, text, text) FROM anon;