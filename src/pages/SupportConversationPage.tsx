import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Headphones, Loader2, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SupportMessage { id: string; sender_id: string; content: string; created_at: string }

export default function SupportConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState("Suporte Rotas do Éden");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!conversationId) return;
    const [{ data: conversation, error }, { data: rows }] = await Promise.all([
      supabase.from("support_conversations").select("subject").eq("id", conversationId).maybeSingle(),
      supabase.from("support_messages").select("id,sender_id,content,created_at").eq("conversation_id", conversationId).order("created_at"),
    ]);
    if (error) toast.error("Sem permissão para abrir esta conversa");
    if (conversation) setSubject(conversation.subject);
    setMessages((rows ?? []) as SupportMessage[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
    if (!conversationId) return;
    const channel = supabase.channel(`support:${conversationId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversationId}` }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, load]);

  async function send() {
    const message = content.trim();
    if (!user || !conversationId || !message) return;
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({ conversation_id: conversationId, sender_id: user.id, content: message.slice(0, 3000) });
    setBusy(false);
    if (error) return toast.error(error.message);
    setContent("");
    load();
  }

  return <div className="min-h-screen flex flex-col bg-muted/30"><Navbar /><main className="flex-1 container max-w-2xl py-4 flex flex-col">
    <Link to="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft size={16} /> Voltar</Link>
    <div className="flex items-center gap-2 mb-3"><Headphones className="text-primary" /><div><h1 className="font-display text-xl font-bold text-foreground">{subject}</h1><p className="text-xs text-muted-foreground">Conversa privada com a equipa de suporte</p></div></div>
    <section className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden min-h-[60vh]">
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {loading ? <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div> : messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[82%] rounded-lg px-4 py-2 text-sm ${message.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            <p className="whitespace-pre-wrap">{message.content}</p><time className="block text-[10px] opacity-70 mt-1">{new Date(message.created_at).toLocaleString("pt-PT")}</time>
          </div>
        </div>)}
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end"><Textarea aria-label="Mensagem para o suporte" rows={2} maxLength={3000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escreve a tua mensagem…" />
        <Button size="icon" disabled={busy || !content.trim()} onClick={send} aria-label="Enviar mensagem"><Send size={18} /></Button></div>
    </section>
  </main></div>;
}