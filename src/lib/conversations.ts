import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string | null | undefined): v is string =>
  !!v && UUID_RE.test(v);

/**
 * Find or create a conversation between a tourist and a guide.
 * Both ids must be valid auth user UUIDs.
 */
export async function getOrCreateConversation(opts: {
  touristId: string;
  guideId: string;
  bookingId?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const { touristId, guideId, bookingId = null } = opts;
  if (!isUuid(touristId) || !isUuid(guideId)) {
    return { error: "Conversa indisponível para este perfil de demonstração." };
  }
  if (touristId === guideId) {
    return { error: "Não é possível abrir conversa consigo próprio." };
  }

  // Try to find an existing conversation between the two
  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("tourist_id", touristId)
    .eq("guide_id", guideId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) return { error: findErr.message };
  if (existing) return { id: existing.id };

  const { data: created, error: insErr } = await supabase
    .from("conversations")
    .insert({ tourist_id: touristId, guide_id: guideId, booking_id: bookingId })
    .select("id")
    .single();

  if (insErr) return { error: insErr.message };
  return { id: created.id };
}
