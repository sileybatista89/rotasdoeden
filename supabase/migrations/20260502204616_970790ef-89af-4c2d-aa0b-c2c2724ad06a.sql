-- ============================================
-- SERVICES TABLE: experiências publicadas por guias verificados
-- ============================================
CREATE TYPE public.service_category AS ENUM (
  'tour', 'experience', 'transfer', 'diving', 'hiking',
  'fishing', 'kayak', 'surfing', 'birdwatching',
  'photography', 'gastronomy', 'culture', 'nightlife'
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.service_category NOT NULL,
  duration_hours NUMERIC(4,1) NOT NULL CHECK (duration_hours > 0 AND duration_hours <= 24),
  price_per_person NUMERIC(10,2) NOT NULL CHECK (price_per_person >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  min_people INTEGER NOT NULL DEFAULT 1 CHECK (min_people >= 1),
  max_people INTEGER NOT NULL DEFAULT 10 CHECK (max_people >= 1),
  meeting_point TEXT,
  includes TEXT[],
  excludes TEXT[],
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT max_gte_min CHECK (max_people >= min_people)
);

CREATE INDEX idx_services_guide_id ON public.services(guide_id);
CREATE INDEX idx_services_active ON public.services(is_active) WHERE is_active = true;
CREATE INDEX idx_services_category ON public.services(category);

-- Trigger updated_at
CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
CREATE POLICY "Public views active services"
  ON public.services FOR SELECT
  USING (is_active = true);

-- Guide views own services (active or not)
CREATE POLICY "Guide views own services"
  ON public.services FOR SELECT
  TO authenticated
  USING (auth.uid() = guide_id);

-- Admin views all
CREATE POLICY "Admin views all services"
  ON public.services FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Verified guides create services
CREATE POLICY "Verified guide creates service"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = guide_id
    AND public.has_role(auth.uid(), 'guide')
    AND NOT public.is_banned(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND kyc_status = 'verified'
    )
  );

-- Guide updates own service
CREATE POLICY "Guide updates own service"
  ON public.services FOR UPDATE
  TO authenticated
  USING (auth.uid() = guide_id AND NOT public.is_banned(auth.uid()))
  WITH CHECK (auth.uid() = guide_id);

-- Admin updates any service
CREATE POLICY "Admin updates any service"
  ON public.services FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Guide deletes own service
CREATE POLICY "Guide deletes own service"
  ON public.services FOR DELETE
  TO authenticated
  USING (auth.uid() = guide_id);

-- Admin deletes any service
CREATE POLICY "Admin deletes any service"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- BOOKINGS: adicionar campos de pagamento
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS guide_payout NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_session ON public.bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- ============================================
-- STORAGE: bucket service-images (público)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view images
CREATE POLICY "Public views service images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

-- Verified guides upload to their own folder (path: <guide_id>/<filename>)
CREATE POLICY "Guides upload own service images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'guide')
  );

CREATE POLICY "Guides update own service images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Guides delete own service images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );