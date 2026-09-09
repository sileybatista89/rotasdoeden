-- ============ FASE 7E: FLIGHT ENGINE (TEST MODE) ============

CREATE TABLE public.flight_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'duffel' CHECK (provider IN ('duffel')),
  provider_mode text NOT NULL DEFAULT 'test' CHECK (provider_mode IN ('test')),
  provider_offer_request_id text,
  provider_request_id text,
  cache_key text NOT NULL,
  origin text NOT NULL CHECK (origin ~ '^[A-Z]{3}$'),
  destination text NOT NULL CHECK (destination ~ '^[A-Z]{3}$'),
  departure_date date NOT NULL,
  return_date date,
  adults integer NOT NULL CHECK (adults >= 1 AND adults <= 9),
  children integer NOT NULL DEFAULT 0 CHECK (children >= 0 AND children <= 9),
  infants integer NOT NULL DEFAULT 0 CHECK (infants >= 0 AND infants <= 9),
  cabin text NOT NULL CHECK (cabin IN ('economy','premium_economy','business','first')),
  max_connections integer CHECK (max_connections IS NULL OR (max_connections >= 0 AND max_connections <= 2)),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed')),
  error_code text,
  offers_count integer NOT NULL DEFAULT 0 CHECK (offers_count >= 0),
  duration_ms integer,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (return_date IS NULL OR return_date >= departure_date)
);

CREATE INDEX flight_searches_cache_idx ON public.flight_searches (cache_key, status, expires_at DESC);
CREATE INDEX flight_searches_created_idx ON public.flight_searches (created_at DESC);

CREATE TABLE public.flight_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES public.flight_searches(id),
  provider text NOT NULL DEFAULT 'duffel' CHECK (provider IN ('duffel')),
  provider_offer_id text NOT NULL,
  provider_offer_request_id text,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  total_currency text NOT NULL CHECK (total_currency ~ '^[A-Z]{3}$'),
  base_amount numeric,
  tax_amount numeric,
  owner_carrier text,
  owner_name text,
  slices jsonb NOT NULL DEFAULT '[]'::jsonb,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  fare_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_instant_payment boolean NOT NULL DEFAULT true,
  hold_capable boolean NOT NULL DEFAULT false,
  payment_required_by timestamptz,
  price_guarantee_expires_at timestamptz,
  provider_created_at timestamptz,
  expires_at timestamptz,
  refreshed_at timestamptz,
  last_reprice jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','price_changed','unavailable','superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_offer_id)
);

CREATE INDEX flight_offers_search_idx ON public.flight_offers (search_id);
CREATE INDEX flight_offers_expiry_idx ON public.flight_offers (expires_at DESC);

CREATE TRIGGER flight_offers_updated_at
  BEFORE UPDATE ON public.flight_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.flight_searches TO authenticated;
GRANT SELECT ON public.flight_offers TO authenticated;
GRANT ALL ON public.flight_searches TO service_role;
GRANT ALL ON public.flight_offers TO service_role;

ALTER TABLE public.flight_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flight_searches_admin_select" ON public.flight_searches
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "flight_offers_admin_select" ON public.flight_offers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_flight_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Registos de voos não podem ser eliminados.';
END;
$$;

CREATE TRIGGER flight_searches_no_delete
  BEFORE DELETE ON public.flight_searches
  FOR EACH ROW EXECUTE FUNCTION public.guard_flight_delete();
CREATE TRIGGER flight_offers_no_delete
  BEFORE DELETE ON public.flight_offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_flight_delete();

CREATE OR REPLACE FUNCTION public.flight_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores.';
  END IF;

  SELECT jsonb_build_object(
    'searches', (SELECT count(*) FROM public.flight_searches),
    'searches_ok', (SELECT count(*) FROM public.flight_searches WHERE status = 'ok'),
    'searches_failed', (SELECT count(*) FROM public.flight_searches WHERE status = 'failed'),
    'offers', (SELECT count(*) FROM public.flight_offers),
    'offers_active', (SELECT count(*) FROM public.flight_offers WHERE status = 'active' AND expires_at > now()),
    'offers_expired', (SELECT count(*) FROM public.flight_offers WHERE status = 'expired' OR expires_at <= now()),
    'offers_hold_capable', (SELECT count(*) FROM public.flight_offers WHERE hold_capable),
    'last_search_at', (SELECT max(created_at) FROM public.flight_searches)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.flight_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flight_stats() TO authenticated, service_role;