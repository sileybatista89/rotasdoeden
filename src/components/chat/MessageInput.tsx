import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MessageInput({ conversationId, senderId, onSent }: {
  conversationId: string; senderId: string; onSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    if (content.length > 2000) return toast.error("Mensagem demasiado longa");
    setBusy(true);
    try {
      let filtered = content;
      let wasFiltered = false;
      let reasons: string[] = [];
      try {
        const { data: filterData, error: filterErr } = await supabase.functions.invoke("filter-message", {
          body: { content },
        });
        if (filterErr) throw filterErr;
        const r = filterData as { filtered: string; wasFiltered: boolean; reasons: string[] };
        filtered = r.filtered; wasFiltered = r.wasFiltered; reasons = r.reasons ?? [];
      } catch {
        // If filter is unreachable, fall back to sending raw content rather than blocking the user
        filtered = content;
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: filtered,
        original_content: wasFiltered ? content : null,
        was_filtered: wasFiltered,
        flagged_reason: wasFiltered ? reasons.join(",") : null,
      });
      if (error) throw error;

      if (wasFiltered) {
        toast.warning("Conteúdo filtrado por segurança", {
          description: "Contactos e pagamentos externos não são permitidos. Toda a comunicação deve ocorrer dentro da plataforma.",
        });
      }

      setText("");
      onSent?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border p-3 flex gap-2 bg-card">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        }}
        placeholder="Escreva uma mensagem... (sem contactos externos)"
        rows={1}
        className="resize-none min-h-[44px] max-h-32"
        maxLength={2000}
        disabled={busy}
      />
      <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="h-11 w-11 flex-shrink-0">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
      </Button>
    </div>
  );
}
