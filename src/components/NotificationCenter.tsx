import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notice { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string }

export function NotificationCenter() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from("notifications").select("id,title,body,link,read_at,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (active && !error) setNotices((data ?? []) as Notice[]);
    };
    load();
    const channel = supabase.channel(`notificacoes:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  if (!user) return null;
  const unread = notices.filter((notice) => !notice.read_at).length;
  async function markRead(id: string) {
    const readAt = new Date().toISOString();
    setNotices((current) => current.map((notice) => notice.id === id ? { ...notice, read_at: readAt } : notice));
    await supabase.from("notifications").update({ read_at: readAt }).eq("id", id).eq("user_id", user.id);
  }

  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Notificações${unread ? `, ${unread} por ler` : ""}`}>
        <Bell size={20} />{unread > 0 && <span className="absolute right-1 top-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center">{Math.min(unread, 9)}{unread > 9 ? "+" : ""}</span>}
      </Button></PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="px-4 py-3 border-b border-border font-medium">Notificações</div>
        <ScrollArea className="h-80">
          {notices.length === 0 ? <p className="p-6 text-sm text-center text-muted-foreground">Sem notificações.</p> : notices.map((notice) => {
            const content = <div className="px-4 py-3 border-b border-border/60 hover:bg-muted/50 transition-colors"><div className="flex gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notice.read_at ? "bg-muted" : "bg-primary"}`} />
              <div><p className="text-sm font-medium text-foreground">{notice.title}</p><p className="text-xs text-muted-foreground mt-1">{notice.body}</p></div>
            </div></div>;
            return notice.link ? <Link key={notice.id} to={notice.link} onClick={() => markRead(notice.id)}>{content}</Link>
              : <button key={notice.id} className="block w-full text-left" onClick={() => markRead(notice.id)}>{content}</button>;
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}