-- Trigger function: update conversation last_message_at + log flagged messages
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;

  IF NEW.was_filtered = true THEN
    INSERT INTO public.flagged_messages (conversation_id, message_id, sender_id, reason)
    VALUES (NEW.conversation_id, NEW.id, NEW.sender_id, COALESCE(NEW.flagged_reason, 'filtered'));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Allow admin to view conversations already covered; ensure admin can also view all bookings is covered.
-- Add admin select for messages already covered via existing policy. No further policy changes needed.
