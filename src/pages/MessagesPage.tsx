import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ConvRow {
  id: string;
  tourist_id: string;
  guide_id: string;
  last_message_at: string;
  tourist?: { full_name: string; avatar_url: string | null };
  guide?: { full_name: string; avatar_url: string | null };
  preview?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`tourist_id.eq.${user.id},guide_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    const rows = (data ?? []) as ConvRow[];
    const ids = Array.from(new Set(rows.flatMap((r) => [r.tourist_id, r.guide_id])));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));

    // last message preview per conv
    const previews = new Map<string, string>();
    if (rows.length) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", rows.map((r) => r.id))
        .order("created_at", { ascending: false });
      for (const m of msgs ?? []) {
        if (!previews.has(m.conversation_id)) previews.set(m.conversation_id, m.content);
      }
    }

    setConvs(rows.map((r) => ({
      ...r,
      tourist: map.get(r.tourist_id) as ConvRow["tourist"],
      guide: map.get(r.guide_id) as ConvRow["guide"],
      preview: previews.get(r.id),
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare /> Mensagens
        </h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <ShieldCheck size={14} className="text-primary" /> Toda a comunicação ocorre dentro da plataforma.
        </p>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-sm text-muted-foreground">A carregar…</div>
        ) : convs.length === 0 ? (
          <div className="bg-gradient-to-br from-primary/5 via-card to-secondary/10 border border-border rounded-2xl p-12 text-center">
            <MessageSquare size={32} className="mx-auto text-primary/40 mb-3" />
            <p className="font-display text-lg text-foreground mb-1">Sem conversas ainda</p>
            <p className="text-sm text-muted-foreground">Reserva ou contacta um guia para começar uma conversa.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {convs.map((c) => {
              const other = user!.id === c.tourist_id ? c.guide : c.tourist;
              return (
                <li key={c.id}>
                  <Link to={`/messages/${c.id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary hover:shadow-sm transition-all">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-primary">
                      {other?.avatar_url
                        ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (other?.full_name?.charAt(0)?.toUpperCase() ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{other?.full_name ?? "Utilizador"}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.preview ?? "Sem mensagens ainda"}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {new Date(c.last_message_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
