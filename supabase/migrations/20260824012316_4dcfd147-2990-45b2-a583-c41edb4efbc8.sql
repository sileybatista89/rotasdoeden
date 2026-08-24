-- 1. Guide lifecycle status
DO $$ BEGIN
  CREATE TYPE public.guide_status AS ENUM (
    'candidatura_recebida','em_analise','documentacao_pendente','verificacao_em_curso',
    'aprovado','rejeitado','suspenso','banido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS status public.guide_status NOT NULL DEFAULT 'candidatura_recebida',
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS applied_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- protect status from non-admins
CREATE OR REPLACE FUNCTION public.protect_professional_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.verification_status := OLD.verification_status;
    NEW.verified_at := OLD.verified_at;
    NEW.verification_expires_at := OLD.verification_expires_at;
    NEW.admin_notes := OLD.admin_notes;
    NEW.suspended := OLD.suspended;
    NEW.status := OLD.status;
    NEW.status_changed_at := OLD.status_changed_at;
    NEW.applied_at := OLD.applied_at;
    NEW.approved_at := OLD.approved_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- 2. Service moderation
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

DROP POLICY IF EXISTS "Public views active services" ON public.services;
CREATE POLICY "Public views approved services" ON public.services
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND moderation_status = 'approved');

CREATE OR REPLACE FUNCTION public.guard_service_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.moderation_status := 'pending';
      NEW.moderation_notes := NULL;
      NEW.moderated_at := NULL;
    ELSE
      -- any guide edit sends the service back to review
      IF (NEW.title, NEW.description, NEW.images, NEW.price_per_person, NEW.category)
         IS DISTINCT FROM (OLD.title, OLD.description, OLD.images, OLD.price_per_person, OLD.category) THEN
        NEW.moderation_status := 'pending';
        NEW.moderated_at := NULL;
      ELSE
        NEW.moderation_status := OLD.moderation_status;
        NEW.moderated_at := OLD.moderated_at;
      END IF;
      NEW.moderation_notes := OLD.moderation_notes;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS services_guard_moderation ON public.services;
CREATE TRIGGER services_guard_moderation BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.guard_service_moderation();

-- 3. Document request review cycle
ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 4. Admin: set guide status
CREATE OR REPLACE FUNCTION public.admin_set_guide_status(_user_id uuid, _status public.guide_status, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may change guide status'; END IF;

  INSERT INTO public.professional_profiles (user_id, status)
  VALUES (_user_id, _status)
  ON CONFLICT (user_id) DO UPDATE
    SET status = EXCLUDED.status, status_changed_at = now();

  UPDATE public.professional_profiles
     SET status = _status,
         status_changed_at = now(),
         admin_notes = COALESCE(_note, admin_notes),
         approved_at = CASE WHEN _status = 'aprovado' THEN now() ELSE approved_at END,
         suspended = (_status IN ('suspenso','banido')),
         verification_status = CASE
           WHEN _status = 'aprovado' THEN 'verified'::verification_status
           WHEN _status = 'rejeitado' THEN 'rejected'::verification_status
           WHEN _status IN ('em_analise','documentacao_pendente','verificacao_em_curso') THEN 'pending'::verification_status
           ELSE verification_status END,
         verified_at = CASE WHEN _status = 'aprovado' THEN now() ELSE verified_at END,
         verification_expires_at = CASE WHEN _status = 'aprovado' THEN now() + interval '1 year' ELSE verification_expires_at END
   WHERE user_id = _user_id;

  IF _status = 'banido' THEN
    UPDATE public.profiles SET banned = true WHERE id = _user_id;
  END IF;

  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_user_id,'verification','Estado do teu perfil atualizado',
    COALESCE(_note, 'O estado da tua candidatura passou a: ' || _status::text),
    '/perfil-profissional','professional_profiles',_user_id,
    'guide-status:'||_user_id::text||':'||extract(epoch from now())::bigint::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'alterar_estado_guia','professional_profiles',_user_id,
    jsonb_build_object('status',_status,'note',_note));
