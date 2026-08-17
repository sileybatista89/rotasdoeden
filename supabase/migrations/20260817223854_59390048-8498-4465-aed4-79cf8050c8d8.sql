DO $$ BEGIN
  CREATE TYPE public.professional_type AS ENUM ('guia_credenciado','guia_local','operador_turistico','empresa_agencia','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('not_verified','pending','verified','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'ST',
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.districts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "districts_public_read" ON public.districts FOR SELECT USING (true);
CREATE POLICY "districts_admin_write" ON public.districts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (district_id, slug)
);

GRANT SELECT ON public.localities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localities TO authenticated;
GRANT ALL ON public.localities TO service_role;
ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "localities_public_read" ON public.localities FOR SELECT USING (true);
CREATE POLICY "localities_admin_write" ON public.localities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  professional_type public.professional_type,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  headline text,
  description text,
  areas_of_activity text[] NOT NULL DEFAULT '{}',
  experience_types text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  years_experience int,
  profile_photo_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  company_name text,
  verification_status public.verification_status NOT NULL DEFAULT 'not_verified',
  verified_at timestamptz,
  verification_expires_at timestamptz,
  admin_notes text,
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.professional_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_public_read_verified" ON public.professional_profiles FOR SELECT
  USING (verification_status = 'verified' AND suspended = false);
CREATE POLICY "pp_owner_read" ON public.professional_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "pp_admin_all" ON public.professional_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pp_owner_insert" ON public.professional_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND verification_status = 'not_verified' AND suspended = false);
CREATE POLICY "pp_owner_update" ON public.professional_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_professional_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.verification_status := OLD.verification_status;
    NEW.verified_at := OLD.verified_at;
    NEW.verification_expires_at := OLD.verification_expires_at;
    NEW.admin_notes := OLD.admin_notes;
    NEW.suspended := OLD.suspended;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_pp ON public.professional_profiles;
CREATE TRIGGER trg_protect_pp BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_professional_profile_fields();

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  professional_type public.professional_type,
  status public.verification_status NOT NULL DEFAULT 'pending',
  id_document_url text,
  credential_url text,
  training_certificate_url text,
  other_document_urls text[] NOT NULL DEFAULT '{}',
  professional_photo_url text,
  experience_summary text,
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vr_owner_read" ON public.verification_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "vr_owner_insert" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "vr_admin_all" ON public.verification_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit_admin_insert" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS available_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_times text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS additional_info text;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_districts_updated ON public.districts;
CREATE TRIGGER trg_districts_updated BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_localities_updated ON public.localities;
CREATE TRIGGER trg_localities_updated BEFORE UPDATE ON public.localities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_vr_updated ON public.verification_requests;
CREATE TRIGGER trg_vr_updated BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.districts (name, slug, sort_order) VALUES
  ('Água Grande','agua-grande',1),
  ('Cantagalo','cantagalo',2),
  ('Caué','caue',3),
  ('Lembá','lemba',4),
  ('Lobata','lobata',5),
  ('Mé-Zóchi','me-zochi',6),
  ('Região Autónoma do Príncipe','principe',7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.localities (district_id, name, slug)
SELECT d.id, v.name, v.slug FROM (VALUES
  ('agua-grande','São Tomé (cidade)','sao-tome-cidade'),
  ('agua-grande','Pantufo','pantufo'),
  ('agua-grande','Riboque','riboque'),
  ('agua-grande','Praia Gamboa','praia-gamboa'),
  ('cantagalo','Santana','santana'),
  ('cantagalo','Ribeira Afonso','ribeira-afonso'),
  ('cantagalo','Água Izé','agua-ize'),
  ('cantagalo','Praia Melão','praia-melao'),
  ('caue','São João dos Angolares','sao-joao-dos-angolares'),
  ('caue','Porto Alegre','porto-alegre'),
  ('caue','Ilhéu das Rolas','ilheu-das-rolas'),
  ('caue','Ribeira Peixe','ribeira-peixe'),
  ('lemba','Neves','neves'),
  ('lemba','Santa Catarina','santa-catarina'),
  ('lemba','Ponta Figo','ponta-figo'),
  ('lobata','Guadalupe','guadalupe'),
  ('lobata','Praia das Conchas','praia-das-conchas'),
  ('lobata','Agostinho Neto','agostinho-neto'),
  ('me-zochi','Trindade','trindade'),
  ('me-zochi','Bombaim','bombaim'),
  ('me-zochi','Monte Café','monte-cafe'),
  ('me-zochi','Batepá','batepa'),
  ('principe','Santo António','santo-antonio'),
  ('principe','Praia Banana','praia-banana'),
  ('principe','Sundy','sundy'),
  ('principe','Belo Monte','belo-monte')
) AS v(dslug,name,slug)
JOIN public.districts d ON d.slug = v.dslug
ON CONFLICT (district_id, slug) DO NOTHING;