ALTER TABLE public.travel_products
  ADD COLUMN IF NOT EXISTS builder_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.travel_products.builder_config IS
  'Regras do configurador por produto: max_selections_per_day, categories, base_components, duration_cap_days. Sem preços, custos ou margens.';