END; $$;

-- 5. Admin: request a document from any guide (creates verification request if missing)
CREATE OR REPLACE FUNCTION public.admin_request_document(
  _user_id uuid, _document_type text, _label text, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vr uuid; _conv uuid;
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
  VALUES(_vr,_user_id,auth.uid(),_document_type,_label,_message);

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
  VALUES(_user_id,'document_request','Documento solicitado',_label||' — '||_message,'/verificacao',
    'verification_request',_vr,'doc-req:'||_vr::text||':'||extract(epoch from now())::bigint::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),'pedir_documento','verification_requests',_vr,
    jsonb_build_object('user_id',_user_id,'document_type',_document_type,'label',_label));

  RETURN _conv;
END; $$;

-- 6. Admin: approve / reject one document
CREATE OR REPLACE FUNCTION public.admin_review_document(_request_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid; _label text; _conv uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may review documents'; END IF;
  IF NOT _approve AND char_length(trim(coalesce(_reason,''))) < 2 THEN
    RAISE EXCEPTION 'A reason is required when rejecting a document';
  END IF;

  UPDATE public.document_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         rejection_reason = CASE WHEN _approve THEN NULL ELSE _reason END,
         status_reopen_marker = NULL,
         reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   WHERE id = _request_id
   RETURNING user_id, label INTO _user_id, _label;

  IF _user_id IS NULL THEN RAISE EXCEPTION 'Document request not found'; END IF;

  IF NOT _approve THEN
    UPDATE public.document_requests SET status = 'open', document_url = NULL, fulfilled_at = NULL
     WHERE id = _request_id;
  END IF;

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

-- 7. Admin: message a guide
CREATE OR REPLACE FUNCTION public.admin_message_guide(_user_id uuid, _subject text, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _conv uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may message guides'; END IF;
  IF char_length(trim(coalesce(_message,''))) < 2 THEN RAISE EXCEPTION 'Message is required'; END IF;

  SELECT id INTO _conv FROM public.support_conversations
   WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
  IF _conv IS NULL THEN
    INSERT INTO public.support_conversations(user_id,created_by,assigned_admin_id,subject,status)
    VALUES(_user_id,auth.uid(),auth.uid(),COALESCE(NULLIF(trim(_subject),''),'Mensagem da equipa'),'waiting_user')
    RETURNING id INTO _conv;
  END IF;

  INSERT INTO public.support_messages(conversation_id,sender_id,content)
  VALUES(_conv,auth.uid(),_message);

  RETURN _conv;
END; $$;

-- 8. Admin: moderate a service
CREATE OR REPLACE FUNCTION public.admin_moderate_service(_service_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _guide uuid; _title text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins may moderate services'; END IF;
  IF NOT _approve AND char_length(trim(coalesce(_note,''))) < 2 THEN
    RAISE EXCEPTION 'A note is required when rejecting a service';
  END IF;

  UPDATE public.services
     SET moderation_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         moderation_notes = _note, moderated_at = now()
   WHERE id = _service_id
   RETURNING guide_id, title INTO _guide, _title;

  IF _guide IS NULL THEN RAISE EXCEPTION 'Service not found'; END IF;

  INSERT INTO public.notifications(user_id,type,title,body,link,entity_type,entity_id,dedupe_key)
  VALUES(_guide,'service',
    CASE WHEN _approve THEN 'Serviço aprovado' ELSE 'Serviço precisa de alterações' END,
    COALESCE(_note,_title),'/my-services','service',_service_id,
    'svc-mod:'||_service_id::text||':'||extract(epoch from now())::bigint::text);

  INSERT INTO public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  VALUES(auth.uid(),CASE WHEN _approve THEN 'aprovar_servico' ELSE 'recusar_servico' END,
    'services',_service_id,jsonb_build_object('guide_id',_guide,'note',_note));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_set_guide_status(uuid, public.guide_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_request_document(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_document(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_message_guide(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_moderate_service(uuid, boolean, text) FROM anon;