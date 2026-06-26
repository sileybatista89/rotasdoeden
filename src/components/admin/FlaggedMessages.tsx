import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  content: string;
  original_content: string | null;
  flagged_reason: string | null;
  created_at: string;
  sender_id: string;
  sender_name?: string;
}

export function FlaggedMessages() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_list_flagged_messages", { _limit: 50 });
      const rows = (data ?? []) as Row[];
      if (rows.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name")
          .in("id", Array.from(new Set(rows.map((r) => r.sender_id))));
        const map = new Map(profs?.map((p) => [p.id, p.full_name]) ?? []);
        rows.forEach((r) => (r.sender_name = map.get(r.sender_id)));
      }
      setRows(rows);
    })();
  }, []);


  if (rows.length === 0) {
    return <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">Sem mensagens flagged. 🎉</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-destructive" />
              <span className="font-medium text-sm">{r.sender_name ?? "Utilizador"}</span>
            </div>
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
              {r.flagged_reason}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Filtrada:</p>
          <p className="text-sm text-foreground bg-muted rounded p-2 mb-2">{r.content}</p>
          {r.original_content && <>
            <p className="text-xs text-muted-foreground mb-1">Original:</p>
            <p className="text-sm text-destructive bg-destructive/5 rounded p-2">{r.original_content}</p>
          </>}
          <p className="text-[10px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString("pt-PT")}</p>
        </div>
      ))}
    </div>
  );
}
