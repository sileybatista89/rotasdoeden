import { useEffect, useRef, useState } from "react";
import { Send, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useConversion } from "@/hooks/useConversion";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: Props) {
  const { messages, sending, error, send } = useConversion(open);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, sending]);

  if (!open) return null;

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    void send(text);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary to-primary/85 px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <div>
            <p className="text-sm font-semibold leading-tight">Assistente Rotas do Éden</p>
            <p className="text-[11px] opacity-90">Assistente de inteligência artificial</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar assistente" className="rounded-lg p-1 hover:bg-white/15">
          <X size={16} />
        </button>
      </header>

      <div className="flex max-h-[26rem] min-h-[16rem] flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted text-foreground",
            )}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="self-start rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            A escrever…
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            maxLength={1500}
            placeholder="Escreve a tua pergunta sobre São Tomé e Príncipe…"
            className="min-h-[2.75rem] resize-none text-sm"
          />
          <Button size="icon" onClick={submit} disabled={sending || !draft.trim()} aria-label="Enviar mensagem">
            <Send size={16} />
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Respostas geradas por IA com base em informação confirmada. Valores só são válidos em proposta formal.
        </p>
      </div>
    </div>
  );
}
