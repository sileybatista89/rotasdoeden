-- 1. Authoritative sales / payment-mode settings (singleton). Defaults: sales off, test mode.
CREATE TABLE public.commerce_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  sales_enabled boolean NOT NULL DEFAULT false,
  payment_mode text NOT NULL DEFAULT 'test' CHECK (payment_mode IN ('test','live')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_settings TO authenticated;
GRANT ALL ON public.commerce_settings TO service_role;
ALTER TABLE public.commerce_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY commerce_settings_admin_select ON public.commerce_settings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
INSERT INTO public.commerce_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_commerce_settings(_sales_enabled boolean, _payment_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old public.commerce_settings;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _payment_mode IS NULL OR _payment_mode NOT IN ('test','live') THEN RAISE EXCEPTION 'invalid_payment_mode'; END IF;
  IF _sales_enabled IS NULL THEN RAISE EXCEPTION 'invalid_sales_enabled'; END IF;
  SELECT * INTO _old FROM public.commerce_settings WHERE id;
  UPDATE public.commerce_settings
     SET sales_enabled=_sales_enabled, payment_mode=_payment_mode, updated_by=auth.uid(), updated_at=now()
   WHERE id;
  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'commerce_settings_update', 'commerce_settings', NULL,
          jsonb_build_object('from', jsonb_build_object('sales_enabled', _old.sales_enabled, 'payment_mode', _old.payment_mode),
                             'to', jsonb_build_object('sales_enabled', _sales_enabled, 'payment_mode', _payment_mode)));
  RETURN jsonb_build_object('sales_enabled', _sales_enabled, 'payment_mode', _payment_mode);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_commerce_settings(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_commerce_settings(boolean, text) TO authenticated;

-- 2. Payment event history: processing state, booking link, environment.
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS amount_total bigint,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
GRANT ALL ON public.payment_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON public.payment_events (booking_id);

-- 3. Permission hardening (callers verified per function; see report).
-- Trigger functions never need direct EXECUTE by API roles.
REVOKE EXECUTE ON FUNCTION public.guard_flight_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_pricing_calculation_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_pricing_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_pricing_policy_version_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_published_product_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_quote_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_quote_item_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_quote_version_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_service_moderation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_supply_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_travel_product_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_verification_request_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_component_rate() FROM PUBLIC, anon, authenticated;

-- Service-role-only functions (called only from backend functions).
REVOKE EXECUTE ON FUNCTION public.acquisition_request_asset(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquisition_save_campaign_draft(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquisition_save_plan(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.agent_cost_totals(public.agent_type) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquisition_request_asset(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquisition_save_campaign_draft(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquisition_save_plan(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_cost_totals(public.agent_type) TO service_role;

-- Admin-only functions: signed-out visitors never need them (admin check stays inside).
REVOKE EXECUTE ON FUNCTION public.acquisition_markets() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.acquisition_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_product_version(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_message_guide(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_moderate_service(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_publish_product_version(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_record_pricing_calculation(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_request_document(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_document(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_accommodation(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_component(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_policy_version(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_pricing_policy(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_rate(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_room(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_supplier(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_travel_product(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_document_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_guide_status(uuid, public.guide_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_policy_version_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_quote_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_rate_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_supply_status(text, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_travel_product_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pricing_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.quote_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.supply_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.travel_product_stats() FROM PUBLIC, anon;