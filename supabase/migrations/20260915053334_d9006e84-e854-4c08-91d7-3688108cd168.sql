CREATE OR REPLACE FUNCTION public.admin_save_rate(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid := nullif(_payload->>'id','')::uuid;
  _component uuid := nullif(_payload->>'component_id','')::uuid;
  _price numeric := nullif(_payload->>'price','')::numeric;
  _currency text := upper(nullif(btrim(coalesce(_payload->>'currency','')),''));
  _unit text := nullif(_payload->>'unit','');
  _source text := nullif(_payload->>'source_type','');
  _observed timestamptz := nullif(_payload->>'observed_at','')::timestamptz;
  _kind text := nullif(_payload->>'rate_kind','');
  _obs_total numeric := nullif(_payload->>'total_observed_amount','')::numeric;
  _obs_nights integer := nullif(_payload->>'observed_nights','')::integer;
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
  IF (_obs_total IS NULL) <> (_obs_nights IS NULL) THEN RAISE EXCEPTION 'observation_incomplete'; END IF;
  IF _obs_total IS NOT NULL AND (_obs_total <= 0 OR _obs_nights < 1) THEN RAISE EXCEPTION 'observation_invalid'; END IF;

  IF _id IS NULL THEN
    INSERT INTO public.component_rates (
      component_id, supplier_id, rate_kind, price, currency, unit, quantity,
      occupancy_adults, occupancy_children, occupancy_total, meal_plan,
      cancellation_type, cancellation_summary, source_type, source_reference,
      source_document_url, observed_at, valid_from, valid_until, validity_unknown,
      status, notes, total_observed_amount, observed_nights, created_by
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
      _obs_total, _obs_nights,
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
    notes = nullif(btrim(coalesce(_payload->>'notes','')),''),
    total_observed_amount = _obs_total,
    observed_nights = _obs_nights
  WHERE id = _id;

  IF NOT FOUND THEN RAISE EXCEPTION 'rate_not_found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'rate_updated', 'component_rate', _id, _payload);
  RETURN jsonb_build_object('ok', true, 'rate_id', _id, 'created', false);
END;
$function$;