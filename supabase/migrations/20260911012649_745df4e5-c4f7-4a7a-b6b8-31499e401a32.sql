-- ============ FASE 7I PASSO 1: ESTRUTURAS DE RESERVA DE PACOTE ============

CREATE SEQUENCE IF NOT EXISTS public.package_booking_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_package_booking_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'PB-' || lpad(nextval('public.package_booking_number_seq')::text, 6, '0');
$$;

CREATE TABLE public.package_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE DEFAULT public.next_package_booking_number(),
  quote_id uuid NOT NULL REFERENCES public.travel_quotes(id),
  quote_version_id uuid NOT NULL REFERENCES public.travel_quote_versions(id),
  product_id uuid REFERENCES public.travel_products(id),
  product_version_id uuid REFERENCES public.travel_product_versions(id),
  user_id uuid,
  customer_name text,
  customer_email text,
  visitor_id uuid,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking_status text NOT NULL DEFAULT 'draft'
    CHECK (booking_status IN ('draft','awaiting_payment','paid','confirmed','completed','cancelled','issue')),
  flight_status text NOT NULL DEFAULT 'none'
    CHECK (flight_status IN ('none','selected','revalidated','held','ordered','ticketed','expired','unavailable','failed','cancelled')),
  payment_status text NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none','pending','paid','partially_refunded','refunded','failed','expired')),
  operations_status text NOT NULL DEFAULT 'preparing'
    CHECK (operations_status IN ('preparing','supplier_confirmation','flight_confirmation','accommodation_confirmation','ready','completed','issue','cancelled')),
  confirmed_price numeric NOT NULL DEFAULT 0 CHECK (confirmed_price >= 0),
  confirmed_cost numeric NOT NULL DEFAULT 0 CHECK (confirmed_cost >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  quote_valid_until timestamptz,
  quote_accepted_at timestamptz,
  pricing_calculation_id uuid REFERENCES public.pricing_calculations(id),
  idempotency_key text UNIQUE,
  issue_reason text,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz
);

-- Uma cotação/versão só pode gerar uma reserva ativa.
CREATE UNIQUE INDEX package_bookings_active_quote_version_uniq
  ON public.package_bookings(quote_version_id)
  WHERE booking_status <> 'cancelled';

CREATE TABLE public.package_booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_booking_id uuid NOT NULL REFERENCES public.package_bookings(id),
  quote_item_id uuid REFERENCES public.travel_quote_items(id),
  line_order integer NOT NULL DEFAULT 0,
  component_id uuid REFERENCES public.package_components(id),
  rate_id uuid REFERENCES public.component_rates(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  display_name text NOT NULL,
  component_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  selling_price numeric NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  rate_kind text,
  source_type text,
  source_reference text,
  rate_valid_from date,
  rate_valid_until date,
  validity_unknown boolean NOT NULL DEFAULT false,
  cancellation_type text,
  cancellation_summary text,
  estimated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_booking_id, line_order)
);

CREATE UNIQUE INDEX package_booking_items_quote_item_uniq
  ON public.package_booking_items(package_booking_id, quote_item_id)
  WHERE quote_item_id IS NOT NULL;

