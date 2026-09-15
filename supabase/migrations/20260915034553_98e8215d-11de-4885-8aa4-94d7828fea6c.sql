ALTER TABLE public.traffic_events DROP CONSTRAINT IF EXISTS traffic_events_type_check;
ALTER TABLE public.traffic_events ADD CONSTRAINT traffic_events_type_check CHECK (event_type = ANY (ARRAY[
  'visit','service_view','guide_view','booking_started','booking_paid','contact_started',
  'chat_opened','chat_intent_detected','lead_created','quote_link_opened','quote_accepted'
]));

REVOKE ALL ON public.conversion_conversations FROM anon;
REVOKE ALL ON public.conversion_messages FROM anon;
REVOKE ALL ON public.conversion_leads FROM anon;