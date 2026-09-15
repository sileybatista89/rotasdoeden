import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAttribution, trackEvent } from "@/lib/attribution";

export type ConversionIntent =
  | "inspiracao"
  | "duvida"
  | "interesse_pacote"
  | "pedido_orcamento"
  | "intencao_reserva";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TOKEN_KEY = "rde_chat_session";

function readToken(): string | null {
  try {
    const value = localStorage.getItem(TOKEN_KEY);
    return value && /^[0-9a-f]{64}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function writeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sessão apenas em memória se o armazenamento não estiver disponível */
  }
}

async function call(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("conversion-chat", { body: payload });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Record<string, unknown>;
}

/** Sessão anónima do assistente: token opaco, histórico e envio de mensagens. */
export function useConversion(open: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [intent, setIntent] = useState<ConversionIntent>("inspiracao");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const token = readToken();
        if (token) {
          const history = await call({ action: "history", session_token: token });
          const list = (history.messages as ChatMessage[] | undefined) ?? [];
          if (list.length) {
            setMessages(list.map((m) => ({ role: m.role, content: m.content })));
            setIntent((history.intent as ConversionIntent) ?? "inspiracao");
            return;
          }
        }
        const fresh = await call({
          action: "start",
          attribution: getStoredAttribution(),
          language: "pt",
        });
        writeToken(String(fresh.session_token));
        setMessages((fresh.messages as ChatMessage[]) ?? []);
      } catch (e) {
        started.current = false;
        setError((e as Error).message);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (open) void trackEvent("chat_opened");
  }, [open]);

  const send = useCallback(async (text: string) => {
    const token = readToken();
    if (!token || !text.trim()) return;

    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
    try {
      const res = await call({ action: "message", session_token: token, message: text.trim() });
      const nextIntent = (res.intent as ConversionIntent) ?? intent;
      setMessages((prev) => [...prev, { role: "assistant", content: String(res.reply ?? "") }]);
      if (nextIntent !== intent) {
        setIntent(nextIntent);
        void trackEvent("chat_intent_detected");
      }
      if (res.lead_created === true) void trackEvent("lead_created");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [intent]);

  return { messages, intent, sending, error, send };
}