CREATE TABLE public.booking_flight (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_booking_id uuid NOT NULL UNIQUE REFERENCES public.package_bookings(id),
  flight_offer_id uuid REFERENCES public.flight_offers(id),
  provider text,
  provider_offer_id text,
  provider_order_id text UNIQUE,
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN ('none','selected','revalidated','held','ordered','ticketed','expired','unavailable','failed','cancelled')),
  hold_expires_at timestamptz,
  hold_reference text,
  requires_instant_payment boolean,
  hold_capable boolean,
  offer_expires_at timestamptz,
  supplier_cost numeric CHECK (supplier_cost >= 0),
  supplier_currency text CHECK (supplier_currency ~ '^[A-Z]{3}$'),
  ticket_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ticketed_at timestamptz,
  offer_snapshot jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_booking_id uuid NOT NULL REFERENCES public.package_bookings(id),
  component_id uuid REFERENCES public.package_components(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','requested','confirmed','declined','unavailable','cancelled','issue')),
  supplier_reference text,
  deadline_at timestamptz,
  requested_at timestamptz,
  confirmed_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX supplier_confirmations_booking_component_uniq
  ON public.supplier_confirmations(package_booking_id, component_id)
  WHERE component_id IS NOT NULL;

-- Registo de eventos de pagamento já processados (idempotência de webhook).
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stripe',
  event_id text NOT NULL,
  event_type text NOT NULL,
  package_booking_id uuid REFERENCES public.package_bookings(id),
  processed_at timestamptz NOT NULL DEFAULT now(),
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_package_bookings_status ON public.package_bookings(booking_status, created_at DESC);
CREATE INDEX idx_package_bookings_quote ON public.package_bookings(quote_id, created_at DESC);
CREATE INDEX idx_package_booking_items_booking ON public.package_booking_items(package_booking_id, line_order);
CREATE INDEX idx_supplier_confirmations_booking ON public.supplier_confirmations(package_booking_id, status);

GRANT SELECT, INSERT, UPDATE ON public.package_bookings TO authenticated;
GRANT SELECT, INSERT ON public.package_booking_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_flight TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.supplier_confirmations TO authenticated;
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.package_bookings TO service_role;
GRANT ALL ON public.package_booking_items TO service_role;
GRANT ALL ON public.booking_flight TO service_role;
GRANT ALL ON public.supplier_confirmations TO service_role;
GRANT ALL ON public.payment_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.package_booking_number_seq TO service_role;

ALTER TABLE public.package_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_flight ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_bookings_admin_select" ON public.package_bookings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "package_bookings_admin_insert" ON public.package_bookings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "package_bookings_admin_update" ON public.package_bookings
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "package_booking_items_admin_select" ON public.package_booking_items
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "package_booking_items_admin_insert" ON public.package_booking_items
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "booking_flight_admin_select" ON public.booking_flight
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "booking_flight_admin_insert" ON public.booking_flight
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "booking_flight_admin_update" ON public.booking_flight
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "supplier_confirmations_admin_select" ON public.supplier_confirmations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "supplier_confirmations_admin_insert" ON public.supplier_confirmations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "supplier_confirmations_admin_update" ON public.supplier_confirmations
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "payment_events_admin_select" ON public.payment_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_package_bookings_updated_at BEFORE UPDATE ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_booking_flight_updated_at BEFORE UPDATE ON public.booking_flight
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_supplier_confirmations_updated_at BEFORE UPDATE ON public.supplier_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== guardas de eliminação =====
CREATE OR REPLACE FUNCTION public.guard_package_booking_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Reservas de pacote e os seus registos não podem ser eliminados. Use cancelar.';
END;
$$;

CREATE TRIGGER guard_package_bookings_delete BEFORE DELETE ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_delete();
CREATE TRIGGER guard_package_booking_items_delete BEFORE DELETE ON public.package_booking_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_delete();
CREATE TRIGGER guard_booking_flight_delete BEFORE DELETE ON public.booking_flight
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_delete();
CREATE TRIGGER guard_supplier_confirmations_delete BEFORE DELETE ON public.supplier_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_delete();
CREATE TRIGGER guard_payment_events_delete BEFORE DELETE ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_delete();

-- ===== imutabilidade das linhas =====
CREATE OR REPLACE FUNCTION public.guard_package_booking_item_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'As linhas de uma reserva de pacote são imutáveis.';
END;
$$;

CREATE TRIGGER guard_package_booking_items_update BEFORE UPDATE ON public.package_booking_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_booking_item_update();

-- ===== integridade: preço/cotação =====
CREATE OR REPLACE FUNCTION public.validate_package_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  SELECT quote_id INTO v_quote_id FROM public.travel_quote_versions WHERE id = NEW.quote_version_id;
  IF v_quote_id IS NULL THEN
    RAISE EXCEPTION 'Versão de cotação inexistente.';
  END IF;
  IF v_quote_id <> NEW.quote_id THEN
    RAISE EXCEPTION 'A versão indicada não pertence a esta cotação.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_package_bookings BEFORE INSERT OR UPDATE ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_package_booking();

-- ===== auditoria =====
CREATE OR REPLACE FUNCTION public.audit_package_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (COALESCE(auth.uid(), NEW.created_by), 'package_booking_created', 'package_booking', NEW.id,
      jsonb_build_object('booking_number', NEW.booking_number, 'quote_id', NEW.quote_id,
        'quote_version_id', NEW.quote_version_id, 'price', NEW.confirmed_price, 'currency', NEW.currency));
    RETURN NEW;
  END IF;

  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status
     OR NEW.flight_status IS DISTINCT FROM OLD.flight_status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.operations_status IS DISTINCT FROM OLD.operations_status
     OR NEW.confirmed_price IS DISTINCT FROM OLD.confirmed_price THEN
    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'package_booking_updated', 'package_booking', NEW.id,
      jsonb_build_object(
        'booking_status', jsonb_build_array(OLD.booking_status, NEW.booking_status),
        'flight_status', jsonb_build_array(OLD.flight_status, NEW.flight_status),
        'payment_status', jsonb_build_array(OLD.payment_status, NEW.payment_status),
        'operations_status', jsonb_build_array(OLD.operations_status, NEW.operations_status),
        'price', jsonb_build_array(OLD.confirmed_price, NEW.confirmed_price)));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_package_bookings AFTER INSERT OR UPDATE ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_package_booking();

REVOKE ALL ON FUNCTION public.guard_package_booking_delete() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_package_booking_item_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_package_booking() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_package_booking() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.next_package_booking_number() FROM anon, authenticated;