CREATE OR REPLACE FUNCTION public.admin_review_document(_request_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _label text; _conv uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may review documents'; END IF;
  IF NOT _approve AND char_length(trim(coalesce(_reason,''))) < 2 THEN
    RAISE EXCEPTION 'A reason is required when rejecting a document';
  END IF;

  UPDATE public.document_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'open' END,
         document_url = CASE WHEN _approve THEN document_url ELSE NULL END,
         fulfilled_at = CASE WHEN _approve THEN fulfilled_at ELSE NULL END,
         rejection_reason = CASE WHEN _approve THEN NULL ELSE _reason END,
         reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   WHERE id = _request_id
   RETURNING user_id, label INTO _user_id, _label;

  IF _user_id IS NULL THEN RAISE EXCEPTION 'Document request not found'; END IF;

  SELECT id INTO _conv FROM public.support_conversations
   WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
  IF _conv IS NOT NULL THEN
    INSERT INTO public.support_messages(conversation_id,sender_id,content)
    VALUES(_conv,auth.uid(), CASE WHEN _approve
      THEN 'Documento aprovado: '||_label
      ELSE 'Documento recusado: '||_label||E'\nMotivo: '||_reason END);
  END IF;

  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'document_request',
    CASE WHEN _approve THEN 'Documento aprovado' ELSE 'Documento recusado' END,
    CASE WHEN _approve THEN _label ELSE _label||' — '||_reason END,
    '/verificacao','document_request',_request_id,
    'doc-review:'||_request_id::text||':'||extract(epoch from now())::bigint::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),CASE WHEN _approve THEN 'aprovar_documento' ELSE 'recusar_documento' END,
    'document_requests',_request_id,jsonb_build_object('user_id',_user_id,'reason',_reason));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_review_document(uuid, boolean, text) FROM anon;