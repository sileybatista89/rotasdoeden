ALTER TABLE public.document_requests
  DROP CONSTRAINT IF EXISTS document_requests_document_type_check;

ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'identity','tourism_license','local_credential','business_registration','responsible_identity','other',
    'identificacao','licenca_profissional','certificacao','seguro','outro'
  ]));