CREATE OR REPLACE FUNCTION public.admin_set_content_status(_content_id uuid, _status text, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _prev text; _version uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _status NOT IN ('draft','in_review','approved','rejected','archived') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF _status IN ('rejected','archived') AND (_note IS NULL OR btrim(_note) = '') THEN RAISE EXCEPTION 'note_required'; END IF;
  SELECT status, current_version_id INTO _prev, _version FROM public.content_items WHERE id = _content_id;
  IF _prev IS NULL THEN RAISE EXCEPTION 'content_not_found'; END IF;
  UPDATE public.content_items SET status = _status, updated_at = now() WHERE id = _content_id;
  INSERT INTO public.content_reviews (content_id, version_id, reviewer_id, decision, previous_status, note)
  VALUES (_content_id, _version, auth.uid(), CASE WHEN _status = 'draft' THEN 'restored' ELSE _status END, _prev, _note);
  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'content_status_change', 'content_item', _content_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));
  RETURN jsonb_build_object('ok', true, 'content_id', _content_id, 'status', _status, 'previous_status', _prev);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_content_version(_content_id uuid, _version_id uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _src public.content_versions%ROWTYPE; _next integer; _new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO _src FROM public.content_versions WHERE id = _version_id AND content_id = _content_id;
  IF _src.id IS NULL THEN RAISE EXCEPTION 'version_not_found'; END IF;
  SELECT coalesce(max(version_number), 0) + 1 INTO _next FROM public.content_versions WHERE content_id = _content_id;
  INSERT INTO public.content_versions (
    content_id, version_number, title, meta_description, slug, outline, blocks, seo,
    language, word_count, author_type, author_id, agent_type, change_reason, quality_result
  ) VALUES (
    _content_id, _next, _src.title, _src.meta_description, _src.slug, _src.outline, _src.blocks, _src.seo,
    _src.language, _src.word_count, 'human', auth.uid(), _src.agent_type,
    coalesce(_note, 'Reposição da versão ' || _src.version_number), _src.quality_result
  ) RETURNING id INTO _new_id;
  UPDATE public.content_items
     SET current_version_id = _new_id, title = _src.title,
         status = CASE WHEN status = 'published' THEN status ELSE 'draft' END, updated_at = now()
   WHERE id = _content_id;
  INSERT INTO public.content_reviews (content_id, version_id, reviewer_id, decision, note)
  VALUES (_content_id, _new_id, auth.uid(), 'restored', coalesce(_note, 'Reposição da versão ' || _src.version_number));
  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'content_version_restore', 'content_item', _content_id,
          jsonb_build_object('restored_from', _src.version_number, 'new_version', _next));
  RETURN jsonb_build_object('ok', true, 'version_id', _new_id, 'version_number', _next);
END;
$function$;