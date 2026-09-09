
-- =========================================================================
-- Fase 7B: produtos de pacote + versões. Sem preços, custos ou fornecedores.
-- =========================================================================

CREATE TABLE public.travel_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  product_type text NOT NULL DEFAULT 'standard_package'
    CHECK (product_type IN ('standard_package','custom_package')),
  minimum_days integer NOT NULL CHECK (minimum_days >= 1),
  maximum_days integer CHECK (maximum_days IS NULL OR maximum_days >= 1),
  minimum_nights integer NOT NULL CHECK (minimum_nights >= 0),
  maximum_nights integer CHECK (maximum_nights IS NULL OR maximum_nights >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','published','archived')),
  current_version_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travel_products_days_range CHECK (maximum_days IS NULL OR maximum_days >= minimum_days),
  CONSTRAINT travel_products_nights_range CHECK (maximum_nights IS NULL OR maximum_nights >= minimum_nights)
);

GRANT SELECT, INSERT, UPDATE ON public.travel_products TO authenticated;
GRANT ALL ON public.travel_products TO service_role;
ALTER TABLE public.travel_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage travel products"
  ON public.travel_products FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert travel products"
  ON public.travel_products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update travel products"
  ON public.travel_products FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER travel_products_updated_at
  BEFORE UPDATE ON public.travel_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.travel_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.travel_products(id),
  version_number integer NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days >= 1),
  nights integer NOT NULL CHECK (nights >= 0),
  terms text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Structure only. Real components arrive in a later phase.
  included_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_reason text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (product_id, version_number)
);

GRANT SELECT, INSERT, UPDATE ON public.travel_product_versions TO authenticated;
GRANT ALL ON public.travel_product_versions TO service_role;
ALTER TABLE public.travel_product_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read product versions"
  ON public.travel_product_versions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert product versions"
  ON public.travel_product_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update draft versions"
  ON public.travel_product_versions FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) AND status = 'draft')
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER travel_product_versions_updated_at
  BEFORE UPDATE ON public.travel_product_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.travel_products
  ADD CONSTRAINT travel_products_current_version_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.travel_product_versions(id);

CREATE INDEX travel_product_versions_product_idx
  ON public.travel_product_versions (product_id, version_number DESC);

-- A published version is frozen: only archiving it is allowed.
CREATE OR REPLACE FUNCTION public.guard_published_product_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'product_versions_are_never_deleted';
  END IF;

  IF OLD.status = 'published' THEN
    IF NEW.status = 'archived'
       AND NEW.duration_days = OLD.duration_days
       AND NEW.nights = OLD.nights
       AND NEW.included_components IS NOT DISTINCT FROM OLD.included_components
       AND NEW.conditions IS NOT DISTINCT FROM OLD.conditions
       AND NEW.terms IS NOT DISTINCT FROM OLD.terms
       AND NEW.version_number = OLD.version_number
       AND NEW.product_id = OLD.product_id
       AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'published_version_is_immutable';
  END IF;

  IF OLD.status = 'archived' AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'archived_version_is_immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER travel_product_versions_guard
  BEFORE UPDATE OR DELETE ON public.travel_product_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_published_product_version();

CREATE OR REPLACE FUNCTION public.guard_travel_product_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'travel_products_are_never_deleted';
END;
$$;

CREATE TRIGGER travel_products_no_delete
  BEFORE DELETE ON public.travel_products
  FOR EACH ROW EXECUTE FUNCTION public.guard_travel_product_delete();

REVOKE EXECUTE ON FUNCTION public.guard_published_product_version() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_travel_product_delete() FROM anon, authenticated;

-- ---------------------------------------------------------------- RPCs -----

