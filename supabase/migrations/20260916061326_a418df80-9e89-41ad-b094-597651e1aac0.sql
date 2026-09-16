DO $$
DECLARE _policy uuid; _old uuid; _new uuid; _rules jsonb;
BEGIN
  SELECT id, policy_id INTO _old, _policy FROM public.pricing_policy_versions WHERE status = 'active' LIMIT 1;
  IF _old IS NULL THEN RAISE EXCEPTION 'Sem versão ativa'; END IF;

  _rules := jsonb_build_object(
    'accommodation', jsonb_build_object('mode','target_margin','value',20),
    'room',          jsonb_build_object('mode','target_margin','value',20),
    'transport',     jsonb_build_object('mode','target_margin','value',20),
    'transfer',      jsonb_build_object('mode','target_margin','value',20),
    'experience',    jsonb_build_object('mode','target_margin','value',20),
    'guide',         jsonb_build_object('mode','target_margin','value',20),
    'meal',          jsonb_build_object('mode','target_margin','value',20),
    'insurance',     jsonb_build_object('mode','target_margin','value',20),
    'flight',        jsonb_build_object('mode','target_margin','value',20),
    'other',         jsonb_build_object('mode','target_margin','value',20)
  );

  UPDATE public.pricing_policy_versions SET status = 'archived' WHERE id = _old;

  INSERT INTO public.pricing_policy_versions (
    policy_id, version_number, status, base_currency, margin_mode,
    min_margin_pct, target_margin_pct, component_rules, flight_protection,
    rounding_mode, change_reason, activated_at
  ) VALUES (
    _policy,
    COALESCE((SELECT MAX(version_number) + 1 FROM public.pricing_policy_versions WHERE policy_id = _policy), 1),
    'active', 'EUR', 'target_margin', 15, 20, _rules,
    '{"method":"fixed_amount","value":100}'::jsonb,
    'none', 'Margem bruta alvo de 20% aplicada a todas as categorias; margem mínima 15%.', now()
  ) RETURNING id INTO _new;

  UPDATE public.pricing_policies SET current_version_id = _new WHERE id = _policy;
END $$;