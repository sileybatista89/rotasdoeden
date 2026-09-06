CREATE OR REPLACE FUNCTION public.content_cache_get(_key text)
RETURNS TABLE (payload jsonb, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.payload, c.created_at
  FROM public.content_cache c
  WHERE c.cache_key = _key AND c.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.content_cache_get(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.content_cache_put(_key text, _payload jsonb, _ttl_hours integer DEFAULT 24)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.content_cache (cache_key, payload, expires_at)
  VALUES (_key, _payload, now() + make_interval(hours => greatest(1, coalesce(_ttl_hours, 24))))
  ON CONFLICT (cache_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        expires_at = EXCLUDED.expires_at,
        created_at = now();
$$;

REVOKE ALL ON FUNCTION public.content_cache_put(text, jsonb, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.content_save_draft(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _content_id uuid;
  _version_id uuid;
  _next integer;
  _slug text;
  _base_slug text;
  _lang text := coalesce(nullif(_payload->>'language',''), 'pt');
  _type text := _payload->>'content_type';
  _opp uuid := nullif(_payload->>'discovery_opportunity_id','')::uuid;
  _market text := nullif(_payload->>'market','');
  _source jsonb;
  _created boolean := false;
  _i integer := 1;
BEGIN
  IF _type IS NULL THEN
    RAISE EXCEPTION 'content_type_required';
  END IF;

  SELECT id INTO _content_id
  FROM public.content_items
  WHERE content_type = _type
    AND lower(language) = lower(_lang)
    AND coalesce(discovery_opportunity_id::text,'') = coalesce(_opp::text,'')
    AND coalesce(lower(market),'') = coalesce(lower(_market),'')
  LIMIT 1;

  _base_slug := coalesce(nullif(_payload->>'slug',''), 'conteudo');
  _slug := _base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.content_items
    WHERE slug = _slug AND lower(language) = lower(_lang)
      AND (_content_id IS NULL OR id <> _content_id)
  ) LOOP
    _i := _i + 1;
    _slug := _base_slug || '-' || _i;
  END LOOP;

  IF _content_id IS NULL THEN
    INSERT INTO public.content_items (
      content_type, discovery_opportunity_id, country, language, market, intent, season, audience,
      title, slug, status, generated_by, quality_passed, quality_issues, task_id, run_id
    ) VALUES (
      _type, _opp, nullif(_payload->>'country',''), _lang, _market,
      nullif(_payload->>'intent',''), nullif(_payload->>'season',''), nullif(_payload->>'audience',''),
      _payload->>'title', _slug, 'draft', 'ai_content',
      coalesce((_payload->>'quality_passed')::boolean, false),
      coalesce(_payload->'quality_result'->'issues', '[]'::jsonb),
      nullif(_payload->>'task_id','')::uuid, nullif(_payload->>'run_id','')::uuid
    ) RETURNING id INTO _content_id;
    _created := true;
  END IF;

  SELECT coalesce(max(version_number), 0) + 1 INTO _next
  FROM public.content_versions WHERE content_id = _content_id;

  INSERT INTO public.content_versions (
    content_id, version_number, title, meta_description, slug, outline, blocks, seo,
    language, word_count, author_type, agent_type, change_reason, quality_result, task_id, run_id
  ) VALUES (
    _content_id, _next, _payload->>'title', _payload->>'meta_description', _slug,
    coalesce(_payload->'outline', '[]'::jsonb), coalesce(_payload->'blocks', '[]'::jsonb),
    coalesce(_payload->'seo', '{}'::jsonb), _lang,
    coalesce((_payload->>'word_count')::integer, 0), 'agent', 'content',
    CASE WHEN _created THEN 'Rascunho inicial gerado pelo Content Agent'
         ELSE 'Nova versão gerada pelo Content Agent' END,
    coalesce(_payload->'quality_result', '{}'::jsonb),
    nullif(_payload->>'task_id','')::uuid, nullif(_payload->>'run_id','')::uuid
  ) RETURNING id INTO _version_id;

  FOR _source IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'sources', '[]'::jsonb)) LOOP
    INSERT INTO public.content_sources (
      content_id, version_id, source_scope, source_table, source_record_id, url, title, excerpt,
      evidence_type, consulted_at
    ) VALUES (
      _content_id, _version_id,
      coalesce(nullif(_source->>'scope',''), 'internal'),
      nullif(_source->>'source_table',''),
      nullif(_source->>'source_record_id','')::uuid,
      nullif(_source->>'url',''),
      nullif(_source->>'title',''),
      nullif(_source->>'excerpt',''),
      coalesce(nullif(_source->>'evidence_type',''), 'observed'),
      coalesce(nullif(_source->>'consulted_at','')::timestamptz, now())
    );
  END LOOP;

  UPDATE public.content_items
     SET current_version_id = _version_id,
         title = _payload->>'title',
         slug = _slug,
         quality_passed = coalesce((_payload->>'quality_passed')::boolean, false),
         quality_issues = coalesce(_payload->'quality_result'->'issues', '[]'::jsonb),
         status = CASE WHEN status IN ('approved','published') THEN 'in_review' ELSE 'draft' END,
         updated_at = now()
   WHERE id = _content_id;

  RETURN jsonb_build_object(
    'content_id', _content_id,
    'version_id', _version_id,
    'version_number', _next,
    'created', _created,
    'slug', _slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.content_save_draft(jsonb) FROM PUBLIC, anon, authenticated;
