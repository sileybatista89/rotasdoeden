CREATE TABLE public.post_trip_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type text NOT NULL DEFAULT 'service' CHECK (booking_type IN ('service','package')),
  booking_id uuid NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','suppressed','failed')),
  sent_at timestamptz,
  error text,
  triggered_by uuid,
  review_invite_status text NOT NULL DEFAULT 'not_integrated' CHECK (review_invite_status IN ('not_integrated','pending','sent','skipped','failed')),
  review_invite_method text,
  review_invite_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX post_trip_emails_once ON public.post_trip_emails (booking_type, booking_id) WHERE NOT is_test;
GRANT SELECT ON public.post_trip_emails TO authenticated;
GRANT ALL ON public.post_trip_emails TO service_role;
ALTER TABLE public.post_trip_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read post-trip emails" ON public.post_trip_emails FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER post_trip_emails_updated_at BEFORE UPDATE ON public.post_trip_emails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();