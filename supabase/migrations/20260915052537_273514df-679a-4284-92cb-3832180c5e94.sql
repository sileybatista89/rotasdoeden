-- Fase 11 — proveniência comercial nas cotações e ofertas de alojamento de fornecedor

ALTER TABLE public.travel_quote_versions
  ADD COLUMN IF NOT EXISTS pricing_basis text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS requires_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_required text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_subtotals jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.travel_quote_versions
    ADD CONSTRAINT travel_quote_versions_pricing_basis_check
    CHECK (pricing_basis = ANY (ARRAY['confirmed','market_based','insufficient']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.travel_quote_items
  ADD COLUMN IF NOT EXISTS provenance text NOT NULL DEFAULT 'confirmed';

DO $$ BEGIN
  ALTER TABLE public.travel_quote_items
    ADD CONSTRAINT travel_quote_items_provenance_check
    CHECK (provenance = ANY (ARRAY['confirmed','market_observed','estimated','expired','unavailable','pending_validation']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tarifas podem agora ter origem em API de fornecedor em tempo real
ALTER TABLE public.component_rates DROP CONSTRAINT IF EXISTS component_rates_source_type_check;
ALTER TABLE public.component_rates ADD CONSTRAINT component_rates_source_type_check
  CHECK (source_type = ANY (ARRAY['official_website','booking_channel','supplier_quote','supplier_contract',
    'supplier_rate_sheet','internal_service','other_verified_source','live_provider_api']));

ALTER TABLE public.component_rates
  ADD COLUMN IF NOT EXISTS public_amount numeric,
  ADD COLUMN IF NOT EXISTS public_currency text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_rate_id text;

DO $$ BEGIN
  ALTER TABLE public.component_rates
    ADD CONSTRAINT component_rates_public_currency_check
    CHECK (public_currency IS NULL OR public_currency ~ '^[A-Z]{3}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ofertas de alojamento devolvidas por fornecedor (search/rates/quote). Sem reservas.
CREATE TABLE IF NOT EXISTS public.accommodation_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'duffel_stays',
  provider_mode text NOT NULL DEFAULT 'test',
  kind text NOT NULL DEFAULT 'search_result',
  provider_search_result_id text,
  provider_rate_id text,
  provider_quote_id text,
  accommodation_name text,
  provider_accommodation_id text,
  locality text,
  country text,
  check_in date,
  check_out date,
  nights integer,
  adults integer,
  rooms integer,
  total_amount numeric,
  total_currency text,
  tax_amount numeric,
  fee_amount numeric,
  due_at_accommodation_amount numeric,
  public_amount numeric,
  public_currency text,
  board_type text,
  cancellation_type text,
  cancellation_summary text,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  imported_rate_id uuid REFERENCES public.component_rates(id) ON DELETE SET NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accommodation_offers_kind_check CHECK (kind = ANY (ARRAY['search_result','rate','quote'])),
  CONSTRAINT accommodation_offers_status_check CHECK (status = ANY (ARRAY['active','expired','imported','superseded'])),
  CONSTRAINT accommodation_offers_mode_check CHECK (provider_mode = ANY (ARRAY['test','live']))
);

GRANT SELECT ON public.accommodation_offers TO authenticated;
GRANT ALL ON public.accommodation_offers TO service_role;

ALTER TABLE public.accommodation_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accommodation_offers_admin_read" ON public.accommodation_offers;
CREATE POLICY "accommodation_offers_admin_read" ON public.accommodation_offers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS accommodation_offers_created_idx ON public.accommodation_offers (created_at DESC);
CREATE INDEX IF NOT EXISTS accommodation_offers_rate_idx ON public.accommodation_offers (provider_rate_id);

DROP TRIGGER IF EXISTS set_accommodation_offers_updated_at ON public.accommodation_offers;
CREATE TRIGGER set_accommodation_offers_updated_at
  BEFORE UPDATE ON public.accommodation_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();