
-- =========================================================================
-- Fase 7C: fornecedores, alojamentos, quartos, componentes e tarifas/custos.
-- Sem preços de venda, margens, voos ou dados fictícios.
-- =========================================================================

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trading_name text,
  supplier_type text NOT NULL CHECK (supplier_type IN (
    'accommodation','guide','transport','restaurant','experience_operator',
    'insurance','airline','other')),
  country text NOT NULL DEFAULT 'ST',
  locality text,
  contact_email text,
  contact_phone text,
  website text,
  relationship_stage text NOT NULL DEFAULT 'prospect' CHECK (relationship_stage IN (
    'prospect','contacted','negotiating','active','inactive','archived')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','under_review','approved','inactive','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX suppliers_type_idx ON public.suppliers (supplier_type, status);

-- ----------------------------------------------------------- accommodations
CREATE TABLE public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  name text NOT NULL,
  description text,
  accommodation_type text NOT NULL DEFAULT 'other' CHECK (accommodation_type IN (
    'hotel','resort','guest_house','local_lodging','eco_lodge','apartment','villa','other')),
  address text,
  district_id uuid REFERENCES public.districts(id),
  locality_id uuid REFERENCES public.localities(id),
  locality_name text,
  country text NOT NULL DEFAULT 'ST',
  website text,
  contact_email text,
  contact_phone text,
  -- Classificação só existe quando houver fonte declarada.
  star_rating numeric CHECK (star_rating IS NULL OR (star_rating >= 0 AND star_rating <= 5)),
  rating_source text,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','under_review','approved','inactive','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accommodations_rating_needs_source
    CHECK (star_rating IS NULL OR nullif(btrim(coalesce(rating_source,'')),'') IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE ON public.accommodations TO authenticated;
GRANT ALL ON public.accommodations TO service_role;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read accommodations" ON public.accommodations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert accommodations" ON public.accommodations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update accommodations" ON public.accommodations
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER accommodations_updated_at BEFORE UPDATE ON public.accommodations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX accommodations_supplier_idx ON public.accommodations (supplier_id);

-- ------------------------------------------------------- accommodation rooms
CREATE TABLE public.accommodation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id),
  room_name text NOT NULL,
  room_type text NOT NULL DEFAULT 'other' CHECK (room_type IN (
    'standard','superior','premium','suite','family','bungalow','villa','dormitory','other')),
  max_adults integer CHECK (max_adults IS NULL OR max_adults >= 0),
  max_children integer CHECK (max_children IS NULL OR max_children >= 0),
  max_guests integer CHECK (max_guests IS NULL OR max_guests >= 1),
  size_sqm numeric CHECK (size_sqm IS NULL OR size_sqm > 0),
  bed_configuration text,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  capacity_source text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','under_review','approved','inactive','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accommodation_rooms_capacity_needs_source
    CHECK ((max_adults IS NULL AND max_children IS NULL AND max_guests IS NULL)
           OR nullif(btrim(coalesce(capacity_source,'')),'') IS NOT NULL),
  UNIQUE (accommodation_id, room_name)
);

GRANT SELECT, INSERT, UPDATE ON public.accommodation_rooms TO authenticated;
GRANT ALL ON public.accommodation_rooms TO service_role;
ALTER TABLE public.accommodation_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read rooms" ON public.accommodation_rooms
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert rooms" ON public.accommodation_rooms
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update rooms" ON public.accommodation_rooms
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER accommodation_rooms_updated_at BEFORE UPDATE ON public.accommodation_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX accommodation_rooms_accommodation_idx ON public.accommodation_rooms (accommodation_id);

