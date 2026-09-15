import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

/** Botão flutuante do assistente. Presente em todas as páginas públicas. */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChatPanel open={open} onClose={() => setOpen(false)} />
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar assistente virtual" : "Abrir assistente virtual"}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">{open ? "Fechar" : "Falar com o assistente"}</span>
      </button>
    </>
  );
}
