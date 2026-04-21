import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  was_filtered: boolean;
  created_at: string;
}

export function MessageList({ messages, currentUserId }: { messages: ChatMessage[]; currentUserId: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Sem mensagens ainda. Diga olá!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {messages.map((m) => {
        const mine = m.sender_id === currentUserId;
        return (
          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
              mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              m.was_filtered && "border-2 border-destructive/50",
            )}>
              {m.was_filtered && (
                <div className="flex items-center gap-1 text-xs opacity-80 mb-1">
                  <ShieldAlert size={12} /> Conteúdo filtrado
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {new Date(m.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