-- ------------------------------------------------------------- components --
CREATE TABLE public.package_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type text NOT NULL CHECK (component_type IN (
    'accommodation','room','transport','transfer','experience','guide','meal','insurance','flight','other')),
  name text NOT NULL,
  description text,
  supplier_id uuid REFERENCES public.suppliers(id),
  accommodation_id uuid REFERENCES public.accommodations(id),
  room_id uuid REFERENCES public.accommodation_rooms(id),
  -- Reutiliza serviços e guias já existentes em vez de os duplicar.
  service_id uuid REFERENCES public.services(id),
  guide_profile_id uuid REFERENCES public.professional_profiles(id),
  flight_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','under_review','approved','inactive','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_components_room_needs_accommodation
    CHECK (room_id IS NULL OR accommodation_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE ON public.package_components TO authenticated;
GRANT ALL ON public.package_components TO service_role;
ALTER TABLE public.package_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read components" ON public.package_components
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert components" ON public.package_components
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update components" ON public.package_components
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER package_components_updated_at BEFORE UPDATE ON public.package_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX package_components_service_unique
  ON public.package_components (service_id) WHERE service_id IS NOT NULL;
CREATE UNIQUE INDEX package_components_room_unique
  ON public.package_components (room_id) WHERE room_id IS NOT NULL;
CREATE INDEX package_components_type_idx ON public.package_components (component_type, status);

-- ------------------------------------------------------------ rates/costs --
CREATE TABLE public.component_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.package_components(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  -- Distinção obrigatória entre preço observado, custo de fornecedor e tarifa negociada.
  rate_kind text NOT NULL CHECK (rate_kind IN (
    'market_observed_price','supplier_cost','negotiated_rotas_rate','estimated_cost')),
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit text NOT NULL CHECK (unit IN (
    'per_person','per_night','per_room','per_day','per_group','per_service','fixed')),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  occupancy_adults integer CHECK (occupancy_adults IS NULL OR occupancy_adults >= 0),
  occupancy_children integer CHECK (occupancy_children IS NULL OR occupancy_children >= 0),
  occupancy_total integer CHECK (occupancy_total IS NULL OR occupancy_total >= 1),
  meal_plan text NOT NULL DEFAULT 'unknown' CHECK (meal_plan IN (
    'room_only','breakfast','half_board','full_board','all_inclusive','other','unknown')),
  cancellation_type text NOT NULL DEFAULT 'unknown' CHECK (cancellation_type IN (
    'refundable','non_refundable','partially_refundable','unknown')),
  cancellation_summary text,
  source_type text NOT NULL CHECK (source_type IN (
    'official_website','booking_channel','supplier_quote','supplier_contract',
    'supplier_rate_sheet','internal_service','other_verified_source')),
  source_reference text,
  source_document_url text,
  observed_at timestamptz NOT NULL,
  valid_from date,
  valid_until date,
  validity_unknown boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'observed' CHECK (status IN (
    'observed','quoted','negotiated','confirmed','expired','withdrawn')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT component_rates_validity_order
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT component_rates_occupancy_total
    CHECK (occupancy_total IS NULL OR occupancy_adults IS NULL OR occupancy_children IS NULL
           OR occupancy_total >= occupancy_adults + occupancy_children)
);

GRANT SELECT, INSERT, UPDATE ON public.component_rates TO authenticated;
GRANT ALL ON public.component_rates TO service_role;
ALTER TABLE public.component_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read rates" ON public.component_rates
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert rates" ON public.component_rates
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update rates" ON public.component_rates
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER component_rates_updated_at BEFORE UPDATE ON public.component_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX component_rates_component_idx ON public.component_rates (component_id, observed_at DESC);
CREATE INDEX component_rates_kind_idx ON public.component_rates (rate_kind, status);

-- Regras de qualidade que não cabem em CHECK imutável (dependem de now()).
CREATE OR REPLACE FUNCTION public.validate_component_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.observed_at > now() + interval '1 day' THEN
    RAISE EXCEPTION 'observed_at_cannot_be_in_the_future';
  END IF;

  IF NEW.validity_unknown = false AND NEW.valid_until IS NULL AND NEW.valid_from IS NULL THEN
    RAISE EXCEPTION 'validity_required_when_not_unknown';
  END IF;

  -- Um custo confirmado exige validade conhecida e uma fonte de fornecedor.
  IF NEW.status = 'confirmed' THEN
    IF NEW.validity_unknown THEN
      RAISE EXCEPTION 'confirmed_cost_requires_known_validity';
    END IF;
    IF NEW.valid_until IS NOT NULL AND NEW.valid_until < current_date THEN
      RAISE EXCEPTION 'confirmed_cost_cannot_be_expired';
    END IF;
    IF NEW.rate_kind = 'market_observed_price' THEN
      RAISE EXCEPTION 'observed_market_price_cannot_be_confirmed_cost';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IN ('expired','withdrawn') AND NEW.status NOT IN ('expired','withdrawn') THEN
    RAISE EXCEPTION 'closed_rate_cannot_be_reopened';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER component_rates_validate
  BEFORE INSERT OR UPDATE ON public.component_rates
  FOR EACH ROW EXECUTE FUNCTION public.validate_component_rate();

-- O histórico nunca desaparece.
CREATE OR REPLACE FUNCTION public.guard_supply_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'supply_records_are_never_deleted';
END;
$$;

CREATE TRIGGER suppliers_no_delete BEFORE DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.guard_supply_delete();
CREATE TRIGGER accommodations_no_delete BEFORE DELETE ON public.accommodations
  FOR EACH ROW EXECUTE FUNCTION public.guard_supply_delete();
CREATE TRIGGER accommodation_rooms_no_delete BEFORE DELETE ON public.accommodation_rooms
  FOR EACH ROW EXECUTE FUNCTION public.guard_supply_delete();
CREATE TRIGGER package_components_no_delete BEFORE DELETE ON public.package_components
  FOR EACH ROW EXECUTE FUNCTION public.guard_supply_delete();
CREATE TRIGGER component_rates_no_delete BEFORE DELETE ON public.component_rates
  FOR EACH ROW EXECUTE FUNCTION public.guard_supply_delete();

REVOKE EXECUTE ON FUNCTION public.validate_component_rate() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_supply_delete() FROM anon, authenticated;

-- ---------------------------------------------------------------- RPCs -----

CREATE OR REPLACE FUNCTION public.admin_save_supplier(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(coalesce(_payload->>'legal_name','')),'') IS NULL THEN
    RAISE EXCEPTION 'legal_name_required';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.suppliers (
      legal_name, trading_name, supplier_type, country, locality,
      contact_email, contact_phone, website, relationship_stage, notes, created_by
    ) VALUES (
      btrim(_payload->>'legal_name'),
      nullif(btrim(coalesce(_payload->>'trading_name','')),''),
      coalesce(nullif(_payload->>'supplier_type',''),'other'),
      coalesce(nullif(_payload->>'country',''),'ST'),
      nullif(btrim(coalesce(_payload->>'locality','')),''),
      nullif(btrim(coalesce(_payload->>'contact_email','')),''),
      nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
      nullif(btrim(coalesce(_payload->>'website','')),''),
      coalesce(nullif(_payload->>'relationship_stage',''),'prospect'),
      nullif(btrim(coalesce(_payload->>'notes','')),''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'supplier_created', 'supplier', _id, _payload);
    RETURN jsonb_build_object('ok', true, 'supplier_id', _id, 'created', true);
  END IF;

  UPDATE public.suppliers SET
    legal_name = btrim(_payload->>'legal_name'),
    trading_name = nullif(btrim(coalesce(_payload->>'trading_name','')),''),
    supplier_type = coalesce(nullif(_payload->>'supplier_type',''), supplier_type),
    country = coalesce(nullif(_payload->>'country',''), country),
    locality = nullif(btrim(coalesce(_payload->>'locality','')),''),
    contact_email = nullif(btrim(coalesce(_payload->>'contact_email','')),''),
    contact_phone = nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
    website = nullif(btrim(coalesce(_payload->>'website','')),''),
    relationship_stage = coalesce(nullif(_payload->>'relationship_stage',''), relationship_stage),
    notes = nullif(btrim(coalesce(_payload->>'notes','')),'')
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'supplier_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'supplier_updated', 'supplier', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'supplier_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_supply_status(
  _entity text, _entity_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _prev text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _status NOT IN ('draft','under_review','approved','inactive','archived') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  IF _status = 'archived' AND nullif(btrim(coalesce(_note,'')),'') IS NULL THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  IF _entity = 'supplier' THEN
    SELECT status INTO _prev FROM public.suppliers WHERE id = _entity_id;
    IF _prev IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
    UPDATE public.suppliers SET status = _status WHERE id = _entity_id;
  ELSIF _entity = 'accommodation' THEN
    SELECT status INTO _prev FROM public.accommodations WHERE id = _entity_id;
    IF _prev IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
    UPDATE public.accommodations SET status = _status WHERE id = _entity_id;
  ELSIF _entity = 'room' THEN
    SELECT status INTO _prev FROM public.accommodation_rooms WHERE id = _entity_id;
    IF _prev IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
    UPDATE public.accommodation_rooms SET status = _status WHERE id = _entity_id;
  ELSIF _entity = 'component' THEN
    SELECT status INTO _prev FROM public.package_components WHERE id = _entity_id;
    IF _prev IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
    UPDATE public.package_components SET status = _status WHERE id = _entity_id;
  ELSE
    RAISE EXCEPTION 'invalid_entity';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'supply_status_change', _entity, _entity_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'previous_status', _prev, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_accommodation(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _supplier uuid := nullif(_payload->>'supplier_id','')::uuid;
  _rating numeric := nullif(_payload->>'star_rating','')::numeric;
  _rating_source text := nullif(btrim(coalesce(_payload->>'rating_source','')),'');
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(coalesce(_payload->>'name','')),'') IS NULL THEN RAISE EXCEPTION 'name_required'; END IF;
  IF _rating IS NOT NULL AND _rating_source IS NULL THEN RAISE EXCEPTION 'rating_requires_source'; END IF;

  IF _id IS NULL THEN
    IF _supplier IS NULL OR NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = _supplier) THEN
      RAISE EXCEPTION 'supplier_not_found';
    END IF;
    INSERT INTO public.accommodations (
      supplier_id, name, description, accommodation_type, address, district_id, locality_id,
      locality_name, country, website, contact_email, contact_phone,
      star_rating, rating_source, amenities, notes, created_by
    ) VALUES (
      _supplier,
      btrim(_payload->>'name'),
      nullif(btrim(coalesce(_payload->>'description','')),''),
      coalesce(nullif(_payload->>'accommodation_type',''),'other'),
      nullif(btrim(coalesce(_payload->>'address','')),''),
      nullif(_payload->>'district_id','')::uuid,
      nullif(_payload->>'locality_id','')::uuid,
      nullif(btrim(coalesce(_payload->>'locality_name','')),''),
      coalesce(nullif(_payload->>'country',''),'ST'),
      nullif(btrim(coalesce(_payload->>'website','')),''),
      nullif(btrim(coalesce(_payload->>'contact_email','')),''),
      nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
      _rating, _rating_source,
      coalesce(_payload->'amenities','[]'::jsonb),
      nullif(btrim(coalesce(_payload->>'notes','')),''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'accommodation_created', 'accommodation', _id, _payload);
    RETURN jsonb_build_object('ok', true, 'accommodation_id', _id, 'created', true);
  END IF;

  UPDATE public.accommodations SET
    name = btrim(_payload->>'name'),
    description = nullif(btrim(coalesce(_payload->>'description','')),''),
    accommodation_type = coalesce(nullif(_payload->>'accommodation_type',''), accommodation_type),
    address = nullif(btrim(coalesce(_payload->>'address','')),''),
    district_id = nullif(_payload->>'district_id','')::uuid,
    locality_id = nullif(_payload->>'locality_id','')::uuid,
    locality_name = nullif(btrim(coalesce(_payload->>'locality_name','')),''),
    country = coalesce(nullif(_payload->>'country',''), country),
    website = nullif(btrim(coalesce(_payload->>'website','')),''),
    contact_email = nullif(btrim(coalesce(_payload->>'contact_email','')),''),
    contact_phone = nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
    star_rating = _rating,
    rating_source = _rating_source,
    amenities = coalesce(_payload->'amenities', amenities),
    notes = nullif(btrim(coalesce(_payload->>'notes','')),'')
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'accommodation_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'accommodation_updated', 'accommodation', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'accommodation_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_room(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _acc uuid := nullif(_payload->>'accommodation_id','')::uuid;
  _adults integer := nullif(_payload->>'max_adults','')::integer;
  _children integer := nullif(_payload->>'max_children','')::integer;
  _guests integer := nullif(_payload->>'max_guests','')::integer;
  _source text := nullif(btrim(coalesce(_payload->>'capacity_source','')),'');
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(coalesce(_payload->>'room_name','')),'') IS NULL THEN RAISE EXCEPTION 'room_name_required'; END IF;
  IF (_adults IS NOT NULL OR _children IS NOT NULL OR _guests IS NOT NULL) AND _source IS NULL THEN
    RAISE EXCEPTION 'capacity_requires_source';
  END IF;

  IF _id IS NULL THEN
    IF _acc IS NULL OR NOT EXISTS (SELECT 1 FROM public.accommodations WHERE id = _acc) THEN
      RAISE EXCEPTION 'accommodation_not_found';
    END IF;
    INSERT INTO public.accommodation_rooms (
      accommodation_id, room_name, room_type, max_adults, max_children, max_guests,
      size_sqm, bed_configuration, amenities, capacity_source, notes, created_by
    ) VALUES (
      _acc,
      btrim(_payload->>'room_name'),
      coalesce(nullif(_payload->>'room_type',''),'other'),
      _adults, _children, _guests,
      nullif(_payload->>'size_sqm','')::numeric,
      nullif(btrim(coalesce(_payload->>'bed_configuration','')),''),
      coalesce(_payload->'amenities','[]'::jsonb),
      _source,
      nullif(btrim(coalesce(_payload->>'notes','')),''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'room_created', 'room', _id, _payload);
    RETURN jsonb_build_object('ok', true, 'room_id', _id, 'created', true);
  END IF;

  UPDATE public.accommodation_rooms SET
    room_name = btrim(_payload->>'room_name'),
    room_type = coalesce(nullif(_payload->>'room_type',''), room_type),
    max_adults = _adults,
    max_children = _children,
    max_guests = _guests,
    size_sqm = nullif(_payload->>'size_sqm','')::numeric,
    bed_configuration = nullif(btrim(coalesce(_payload->>'bed_configuration','')),''),
    amenities = coalesce(_payload->'amenities', amenities),
    capacity_source = _source,
    notes = nullif(btrim(coalesce(_payload->>'notes','')),'')
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'room_updated', 'room', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'room_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_component(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _type text := nullif(_payload->>'component_type','');
  _service uuid := nullif(_payload->>'service_id','')::uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(coalesce(_payload->>'name','')),'') IS NULL THEN RAISE EXCEPTION 'name_required'; END IF;
  IF _type IS NULL THEN RAISE EXCEPTION 'component_type_required'; END IF;
  IF _service IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.services WHERE id = _service) THEN
    RAISE EXCEPTION 'service_not_found';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.package_components (
      component_type, name, description, supplier_id, accommodation_id, room_id,
      service_id, guide_profile_id, metadata, notes, created_by
    ) VALUES (
      _type,
      btrim(_payload->>'name'),
      nullif(btrim(coalesce(_payload->>'description','')),''),
      nullif(_payload->>'supplier_id','')::uuid,
      nullif(_payload->>'accommodation_id','')::uuid,
      nullif(_payload->>'room_id','')::uuid,
      _service,
      nullif(_payload->>'guide_profile_id','')::uuid,
      coalesce(_payload->'metadata','{}'::jsonb),
      nullif(btrim(coalesce(_payload->>'notes','')),''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'component_created', 'component', _id, _payload);
    RETURN jsonb_build_object('ok', true, 'component_id', _id, 'created', true);
  END IF;

  UPDATE public.package_components SET
    name = btrim(_payload->>'name'),
    description = nullif(btrim(coalesce(_payload->>'description','')),''),
    supplier_id = nullif(_payload->>'supplier_id','')::uuid,
    accommodation_id = nullif(_payload->>'accommodation_id','')::uuid,
    room_id = nullif(_payload->>'room_id','')::uuid,
    service_id = _service,
    guide_profile_id = nullif(_payload->>'guide_profile_id','')::uuid,
    metadata = coalesce(_payload->'metadata', metadata),
    notes = nullif(btrim(coalesce(_payload->>'notes','')),'')
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'component_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'component_updated', 'component', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'component_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_rate(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _component uuid := nullif(_payload->>'component_id','')::uuid;
  _price numeric := nullif(_payload->>'price','')::numeric;
  _currency text := upper(nullif(btrim(coalesce(_payload->>'currency','')),''));
  _unit text := nullif(_payload->>'unit','');
  _source text := nullif(_payload->>'source_type','');
  _observed timestamptz := nullif(_payload->>'observed_at','')::timestamptz;
  _kind text := nullif(_payload->>'rate_kind','');
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _component IS NULL OR NOT EXISTS (SELECT 1 FROM public.package_components WHERE id = _component) THEN
    RAISE EXCEPTION 'component_not_found';
  END IF;
  IF _price IS NULL OR _price < 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;
  IF _currency IS NULL THEN RAISE EXCEPTION 'currency_required'; END IF;
  IF _unit IS NULL THEN RAISE EXCEPTION 'unit_required'; END IF;
  IF _source IS NULL THEN RAISE EXCEPTION 'source_type_required'; END IF;
  IF _observed IS NULL THEN RAISE EXCEPTION 'observed_at_required'; END IF;
  IF _kind IS NULL THEN RAISE EXCEPTION 'rate_kind_required'; END IF;

  IF _id IS NULL THEN
    INSERT INTO public.component_rates (
      component_id, supplier_id, rate_kind, price, currency, unit, quantity,
      occupancy_adults, occupancy_children, occupancy_total, meal_plan,
      cancellation_type, cancellation_summary, source_type, source_reference,
      source_document_url, observed_at, valid_from, valid_until, validity_unknown,
      status, notes, created_by
    ) VALUES (
      _component,
      nullif(_payload->>'supplier_id','')::uuid,
      _kind, _price, _currency, _unit,
      coalesce(nullif(_payload->>'quantity','')::numeric, 1),
      nullif(_payload->>'occupancy_adults','')::integer,
      nullif(_payload->>'occupancy_children','')::integer,
      nullif(_payload->>'occupancy_total','')::integer,
      coalesce(nullif(_payload->>'meal_plan',''),'unknown'),
      coalesce(nullif(_payload->>'cancellation_type',''),'unknown'),
      nullif(btrim(coalesce(_payload->>'cancellation_summary','')),''),
      _source,
      nullif(btrim(coalesce(_payload->>'source_reference','')),''),
      nullif(btrim(coalesce(_payload->>'source_document_url','')),''),
      _observed,
      nullif(_payload->>'valid_from','')::date,
      nullif(_payload->>'valid_until','')::date,
      coalesce((_payload->>'validity_unknown')::boolean, nullif(_payload->>'valid_until','') IS NULL),
      coalesce(nullif(_payload->>'status',''),'observed'),
      nullif(btrim(coalesce(_payload->>'notes','')),''),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'rate_created', 'component_rate', _id, _payload);
    RETURN jsonb_build_object('ok', true, 'rate_id', _id, 'created', true);
  END IF;

  UPDATE public.component_rates SET
    supplier_id = nullif(_payload->>'supplier_id','')::uuid,
    rate_kind = _kind, price = _price, currency = _currency, unit = _unit,
    quantity = coalesce(nullif(_payload->>'quantity','')::numeric, quantity),
    occupancy_adults = nullif(_payload->>'occupancy_adults','')::integer,
    occupancy_children = nullif(_payload->>'occupancy_children','')::integer,
    occupancy_total = nullif(_payload->>'occupancy_total','')::integer,
    meal_plan = coalesce(nullif(_payload->>'meal_plan',''), meal_plan),
    cancellation_type = coalesce(nullif(_payload->>'cancellation_type',''), cancellation_type),
    cancellation_summary = nullif(btrim(coalesce(_payload->>'cancellation_summary','')),''),
    source_type = _source,
    source_reference = nullif(btrim(coalesce(_payload->>'source_reference','')),''),
    source_document_url = nullif(btrim(coalesce(_payload->>'source_document_url','')),''),
    observed_at = _observed,
    valid_from = nullif(_payload->>'valid_from','')::date,
    valid_until = nullif(_payload->>'valid_until','')::date,
    validity_unknown = coalesce((_payload->>'validity_unknown')::boolean, validity_unknown),
    notes = nullif(btrim(coalesce(_payload->>'notes','')),'')
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'rate_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'rate_updated', 'component_rate', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'rate_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_rate_status(_rate_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _prev text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _status NOT IN ('observed','quoted','negotiated','confirmed','expired','withdrawn') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT status INTO _prev FROM public.component_rates WHERE id = _rate_id;
  IF _prev IS NULL THEN RAISE EXCEPTION 'rate_not_found'; END IF;

  UPDATE public.component_rates SET status = _status WHERE id = _rate_id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(),
          CASE WHEN _status = 'confirmed' THEN 'rate_confirmed' ELSE 'rate_status_change' END,
          'component_rate', _rate_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'previous_status', _prev, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.supply_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  RETURN jsonb_build_object(
    'suppliers', (SELECT count(*) FROM public.suppliers),
    'suppliers_approved', (SELECT count(*) FROM public.suppliers WHERE status = 'approved'),
    'accommodations', (SELECT count(*) FROM public.accommodations),
    'rooms', (SELECT count(*) FROM public.accommodation_rooms),
    'components', (SELECT count(*) FROM public.package_components),
    'rates', (SELECT count(*) FROM public.component_rates),
    'rates_confirmed', (SELECT count(*) FROM public.component_rates WHERE status = 'confirmed'),
    'rates_expired', (SELECT count(*) FROM public.component_rates WHERE status = 'expired'),
    'market_observed', (SELECT count(*) FROM public.component_rates WHERE rate_kind = 'market_observed_price'),
    'negotiated', (SELECT count(*) FROM public.component_rates WHERE rate_kind = 'negotiated_rotas_rate')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_supplier(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_supply_status(text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_accommodation(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_room(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_component(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_rate(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_rate_status(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.supply_stats() FROM anon;
