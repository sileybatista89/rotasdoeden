DO $$
DECLARE _policy uuid; _version uuid;
BEGIN
  SELECT id INTO _policy FROM public.pricing_policies ORDER BY created_at LIMIT 1;
  IF _policy IS NULL THEN
    INSERT INTO public.pricing_policies (name, description, base_currency, status, notes)
    VALUES ('Política comercial Rotas do Éden', 'Margem bruta sobre preço final de venda. Definida pela direção da Rotas do Éden.', 'EUR', 'active', 'Margem mínima 15%, margem alvo/máxima 20%. Proteção de voo 100 EUR aplicada apenas quando existe voo no cálculo.')
    RETURNING id INTO _policy;
  ELSE
    UPDATE public.pricing_policies SET status = 'active' WHERE id = _policy;
  END IF;

  SELECT id INTO _version FROM public.pricing_policy_versions WHERE status = 'active' LIMIT 1;
  IF _version IS NULL THEN
    SELECT id INTO _version FROM public.pricing_policy_versions WHERE policy_id = _policy AND status = 'draft' ORDER BY version_number DESC LIMIT 1;
    IF _version IS NULL THEN
      INSERT INTO public.pricing_policy_versions (
        policy_id, version_number, status, base_currency, margin_mode,
        min_margin_pct, target_margin_pct, flight_protection, rounding_mode, change_reason, activated_at
      ) VALUES (
        _policy,
        COALESCE((SELECT MAX(version_number) + 1 FROM public.pricing_policy_versions WHERE policy_id = _policy), 1),
        'active', 'EUR', 'target_margin', 15, 20,
        '{"method":"fixed_amount","value":100}'::jsonb,
        'none', 'Política comercial definida pela direção: margem mínima 15%, alvo/máxima 20%, proteção de voo 100 EUR.', now()
      ) RETURNING id INTO _version;
    ELSE
      UPDATE public.pricing_policy_versions
      SET margin_mode = 'target_margin', min_margin_pct = 15, target_margin_pct = 20,
          flight_protection = '{"method":"fixed_amount","value":100}'::jsonb,
          base_currency = 'EUR', rounding_mode = 'none',
          change_reason = 'Política comercial definida pela direção: margem mínima 15%, alvo/máxima 20%, proteção de voo 100 EUR.'
      WHERE id = _version;
      UPDATE public.pricing_policy_versions SET status = 'active', activated_at = now() WHERE id = _version;
    END IF;
  END IF;

  UPDATE public.pricing_policies SET current_version_id = _version, status = 'active' WHERE id = _policy;
END $$;