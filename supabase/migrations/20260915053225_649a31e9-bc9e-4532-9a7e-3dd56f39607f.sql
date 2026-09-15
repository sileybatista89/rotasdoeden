ALTER TABLE public.component_rates
  ADD COLUMN IF NOT EXISTS total_observed_amount numeric,
  ADD COLUMN IF NOT EXISTS observed_nights integer;

ALTER TABLE public.component_rates
  ADD CONSTRAINT component_rates_observation_chk CHECK (
    (total_observed_amount IS NULL AND observed_nights IS NULL)
    OR (total_observed_amount > 0 AND observed_nights >= 1)
  );

ALTER TABLE public.component_rates
  ADD COLUMN IF NOT EXISTS observed_nightly_amount numeric
  GENERATED ALWAYS AS (
    CASE WHEN total_observed_amount IS NOT NULL AND observed_nights IS NOT NULL AND observed_nights > 0
      THEN round(total_observed_amount / observed_nights, 2)
      ELSE NULL END
  ) STORED;

ALTER TABLE public.travel_quote_versions
  ADD COLUMN IF NOT EXISTS commercial_state text NOT NULL DEFAULT 'pending_validation';

ALTER TABLE public.travel_quote_versions
  ADD CONSTRAINT travel_quote_versions_commercial_state_chk
  CHECK (commercial_state IN ('confirmed_pricing','market_based_pricing','pending_validation'));