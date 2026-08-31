CREATE OR REPLACE FUNCTION public.admin_request_document(_user_id uuid, _document_type text, _label text, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vr uuid; _conv uuid; _doc uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may request documents'; END IF;
  IF char_length(trim(coalesce(_message,''))) < 2 OR char_length(trim(coalesce(_label,''))) < 2 THEN
    RAISE EXCEPTION 'Document type and message are required';
  END IF;

  INSERT INTO public.professional_profiles (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO _vr FROM public.verification_requests
   WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;

  IF _vr IS NULL THEN
    INSERT INTO public.verification_requests(user_id, status)
    VALUES (_user_id, 'pending') RETURNING id INTO _vr;
  END IF;

  INSERT INTO public.document_requests(verification_request_id,user_id,requested_by,document_type,label,note)
  VALUES(_vr,_user_id,auth.uid(),_document_type,_label,_message)
  RETURNING id INTO _doc;

  SELECT id INTO _conv FROM public.support_conversations
   WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
  IF _conv IS NULL THEN
    INSERT INTO public.support_conversations(user_id,created_by,assigned_admin_id,verification_request_id,subject,status)
    VALUES(_user_id,auth.uid(),auth.uid(),_vr,'Documentos para verificação','waiting_user')
    RETURNING id INTO _conv;
  END IF;
  INSERT INTO public.support_messages(conversation_id,sender_id,content)
  VALUES(_conv,auth.uid(),_message);

  UPDATE public.professional_profiles
     SET status = 'documentacao_pendente', status_changed_at = now()
   WHERE user_id = _user_id AND status NOT IN ('banido','suspenso');

  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'document_request','Documento solicitado: '||_label,
    _message||' — clica para enviar o documento.',
    '/verificacao?doc='||_doc::text||'#doc-'||_doc::text,
    'document_request',_doc,'doc-req:'||_doc::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'pedir_documento','verification_requests',_vr,
    jsonb_build_object('user_id',_user_id,'document_type',_document_type,'label',_label));

  RETURN _conv;
END; $$;

CREATE OR REPLACE FUNCTION public.request_verification_documents(_verification_request_id uuid, _items jsonb, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _conversation_id uuid; _item jsonb; _doc uuid; _first_doc uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may request documents'; END IF;
  IF jsonb_array_length(_items) = 0 OR char_length(trim(_message)) < 2 THEN RAISE EXCEPTION 'Document checklist and message are required'; END IF;
  SELECT user_id INTO _user_id FROM public.verification_requests WHERE id = _verification_request_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Verification request not found'; END IF;
  UPDATE public.verification_requests SET reviewer_notes = _message WHERE id = _verification_request_id;
  UPDATE public.professional_profiles SET admin_notes = _message WHERE user_id = _user_id;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.document_requests(verification_request_id,user_id,requested_by,document_type,label,note)
    VALUES(_verification_request_id,_user_id,auth.uid(),_item->>'type',_item->>'label',_message)
    RETURNING id INTO _doc;
    IF _first_doc IS NULL THEN _first_doc := _doc; END IF;
  END LOOP;
  INSERT INTO public.support_conversations(user_id,created_by,assigned_admin_id,verification_request_id,subject,status)
  VALUES(_user_id,auth.uid(),auth.uid(),_verification_request_id,'Documentos para verificação','waiting_user')
  RETURNING id INTO _conversation_id;
  INSERT INTO public.support_messages(conversation_id,sender_id,content) VALUES(_conversation_id,auth.uid(),_message);
  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'document_request','Documentos solicitados',_message||' — clica para enviar os documentos.',
    '/verificacao?doc='||coalesce(_first_doc::text,''),'document_request',_first_doc,
    'document-request:'||_verification_request_id::text||':'||extract(epoch from now())::bigint::text);
  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'pedir_documentos','verification_requests',_verification_request_id,jsonb_build_object('user_id',_user_id,'items',_items,'message',_message));
  RETURN _conversation_id;
END; $$;