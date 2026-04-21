import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
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
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`tourist_id.eq.${user.id},guide_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      const rows = (data ?? []) as ConvRow[];
      // fetch counterpart profiles
      const ids = Array.from(new Set(rows.flatMap((r) => [r.tourist_id, r.guide_id])));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const map = new Map(profs?.map((p) => [p.id, p]) ?? []);
      setConvs(rows.map((r) => ({
        ...r,
        tourist: map.get(r.tourist_id) as ConvRow["tourist"],
        guide: map.get(r.guide_id) as ConvRow["guide"],
      })));
    })();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
          <MessageSquare /> Mensagens
        </h1>
        {convs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Sem conversas ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {convs.map((c) => {
              const other = user!.id === c.tourist_id ? c.guide : c.tourist;
              return (
                <li key={c.id}>
                  <Link to={`/messages/${c.id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition-colors">
                    <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {other?.avatar_url && <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{other?.full_name ?? "Utilizador"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.last_message_at).toLocaleString("pt-PT")}
                      </p>
                    </div>
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
