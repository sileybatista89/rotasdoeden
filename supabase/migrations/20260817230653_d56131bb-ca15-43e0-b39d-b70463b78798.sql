CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('identity','tourism_license','local_credential','business_registration','responsible_identity','other')),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 120),
  note text NOT NULL CHECK (char_length(note) BETWEEN 2 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','cancelled')),
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.document_requests TO authenticated;
GRANT ALL ON public.document_requests TO service_role;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_requests_owner_read" ON public.document_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "document_requests_owner_fulfill" ON public.document_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'open') WITH CHECK (user_id = auth.uid() AND status = 'fulfilled' AND document_url IS NOT NULL);
CREATE POLICY "document_requests_admin_insert" ON public.document_requests FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND requested_by = auth.uid());
CREATE POLICY "document_requests_admin_update" ON public.document_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER document_requests_updated BEFORE UPDATE ON public.document_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  assigned_admin_id uuid,
  verification_request_id uuid REFERENCES public.verification_requests(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_user','waiting_support','resolved')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_conversations_participants_read" ON public.support_conversations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "support_conversations_admin_insert" ON public.support_conversations FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "support_conversations_admin_update" ON public.support_conversations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "support_conversations_owner_update" ON public.support_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND created_by = created_by AND verification_request_id IS NOT DISTINCT FROM verification_request_id);
CREATE TRIGGER support_conversations_updated BEFORE UPDATE ON public.support_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_messages_participants_read" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "support_messages_participants_insert" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND NOT public.is_banned(auth.uid()) AND EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.is_admin(auth.uid())) AND c.status <> 'resolved'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('booking','message','verification','document_request','support','warning','account')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1000),
  link text,
  entity_type text,
  entity_id uuid,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_owner_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_owner_mark_read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _type text, _title text, _body text, _link text DEFAULT NULL, _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL, _dedupe_key text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to create notifications';
  END IF;
  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,_type,_title,_body,_link,_entity_type,_entity_id,_dedupe_key)
  ON CONFLICT (dedupe_key) DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.request_verification_documents(_verification_request_id uuid, _items jsonb, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _conversation_id uuid; _item jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may request documents'; END IF;
  IF jsonb_array_length(_items) = 0 OR char_length(trim(_message)) < 2 THEN RAISE EXCEPTION 'Document checklist and message are required'; END IF;
  SELECT user_id INTO _user_id FROM public.verification_requests WHERE id = _verification_request_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Verification request not found'; END IF;
  UPDATE public.verification_requests SET reviewer_notes = _message WHERE id = _verification_request_id;
  UPDATE public.professional_profiles SET admin_notes = _message WHERE user_id = _user_id;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.document_requests(verification_request_id,user_id,requested_by,document_type,label,note)
    VALUES(_verification_request_id,_user_id,auth.uid(),_item->>'type',_item->>'label',_message);
  END LOOP;
  INSERT INTO public.support_conversations(user_id,created_by,assigned_admin_id,verification_request_id,subject,status)
  VALUES(_user_id,auth.uid(),auth.uid(),_verification_request_id,'Documentos para verificação','waiting_user')
  RETURNING id INTO _conversation_id;
  INSERT INTO public.support_messages(conversation_id,sender_id,content) VALUES(_conversation_id,auth.uid(),_message);
  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'document_request','Documentos em falta',_message,'/verificacao','verification_request',_verification_request_id,'document-request:'||_verification_request_id::text||':'||extract(epoch from now())::bigint::text);
  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'pedir_documentos','verification_requests',_verification_request_id,jsonb_build_object('user_id',_user_id,'items',_items,'message',_message));
  RETURN _conversation_id;
END; $$;
REVOKE ALL ON FUNCTION public.request_verification_documents(uuid,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_verification_documents(uuid,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_professional_verification(_verification_request_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _ptype public.professional_type; _missing boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may approve verification'; END IF;
  SELECT vr.user_id, COALESCE(vr.professional_type, pp.professional_type) INTO _user_id,_ptype
  FROM public.verification_requests vr LEFT JOIN public.professional_profiles pp ON pp.user_id=vr.user_id
  WHERE vr.id=_verification_request_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Verification request not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.document_requests WHERE verification_request_id=_verification_request_id AND status='open') INTO _missing;
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
END; $$;
REVOKE ALL ON FUNCTION public.approve_professional_verification(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_professional_verification(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _recipient uuid; _is_admin boolean;
BEGIN
  _is_admin := public.is_admin(NEW.sender_id);
  SELECT CASE WHEN _is_admin THEN user_id ELSE COALESCE(assigned_admin_id,created_by) END INTO _recipient FROM public.support_conversations WHERE id=NEW.conversation_id;
  UPDATE public.support_conversations SET last_message_at=NEW.created_at,status=CASE WHEN _is_admin THEN 'waiting_user' ELSE 'waiting_support' END WHERE id=NEW.conversation_id;
  IF _recipient IS NOT NULL AND _recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
    VALUES(_recipient,'support','Nova mensagem do suporte',left(NEW.content,300),'/suporte/'||NEW.conversation_id::text,'support_conversation',NEW.conversation_id,'support-message:'||NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER support_messages_after_insert AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.handle_support_message();

CREATE OR REPLACE FUNCTION public.notify_booking_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='confirmed' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
    VALUES(NEW.guide_id,'booking','Nova reserva confirmada',NEW.service_title,'/my-bookings','booking',NEW.id,'booking-confirmed-guide:'||NEW.id::text)
    ON CONFLICT (dedupe_key) DO NOTHING;
    INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
    VALUES(NEW.tourist_id,'booking','Reserva confirmada',NEW.service_title,'/my-bookings','booking',NEW.id,'booking-confirmed-tourist:'||NEW.id::text)
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bookings_notify_confirmed AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_confirmed();