-- 1. Document status lifecycle
ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('open','fulfilled','in_review','approved','rejected','expired'));

-- 2. Reject stores 'rejected' and keeps the reason
CREATE OR REPLACE FUNCTION public.admin_review_document(_request_id uuid, _approve boolean, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _user_id uuid; _label text; _conv uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may review documents'; END IF;
  IF NOT _approve AND char_length(trim(coalesce(_reason,''))) < 2 THEN
    RAISE EXCEPTION 'A reason is required when rejecting a document';
  END IF;

  UPDATE public.document_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
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
END; $function$;

-- 3. Admin can mark a document as "in review" (or expired)
CREATE OR REPLACE FUNCTION public.admin_set_document_status(_request_id uuid, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _user_id uuid; _label text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may change document status'; END IF;
  IF _status NOT IN ('open','in_review','expired') THEN
    RAISE EXCEPTION 'Use admin_review_document to approve or reject';
  END IF;

  UPDATE public.document_requests
     SET status = _status, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   WHERE id = _request_id
   RETURNING user_id, label INTO _user_id, _label;

  IF _user_id IS NULL THEN RAISE EXCEPTION 'Document request not found'; END IF;

  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'document_request','Estado do documento actualizado',
    _label||' — '||_status,'/verificacao','document_request',_request_id,
    'doc-status:'||_request_id::text||':'||extract(epoch from now())::bigint::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'alterar_estado_documento','document_requests',_request_id,
    jsonb_build_object('user_id',_user_id,'status',_status));
END; $function$;

-- 4. Guides may resubmit rejected documents
CREATE OR REPLACE FUNCTION public.fulfill_document_request(_request_id uuid, _document_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _verification_request_id uuid; _conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(_document_url)) < 3 THEN RAISE EXCEPTION 'Valid document is required'; END IF;
  UPDATE public.document_requests
     SET document_url=_document_url, status='fulfilled', fulfilled_at=now(),
         rejection_reason=NULL, updated_at=now()
   WHERE id=_request_id AND user_id=auth.uid() AND status IN ('open','rejected','expired')
  RETURNING verification_request_id INTO _verification_request_id;
  IF _verification_request_id IS NULL THEN RAISE EXCEPTION 'Open document request not found'; END IF;
  SELECT id INTO _conversation_id FROM public.support_conversations
   WHERE verification_request_id=_verification_request_id AND user_id=auth.uid()
   ORDER BY created_at DESC LIMIT 1;
  IF _conversation_id IS NOT NULL THEN
    INSERT INTO public.support_messages(conversation_id,sender_id,content)
    VALUES(_conversation_id,auth.uid(),'Documento solicitado reenviado para análise.');
  END IF;
END; $function$;

-- 5. Approval must not be blocked by rejected/expired documents either
CREATE OR REPLACE FUNCTION public.approve_professional_verification(_verification_request_id uuid, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _user_id uuid; _ptype public.professional_type; _missing boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may approve verification'; END IF;
  SELECT vr.user_id, COALESCE(vr.professional_type, pp.professional_type) INTO _user_id,_ptype
  FROM public.verification_requests vr LEFT JOIN public.professional_profiles pp ON pp.user_id=vr.user_id
  WHERE vr.id=_verification_request_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Verification request not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.document_requests
     WHERE verification_request_id=_verification_request_id
       AND status IN ('open','rejected','expired')) INTO _missing;
  IF _missing THEN RAISE EXCEPTION 'There are documents still missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.verification_requests WHERE id=_verification_request_id AND id_document_url IS NOT NULL) THEN RAISE EXCEPTION 'Identity document is required'; END IF;
  IF _ptype='guia_credenciado' AND NOT EXISTS(SELECT 1 FROM public.verification_requests WHERE id=_verification_request_id AND credential_url IS NOT NULL) THEN RAISE EXCEPTION 'Tourism license is required'; END IF;
  IF _ptype IN ('operador_turistico','empresa_agencia') AND NOT EXISTS(SELECT 1 FROM public.verification_requests WHERE id=_verification_request_id AND credential_url IS NOT NULL) THEN RAISE EXCEPTION 'Business credential is required'; END IF;
  UPDATE public.verification_requests SET status='verified',reviewer_notes=_note,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_verification_request_id;
  UPDATE public.professional_profiles SET verification_status='verified',verified_at=now(),verification_expires_at=now()+interval '1 year',admin_notes=_note WHERE user_id=_user_id;
  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'verification','Perfil verificado','O teu perfil profissional foi verificado.','/perfil-profissional','verification_request',_verification_request_id,'verification-approved:'||_verification_request_id::text);
  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'verificar_perfil','professional_profiles',_verification_request_id,jsonb_build_object('user_id',_user_id,'note',_note));
END; $function$;

-- 6. Fix broken support notification link (/suporte -> /support)
CREATE OR REPLACE FUNCTION public.handle_support_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _recipient uuid; _is_admin boolean;
BEGIN
  _is_admin := public.is_admin(NEW.sender_id);
  SELECT CASE WHEN _is_admin THEN user_id ELSE COALESCE(assigned_admin_id,created_by) END INTO _recipient FROM public.support_conversations WHERE id=NEW.conversation_id;
  UPDATE public.support_conversations SET last_message_at=NEW.created_at,status=CASE WHEN _is_admin THEN 'waiting_user' ELSE 'waiting_support' END WHERE id=NEW.conversation_id;
  IF _recipient IS NOT NULL AND _recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
    VALUES(_recipient,'support','Nova mensagem do suporte',left(NEW.content,300),'/support/'||NEW.conversation_id::text,'support_conversation',NEW.conversation_id,'support-message:'||NEW.id::text);
  END IF;
  RETURN NEW;
END; $function$;

UPDATE public.notifications SET link = '/support/' || substring(link from 10)
 WHERE link LIKE '/suporte/%';