CREATE OR REPLACE FUNCTION public.admin_save_travel_product(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _status text;
  _min_days integer := (_payload->>'minimum_days')::integer;
  _max_days integer := nullif(_payload->>'maximum_days','')::integer;
  _min_nights integer := coalesce((_payload->>'minimum_nights')::integer, greatest((_payload->>'minimum_days')::integer - 1, 0));
  _max_nights integer := nullif(_payload->>'maximum_nights','')::integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _min_days IS NULL OR _min_days < 1 THEN
    RAISE EXCEPTION 'invalid_minimum_days';
  END IF;
  IF _max_days IS NOT NULL AND _max_days < _min_days THEN
    RAISE EXCEPTION 'invalid_duration_range';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.travel_products (
      slug, name, description, product_type,
      minimum_days, maximum_days, minimum_nights, maximum_nights,
      sort_order, created_by
    ) VALUES (
      lower(btrim(_payload->>'slug')),
      btrim(_payload->>'name'),
      nullif(btrim(coalesce(_payload->>'description','')), ''),
      coalesce(nullif(_payload->>'product_type',''), 'standard_package'),
      _min_days, _max_days, _min_nights, _max_nights,
      coalesce((_payload->>'sort_order')::integer, 0),
      auth.uid()
    ) RETURNING id INTO _id;

    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'travel_product_created', 'travel_product', _id, _payload);

    RETURN jsonb_build_object('ok', true, 'product_id', _id, 'created', true);
  END IF;

  SELECT status INTO _status FROM public.travel_products WHERE id = _id;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;
  IF _status <> 'draft' THEN
    RAISE EXCEPTION 'only_draft_products_can_be_edited';
  END IF;

  UPDATE public.travel_products
     SET name = coalesce(nullif(btrim(_payload->>'name'),''), name),
         description = coalesce(nullif(btrim(coalesce(_payload->>'description','')),''), description),
         minimum_days = _min_days,
         maximum_days = _max_days,
         minimum_nights = _min_nights,
         maximum_nights = _max_nights,
         sort_order = coalesce((_payload->>'sort_order')::integer, sort_order)
   WHERE id = _id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'travel_product_updated', 'travel_product', _id, _payload);

  RETURN jsonb_build_object('ok', true, 'product_id', _id, 'created', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_travel_product_status(_product_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prev text;
  _version uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _status NOT IN ('draft','under_review','published','archived') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF _status = 'archived' AND (_note IS NULL OR btrim(_note) = '') THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  SELECT status, current_version_id INTO _prev, _version
    FROM public.travel_products WHERE id = _product_id;
  IF _prev IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  -- Publication is always an explicit human act and needs a published version.
  IF _status = 'published' THEN
    IF _version IS NULL THEN
      RAISE EXCEPTION 'publish_requires_published_version';
    END IF;
    IF _prev <> 'under_review' THEN
      RAISE EXCEPTION 'publish_requires_review_first';
    END IF;
  END IF;

  UPDATE public.travel_products SET status = _status WHERE id = _product_id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'travel_product_status_change', 'travel_product', _product_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'product_id', _product_id, 'status', _status, 'previous_status', _prev);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_product_version(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product_id uuid := (_payload->>'product_id')::uuid;
  _next integer;
  _id uuid;
  _min integer;
  _max integer;
  _days integer := (_payload->>'duration_days')::integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT minimum_days, maximum_days INTO _min, _max
    FROM public.travel_products WHERE id = _product_id;
  IF _min IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF _days IS NULL OR _days < _min OR (_max IS NOT NULL AND _days > _max) THEN
    RAISE EXCEPTION 'duration_outside_product_range';
  END IF;

  SELECT coalesce(max(version_number), 0) + 1 INTO _next
    FROM public.travel_product_versions WHERE product_id = _product_id;

  INSERT INTO public.travel_product_versions (
    product_id, version_number, duration_days, nights, terms, conditions, change_reason, created_by
  ) VALUES (
    _product_id, _next, _days,
    coalesce((_payload->>'nights')::integer, greatest(_days - 1, 0)),
    nullif(btrim(coalesce(_payload->>'terms','')), ''),
    coalesce(_payload->'conditions', '{}'::jsonb),
    nullif(btrim(coalesce(_payload->>'change_reason','')), ''),
    auth.uid()
  ) RETURNING id INTO _id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'travel_product_version_created', 'travel_product_version', _id,
          jsonb_build_object('product_id', _product_id, 'version_number', _next));

  RETURN jsonb_build_object('ok', true, 'version_id', _id, 'version_number', _next);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_publish_product_version(_version_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product_id uuid;
  _status text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT product_id, status INTO _product_id, _status
    FROM public.travel_product_versions WHERE id = _version_id;
  IF _product_id IS NULL THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;
  IF _status <> 'draft' THEN
    RAISE EXCEPTION 'only_draft_versions_can_be_published';
  END IF;

  UPDATE public.travel_product_versions
     SET status = 'published', published_at = now()
   WHERE id = _version_id;

  UPDATE public.travel_products
     SET current_version_id = _version_id
   WHERE id = _product_id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'travel_product_version_published', 'travel_product_version', _version_id,
          jsonb_build_object('product_id', _product_id, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'version_id', _version_id, 'product_id', _product_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.travel_product_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'draft', count(*) FILTER (WHERE status = 'draft'),
    'under_review', count(*) FILTER (WHERE status = 'under_review'),
    'published', count(*) FILTER (WHERE status = 'published'),
    'archived', count(*) FILTER (WHERE status = 'archived'),
    'custom', count(*) FILTER (WHERE product_type = 'custom_package')
  ) INTO result FROM public.travel_products;

  RETURN result || jsonb_build_object(
    'versions', (SELECT count(*) FROM public.travel_product_versions),
    'published_versions', (SELECT count(*) FROM public.travel_product_versions WHERE status = 'published')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_travel_product(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_travel_product_status(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_product_version(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_publish_product_version(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.travel_product_stats() FROM anon;
