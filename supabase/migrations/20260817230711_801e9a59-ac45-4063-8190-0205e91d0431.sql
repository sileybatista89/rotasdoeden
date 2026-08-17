DROP POLICY IF EXISTS "document_requests_owner_fulfill" ON public.document_requests;
DROP POLICY IF EXISTS "support_conversations_owner_update" ON public.support_conversations;

CREATE OR REPLACE FUNCTION public.fulfill_document_request(_request_id uuid, _document_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _verification_request_id uuid; _conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(_document_url)) < 3 THEN RAISE EXCEPTION 'Valid document is required'; END IF;
  UPDATE public.document_requests
  SET document_url=_document_url,status='fulfilled',fulfilled_at=now(),updated_at=now()
  WHERE id=_request_id AND user_id=auth.uid() AND status='open'
  RETURNING verification_request_id INTO _verification_request_id;
  IF _verification_request_id IS NULL THEN RAISE EXCEPTION 'Open document request not found'; END IF;
  SELECT id INTO _conversation_id FROM public.support_conversations
  WHERE verification_request_id=_verification_request_id AND user_id=auth.uid()
  ORDER BY created_at DESC LIMIT 1;
  IF _conversation_id IS NOT NULL THEN
    INSERT INTO public.support_messages(conversation_id,sender_id,content)
    VALUES(_conversation_id,auth.uid(),'Documento solicitado reenviado para análise.');
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.fulfill_document_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_document_request(uuid,text) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_support_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_booking_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.filter_message_content() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_booking_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_professional_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;