ALTER TABLE public.component_rates
  ADD COLUMN IF NOT EXISTS is_lower_bound boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.component_rates.is_lower_bound IS
  'true quando o valor registado é o limite inferior de um intervalo observado (ex.: "desde 40" num intervalo 40-45).';

ALTER TABLE public.product_price_baselines
  ADD COLUMN IF NOT EXISTS includes_flight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.product_price_baseline_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.travel_products(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('published','blocked')),
  currency text,
  price_per_person numeric,
  price_total numeric,
  duration_days integer,
  nights integer,
  adults integer,
  rooms integer,
  basis text,
  commercial_state text,
  includes_flight boolean NOT NULL DEFAULT false,
  policy_version_id uuid REFERENCES public.pricing_policy_versions(id) ON DELETE SET NULL,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_rate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_reason text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.product_price_baseline_versions IS
  'Histórico de cada cálculo do preço de referência "desde X". Apenas leitura para administradores.';

CREATE INDEX IF NOT EXISTS product_price_baseline_versions_product_idx
  ON public.product_price_baseline_versions (product_id, computed_at DESC);

GRANT SELECT ON public.product_price_baseline_versions TO authenticated;
GRANT ALL ON public.product_price_baseline_versions TO service_role;

ALTER TABLE public.product_price_baseline_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read product price baseline versions"
ON public.product_price_baseline_versions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));