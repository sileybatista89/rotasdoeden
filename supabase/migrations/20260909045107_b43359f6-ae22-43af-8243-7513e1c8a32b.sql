
CREATE OR REPLACE FUNCTION public.admin_set_plan_status(_plan_id uuid, _status text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _prev text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _status NOT IN ('rascunho','em_revisao','rejeitado','arquivado') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF _status IN ('rejeitado','arquivado') AND (_note IS NULL OR btrim(_note) = '') THEN
    RAISE EXCEPTION 'note_required';
  END IF;

  SELECT status INTO _prev FROM public.acquisition_plans WHERE id = _plan_id;
  IF _prev IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  UPDATE public.acquisition_plans
     SET status = _status,
         review_note = coalesce(_note, review_note),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _plan_id;

  INSERT INTO public.acquisition_plan_history (plan_id, actor_id, actor_kind, action, previous_status, new_status, note)
  VALUES (_plan_id, auth.uid(), 'admin', 'status_change', _prev, _status, _note);

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'acquisition_plan_status_change', 'acquisition_plan', _plan_id,
          jsonb_build_object('from', _prev, 'to', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'plan_id', _plan_id, 'status', _status, 'previous_status', _prev);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_plan_status(uuid, text, text) FROM anon;
