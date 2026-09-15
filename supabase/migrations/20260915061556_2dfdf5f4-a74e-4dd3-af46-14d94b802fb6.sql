
-- ============ 1. Preço de referência ("desde X") por produto ============
CREATE TABLE public.product_price_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.travel_products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'blocked' CHECK (status IN ('published','blocked')),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  price_per_person numeric CHECK (price_per_person IS NULL OR price_per_person > 0),
  price_total numeric CHECK (price_total IS NULL OR price_total > 0),
  duration_days integer,
  nights integer,
  adults integer,
  rooms integer,
  basis text CHECK (basis IS NULL OR basis IN ('confirmed','market_based','insufficient')),
  commercial_state text CHECK (commercial_state IS NULL OR commercial_state IN ('confirmed_pricing','market_based_pricing','pending_validation')),
  policy_version_id uuid REFERENCES public.pricing_policy_versions(id) ON DELETE SET NULL,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_rate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_reason text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.product_price_baselines IS
  'Preço de referência "desde X" calculado pelo Pricing Engine a partir da configuração mínima válida. Nunca é uma tarifa fixa nem garantia de disponibilidade.';

GRANT SELECT ON public.product_price_baselines TO authenticated;
GRANT ALL ON public.product_price_baselines TO service_role;
ALTER TABLE public.product_price_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read product price baselines"
ON public.product_price_baselines FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER product_price_baselines_updated_at
BEFORE UPDATE ON public.product_price_baselines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 2. Configuração do baseline do Rotas Essencial ============
UPDATE public.travel_products
SET builder_config = builder_config || jsonb_build_object(
  'baseline', jsonb_build_object(
    'enabled', true,
    'adults', 2,
    'rooms', 1,
    'required', jsonb_build_array('flight','room','transport','experience')
  )
)
WHERE slug = 'rotas-essencial';

-- ============ 3. Fornecedores de referência (sem parceria) ============
INSERT INTO public.suppliers (legal_name, trading_name, supplier_type, country, locality, website, relationship_stage, status, notes)
VALUES
  ('TAP Air Portugal', 'TAP', 'airline', 'PT', 'Lisboa', 'https://www.flytap.com/en_pt/flights-from-lisbon-to-sao-tome', 'prospect', 'approved',
   'Referência pública de mercado. Sem contrato nem tarifa negociada com a Rotas do Éden.'),
  ('Pestana Hotels & Resorts', 'Pestana São Tomé', 'accommodation', 'ST', 'São Tomé', 'https://www.pestana.com/pt/hotel/pestana-sao-tome', 'prospect', 'approved',
   'Referência pública de mercado. Sem contrato nem tarifa negociada com a Rotas do Éden.'),
  ('São Tomé Rent a Car', 'São Tomé Rent a Car', 'transport', 'ST', 'São Tomé', 'https://saotome-rentacar.com/our-fleet/', 'prospect', 'approved',
   'Referência pública de mercado. Sem contrato nem tarifa negociada com a Rotas do Éden.'),
  ('São Tomé Expert', 'São Tomé Expert', 'experience_operator', 'ST', 'São Tomé', 'https://www.saotomeexpert.pt/tour-authentisches-sao-tome/', 'prospect', 'approved',
   'Referência pública de mercado. Sem contrato nem tarifa negociada com a Rotas do Éden.');

-- ============ 4. Alojamento e tipologias observadas ============
INSERT INTO public.accommodations (supplier_id, name, accommodation_type, locality_name, country, website, status, notes)
SELECT s.id, 'Pestana São Tomé', 'hotel', 'São Tomé', 'ST', 'https://www.pestana.com/pt/hotel/pestana-sao-tome', 'approved',
       'Dados públicos do site oficial. Sem acordo comercial.'
FROM public.suppliers s WHERE s.legal_name = 'Pestana Hotels & Resorts';

INSERT INTO public.accommodation_rooms (accommodation_id, room_name, room_type, status, notes)
SELECT a.id, r.room_name, r.room_type, 'approved', 'Tipologia publicada no site oficial em 15/09/2026.'
FROM public.accommodations a
CROSS JOIN (VALUES
  ('Quarto Standard','standard'),
  ('Quarto Vista Mar','superior'),
  ('Junior Suite','suite'),
  ('Suite Central','suite')
) AS r(room_name, room_type)
WHERE a.name = 'Pestana São Tomé';

-- ============ 5. Componentes de pacote ============
INSERT INTO public.package_components (component_type, name, description, supplier_id, status, notes)
SELECT 'flight', 'Voo Lisboa–São Tomé–Lisboa (Economy, ida e volta)',
       'Ligação regular TAP entre Lisboa e São Tomé. Tarifa pública observada, sujeita a disponibilidade e datas.',
       s.id, 'approved', 'Sem acordo de tarifa. Observação pública.'
FROM public.suppliers s WHERE s.legal_name = 'TAP Air Portugal';

