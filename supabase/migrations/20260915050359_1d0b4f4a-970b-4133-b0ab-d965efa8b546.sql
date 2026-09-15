CREATE OR REPLACE FUNCTION public.supply_readiness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  WITH rate_flags AS (
    SELECT
      r.id,
      r.component_id,
      (r.status = 'confirmed'
        AND r.rate_kind <> 'market_observed_price'
        AND r.validity_unknown = false
        AND r.source_type IS NOT NULL
        AND r.observed_at IS NOT NULL
        AND (r.valid_until IS NULL OR r.valid_until >= current_date)) AS eligible,
      (r.status = 'expired' OR (r.valid_until IS NOT NULL AND r.valid_until < current_date)) AS expired,
      (r.source_type IS NULL) AS no_source,
      r.validity_unknown
    FROM public.component_rates r
  ),
  comp AS (
    SELECT
      c.id,
      c.supplier_id IS NULL AS no_supplier,
      c.status <> 'approved' AS not_approved,
      COALESCE(cnt.total, 0) = 0 AS no_rate,
      COALESCE(cnt.eligible, 0) = 0 AS no_eligible_rate
    FROM public.package_components c
    LEFT JOIN (
      SELECT component_id, count(*) AS total, count(*) FILTER (WHERE eligible) AS eligible
      FROM rate_flags GROUP BY component_id
    ) cnt ON cnt.component_id = c.id
  )
  SELECT jsonb_build_object(
    'suppliers', jsonb_build_object(
      'total', (SELECT count(*) FROM public.suppliers),
      'approved', (SELECT count(*) FROM public.suppliers WHERE status = 'approved'),
      'inactive', (SELECT count(*) FROM public.suppliers WHERE status = 'inactive')
    ),
    'services', jsonb_build_object(
      'total', (SELECT count(*) FROM public.services),
      'approved_active', (SELECT count(*) FROM public.services WHERE is_active AND moderation_status = 'approved'),
      'without_commercial_link', (
        SELECT count(*) FROM public.services s
        WHERE NOT EXISTS (SELECT 1 FROM public.package_components pc WHERE pc.service_id = s.id)
      )
    ),
    'accommodations', jsonb_build_object(
      'total', (SELECT count(*) FROM public.accommodations),
      'rooms', (SELECT count(*) FROM public.accommodation_rooms)
    ),
    'components', jsonb_build_object(
      'total', (SELECT count(*) FROM comp),
      'ready', (SELECT count(*) FROM comp WHERE NOT no_supplier AND NOT not_approved AND NOT no_eligible_rate),
      'without_supplier', (SELECT count(*) FROM comp WHERE no_supplier),
      'not_approved', (SELECT count(*) FROM comp WHERE not_approved),
      'without_rate', (SELECT count(*) FROM comp WHERE no_rate),
      'without_eligible_rate', (SELECT count(*) FROM comp WHERE no_eligible_rate AND NOT no_rate)
    ),
    'rates', jsonb_build_object(
      'total', (SELECT count(*) FROM rate_flags),
      'eligible', (SELECT count(*) FROM rate_flags WHERE eligible),
      'expired', (SELECT count(*) FROM rate_flags WHERE expired),
      'without_source', (SELECT count(*) FROM rate_flags WHERE no_source),
      'unknown_validity', (SELECT count(*) FROM rate_flags WHERE validity_unknown)
    ),
    'catalog', jsonb_build_object(
      'total', (SELECT count(*) FROM public.experience_catalog_items WHERE is_active),
      'linked_component', (SELECT count(*) FROM public.experience_catalog_items WHERE is_active AND package_component_id IS NOT NULL),
      'linked_service', (SELECT count(*) FROM public.experience_catalog_items WHERE is_active AND service_id IS NOT NULL),
      'editorial_only', (SELECT count(*) FROM public.experience_catalog_items
                         WHERE is_active AND package_component_id IS NULL AND service_id IS NULL)
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'slug', p.slug,
        'name', p.name,
        'status', p.status,
        'has_version', p.current_version_id IS NOT NULL,
        'linked_components', COALESCE(jsonb_array_length(v.included_components), 0),
        'quote_ready', false
      ) ORDER BY p.sort_order, p.name), '[]'::jsonb)
      FROM public.travel_products p
      LEFT JOIN public.travel_product_versions v ON v.id = p.current_version_id
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.supply_readiness() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.supply_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.supply_readiness() TO service_role;