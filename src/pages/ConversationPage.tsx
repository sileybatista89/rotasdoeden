import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AntiFraudBanner } from "@/components/chat/AntiFraudBanner";
import { MessageList, type ChatMessage } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherName, setOtherName] = useState("Conversa");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    setLoading(true);
    setError(null);

    (async () => {
      const { data: conv, error: convErr } = await supabase
        .from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (convErr) { setError("Sem permissão para ver esta conversa."); setLoading(false); return; }
      if (!conv) { setError("Conversa não encontrada."); setLoading(false); return; }

      const otherId = conv.tourist_id === user.id ? conv.guide_id : conv.tourist_id;
      const { data: prof } = await supabase
        .from("profiles_public").select("full_name").eq("id", otherId).maybeSingle();
      if (prof) setOtherName(prof.full_name || "Conversa");

      const { data } = await supabase.from("messages")
        .select("id, sender_id, content, was_filtered, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (payload.new as ChatMessage).id)) return prev;
          return [...prev, payload.new as ChatMessage];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  if (!user || !conversationId) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-4 flex flex-col">
        <Link to="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="font-display text-xl font-bold text-foreground mb-3">{otherName}</h1>
        <AntiFraudBanner />
        <div className="mt-3 flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden min-h-[60vh] shadow-sm">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" /> A carregar conversa…
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive p-6 text-center">{error}</div>
          ) : (
            <>
              <MessageList messages={messages} currentUserId={user.id} />
              <MessageInput conversationId={conversationId} senderId={user.id} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