INSERT INTO public.package_components (component_type, name, description, supplier_id, accommodation_id, room_id, status, notes)
SELECT 'room', 'Pestana São Tomé — ' || rm.room_name,
       'Tipologia do Pestana São Tomé com preço público observado por noite.',
       a.supplier_id, a.id, rm.id, 'approved', 'Sem acordo de tarifa. Observação pública.'
FROM public.accommodation_rooms rm
JOIN public.accommodations a ON a.id = rm.accommodation_id
WHERE a.name = 'Pestana São Tomé';

INSERT INTO public.package_components (component_type, name, description, supplier_id, status, notes)
SELECT 'transport', 'Viatura de aluguer — Suzuki Jimny Classic (manual)',
       'Viatura de aluguer local, tarifa pública por dia.',
       s.id, 'approved', 'Sem acordo de tarifa. Observação pública.'
FROM public.suppliers s WHERE s.legal_name = 'São Tomé Rent a Car';

INSERT INTO public.package_components (component_type, name, description, supplier_id, status, notes)
SELECT 'experience', 'Tour Authentic São Tomé (dia completo, 7h)',
       'Passeio de dia inteiro com guia, viatura 4x4, combustível e almoço incluídos.',
       s.id, 'approved', 'Sem acordo de tarifa. Observação pública.'
FROM public.suppliers s WHERE s.legal_name = 'São Tomé Expert';

-- ============ 6. Preços observados no mercado (15/09/2026) ============
-- Voo
INSERT INTO public.component_rates
  (component_id, supplier_id, rate_kind, price, currency, unit, source_type, source_reference, source_document_url,
   observed_at, validity_unknown, status, public_amount, public_currency, notes)
SELECT c.id, c.supplier_id, 'market_observed_price', 580, 'EUR', 'per_person', 'official_website',
       'flytap.com — Lisboa para São Tomé', 'https://www.flytap.com/en_pt/flights-from-lisbon-to-sao-tome',
       '2026-09-15T00:00:00Z', true, 'observed', 580, 'EUR',
       'Desde €580 ida e volta em Economy para algumas combinações de datas em outubro/novembro de 2026. A página avisa que as tarifas podem deixar de estar disponíveis.'
FROM public.package_components c WHERE c.name = 'Voo Lisboa–São Tomé–Lisboa (Economy, ida e volta)';

-- Alojamento por tipologia
INSERT INTO public.component_rates
  (component_id, supplier_id, rate_kind, price, currency, unit, source_type, source_reference, source_document_url,
   observed_at, validity_unknown, status, meal_plan, public_amount, public_currency, notes)
SELECT c.id, c.supplier_id, 'market_observed_price', v.price, 'EUR', 'per_night', 'official_website',
       'pestana.com — Pestana São Tomé', 'https://www.pestana.com/pt/hotel/pestana-sao-tome',
       '2026-09-15T00:00:00Z', true, 'observed', 'unknown', v.price, 'EUR',
       'Preço público "desde" por noite apresentado no site oficial em 15/09/2026. Não é tarifa garantida.'
FROM public.package_components c
JOIN (VALUES
  ('Pestana São Tomé — Quarto Standard', 200),
  ('Pestana São Tomé — Quarto Vista Mar', 239),
  ('Pestana São Tomé — Junior Suite', 259),
  ('Pestana São Tomé — Suite Central', 479)
) AS v(name, price) ON v.name = c.name;

-- Viatura
INSERT INTO public.component_rates
  (component_id, supplier_id, rate_kind, price, currency, unit, source_type, source_reference, source_document_url,
   observed_at, validity_unknown, status, public_amount, public_currency, notes)
SELECT c.id, c.supplier_id, 'market_observed_price', 40, 'EUR', 'per_day', 'official_website',
       'saotome-rentacar.com — frota', 'https://saotome-rentacar.com/our-fleet/',
       '2026-09-15T00:00:00Z', true, 'observed', 40, 'EUR',
       'Jimny Classic manual desde €40–45/dia no site público em 15/09/2026. Registado o limite inferior observado.'
FROM public.package_components c WHERE c.name = 'Viatura de aluguer — Suzuki Jimny Classic (manual)';

-- Experiência
INSERT INTO public.component_rates
  (component_id, supplier_id, rate_kind, price, currency, unit, source_type, source_reference, source_document_url,
   observed_at, validity_unknown, status, public_amount, public_currency, notes)
SELECT c.id, c.supplier_id, 'market_observed_price', 60, 'EUR', 'per_person', 'official_website',
       'saotomeexpert.pt — Tour authentisches Sao Tome', 'https://www.saotomeexpert.pt/tour-authentisches-sao-tome/',
       '2026-09-15T00:00:00Z', true, 'observed', 60, 'EUR',
       'Desde €60 por pessoa, 7 horas, com guia, 4x4, combustível e almoço. Observado no site público em 15/09/2026.'
FROM public.package_components c WHERE c.name = 'Tour Authentic São Tomé (dia completo, 7h)';
