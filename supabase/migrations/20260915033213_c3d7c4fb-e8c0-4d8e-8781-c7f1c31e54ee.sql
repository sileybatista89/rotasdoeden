-- ============ Fase 6 — Conversion Agent ============

CREATE TABLE public.conversion_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token_hash text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id uuid,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','encerrada','escalada')),
  intent text NOT NULL DEFAULT 'inspiracao'
    CHECK (intent IN ('inspiracao','duvida','interesse_pacote','pedido_orcamento','intencao_reserva')),
  language text NOT NULL DEFAULT 'pt',
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  estimated_cost numeric(10,4) NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conversion_conversations TO authenticated;
GRANT ALL ON public.conversion_conversations TO service_role;
ALTER TABLE public.conversion_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerem conversas do assistente"
  ON public.conversion_conversations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Utilizador ve as suas conversas"
  ON public.conversion_conversations FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE TRIGGER set_conversion_conversations_updated_at
  BEFORE UPDATE ON public.conversion_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------

CREATE TABLE public.conversion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversion_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system','user','assistant')),
  content text NOT NULL,
  intent text CHECK (intent IN ('inspiracao','duvida','interesse_pacote','pedido_orcamento','intencao_reserva')),
  tools_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  grounded boolean NOT NULL DEFAULT false,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_messages_conversation ON public.conversion_messages (conversation_id, created_at);

GRANT SELECT ON public.conversion_messages TO authenticated;
GRANT ALL ON public.conversion_messages TO service_role;
ALTER TABLE public.conversion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leem mensagens do assistente"
  ON public.conversion_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Utilizador le as mensagens das suas conversas"
  ON public.conversion_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversion_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------

CREATE TABLE public.conversion_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversion_conversations(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.travel_products(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.travel_quotes(id) ON DELETE SET NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  travel_start date,
  travel_end date,
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  travelers_adults integer NOT NULL DEFAULT 1 CHECK (travelers_adults > 0),
  travelers_children integer NOT NULL DEFAULT 0 CHECK (travelers_children >= 0),
  origin_city text,
  interests text[] NOT NULL DEFAULT '{}',
  notes text,
  intent text NOT NULL DEFAULT 'pedido_orcamento'
    CHECK (intent IN ('pedido_orcamento','intencao_reserva')),
  status text NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','em_analise','cotado','convertido','arquivado')),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_leads_status ON public.conversion_leads (status, created_at DESC);

GRANT SELECT, UPDATE ON public.conversion_leads TO authenticated;
GRANT ALL ON public.conversion_leads TO service_role;
ALTER TABLE public.conversion_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leem pedidos do assistente"
  ON public.conversion_leads FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins atualizam pedidos do assistente"
  ON public.conversion_leads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_conversion_leads_updated_at
  BEFORE UPDATE ON public.conversion_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Nada pode ser apagado: histórico comercial é imutável.
CREATE OR REPLACE FUNCTION public.guard_conversion_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Registos de conversão não podem ser eliminados.';
END;
$$;

CREATE TRIGGER guard_conversion_leads_delete
  BEFORE DELETE ON public.conversion_leads
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversion_delete();

CREATE TRIGGER guard_conversion_messages_delete
  BEFORE DELETE ON public.conversion_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversion_delete();

-- -----------------------------------------------------------------------
-- Novos eventos de conversão no tracking existente.

CREATE OR REPLACE FUNCTION public.record_traffic_event(
  _visitor_id uuid, _event_type text, _path text DEFAULT NULL::text,
  _attribution jsonb DEFAULT '{}'::jsonb, _entity_type text DEFAULT NULL::text,
  _entity_id uuid DEFAULT NULL::uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s text := left(nullif(_attribution->>'utm_source',''), 100);
  m text := left(nullif(_attribution->>'utm_medium',''), 100);
  c text := left(nullif(_attribution->>'utm_campaign',''), 150);
  ct text := left(nullif(_attribution->>'utm_content',''), 150);
  tm text := left(nullif(_attribution->>'utm_term',''), 150);
  rh text := left(nullif(_attribution->>'referrer_host',''), 150);
  lg text := left(nullif(_attribution->>'language',''), 10);
  p  text := left(nullif(_path,''), 300);
BEGIN
  IF _visitor_id IS NULL THEN
    RAISE EXCEPTION 'visitor_id obrigatorio';
  END IF;
  IF _event_type NOT IN (
    'visit','service_view','guide_view','booking_started','contact_started',
    'chat_opened','chat_intent_detected','lead_created','quote_link_opened','quote_accepted'
  ) THEN
    RAISE EXCEPTION 'event_type invalido';
  END IF;

  INSERT INTO public.traffic_visitors (
    visitor_id, first_utm_source, first_utm_medium, first_utm_campaign,
    first_utm_content, first_utm_term, first_referrer_host, first_landing_path, first_language
  ) VALUES (_visitor_id, s, m, c, ct, tm, rh, p, lg)
  ON CONFLICT (visitor_id) DO NOTHING;

  INSERT INTO public.traffic_events (
    visitor_id, user_id, event_type, path, entity_type, entity_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_host, language
  ) VALUES (
    _visitor_id, auth.uid(), _event_type, p, left(_entity_type, 50), _entity_id,
    s, m, c, ct, tm, rh, lg
  );
END;
$function$;