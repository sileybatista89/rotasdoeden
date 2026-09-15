
CREATE TABLE public.experience_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  island text NOT NULL DEFAULT 'sao_tome',
  short_description text,
  image_url text,
  typical_duration_hours numeric,
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  package_component_id uuid REFERENCES public.package_components(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.experience_catalog_items TO anon, authenticated;
GRANT ALL ON public.experience_catalog_items TO service_role;
ALTER TABLE public.experience_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_public_read_active" ON public.experience_catalog_items
  FOR SELECT USING (is_active = true);
CREATE POLICY "catalog_admin_read" ON public.experience_catalog_items
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "catalog_admin_write" ON public.experience_catalog_items
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_catalog_category ON public.experience_catalog_items (category, sort_order);
CREATE TRIGGER trg_catalog_updated_at BEFORE UPDATE ON public.experience_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.package_builder_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.travel_products(id) ON DELETE RESTRICT,
  product_version_id uuid REFERENCES public.travel_product_versions(id) ON DELETE SET NULL,
  session_token_hash text NOT NULL UNIQUE,
  visitor_id uuid,
  user_id uuid,
  duration_days integer NOT NULL,
  adults integer NOT NULL DEFAULT 2,
  children integer NOT NULL DEFAULT 0,
  rooms integer NOT NULL DEFAULT 1,
  start_date date,
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  status text NOT NULL DEFAULT 'rascunho',
  quote_id uuid REFERENCES public.travel_quotes(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_builder_configs_status_check
    CHECK (status IN ('rascunho','submetido','em_analise','cotado','arquivado')),
  CONSTRAINT package_builder_configs_duration_check CHECK (duration_days BETWEEN 1 AND 60)
);

GRANT SELECT ON public.package_builder_configs TO authenticated;
GRANT ALL ON public.package_builder_configs TO service_role;
ALTER TABLE public.package_builder_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_admin_read" ON public.package_builder_configs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "builder_admin_update" ON public.package_builder_configs
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "builder_service_role" ON public.package_builder_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_builder_status ON public.package_builder_configs (status, created_at DESC);
CREATE TRIGGER trg_builder_updated_at BEFORE UPDATE ON public.package_builder_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.guard_builder_config_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'As configurações de viagem não podem ser apagadas; arquiva-as.';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_builder_config_delete() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_builder_no_delete BEFORE DELETE ON public.package_builder_configs
  FOR EACH ROW EXECUTE FUNCTION public.guard_builder_config_delete();

CREATE OR REPLACE FUNCTION public.admin_save_catalog_item(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := NULLIF(_payload->>'id','')::uuid;
  _row public.experience_catalog_items;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerir o catálogo editorial.';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.experience_catalog_items (
      slug, name, category, island, short_description, image_url,
      typical_duration_hours, locality_id, service_id, package_component_id,
      is_active, sort_order, created_by
    ) VALUES (
      _payload->>'slug',
      _payload->>'name',
      _payload->>'category',
      COALESCE(_payload->>'island','sao_tome'),
      NULLIF(_payload->>'short_description',''),
      NULLIF(_payload->>'image_url',''),
      NULLIF(_payload->>'typical_duration_hours','')::numeric,
      NULLIF(_payload->>'locality_id','')::uuid,
      NULLIF(_payload->>'service_id','')::uuid,
      NULLIF(_payload->>'package_component_id','')::uuid,
      COALESCE((_payload->>'is_active')::boolean, true),
      COALESCE((_payload->>'sort_order')::integer, 0),
      auth.uid()
    ) RETURNING * INTO _row;
  ELSE
    UPDATE public.experience_catalog_items SET
      name = COALESCE(_payload->>'name', name),
      category = COALESCE(_payload->>'category', category),
      island = COALESCE(_payload->>'island', island),
      short_description = COALESCE(_payload->>'short_description', short_description),
      image_url = COALESCE(_payload->>'image_url', image_url),
      typical_duration_hours = COALESCE(NULLIF(_payload->>'typical_duration_hours','')::numeric, typical_duration_hours),
      locality_id = CASE WHEN _payload ? 'locality_id' THEN NULLIF(_payload->>'locality_id','')::uuid ELSE locality_id END,
      service_id = CASE WHEN _payload ? 'service_id' THEN NULLIF(_payload->>'service_id','')::uuid ELSE service_id END,
      package_component_id = CASE WHEN _payload ? 'package_component_id' THEN NULLIF(_payload->>'package_component_id','')::uuid ELSE package_component_id END,
      is_active = COALESCE((_payload->>'is_active')::boolean, is_active),
      sort_order = COALESCE((_payload->>'sort_order')::integer, sort_order)
    WHERE id = _id
    RETURNING * INTO _row;
  END IF;

  RETURN to_jsonb(_row);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_catalog_item(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_catalog_item(jsonb) TO authenticated;
