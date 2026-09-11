ALTER TABLE public.travel_quotes
  ADD COLUMN IF NOT EXISTS accepted_version_id uuid REFERENCES public.travel_quote_versions(id),
  ADD COLUMN IF NOT EXISTS accepted_channel text CHECK (accepted_channel IN ('public_token','admin')),
  ADD COLUMN IF NOT EXISTS acceptance_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_reacceptance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_booking_id uuid REFERENCES public.package_bookings(id),
  ADD COLUMN IF NOT EXISTS last_revalidated_at timestamptz;

CREATE TABLE public.quote_revalidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.travel_quotes(id),
  quote_version_id uuid NOT NULL REFERENCES public.travel_quote_versions(id),
  new_quote_version_id uuid REFERENCES public.travel_quote_versions(id),
  outcome text NOT NULL CHECK (outcome IN ('unchanged','changed_within_tolerance','changed_requires_reacceptance','blocked','failed')),
  previous_price numeric,
  new_price numeric,
  price_difference numeric,
  price_difference_pct numeric,
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  pricing_status text,
  pricing_calculation_id uuid REFERENCES public.pricing_calculations(id),
  blocking_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  flight_note text,
  flight_status text,
  requires_reacceptance boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_revalidations_quote ON public.quote_revalidations(quote_id, created_at DESC);

GRANT SELECT, INSERT ON public.quote_revalidations TO authenticated;
GRANT ALL ON public.quote_revalidations TO service_role;

ALTER TABLE public.quote_revalidations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_revalidations_admin_select" ON public.quote_revalidations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "quote_revalidations_admin_insert" ON public.quote_revalidations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_quote_revalidation_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Os registos de revalidação são imutáveis e não podem ser eliminados.';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_quote_revalidation_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_quote_revalidations_update BEFORE UPDATE ON public.quote_revalidations
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_revalidation_write();
CREATE TRIGGER guard_quote_revalidations_delete BEFORE DELETE ON public.quote_revalidations
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_revalidation_write();