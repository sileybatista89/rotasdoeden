/**
 * Fase 6 — Lógica pura do Conversion Agent.
 *
 * Nada aqui faz IO. O Deno (edge functions) e o vitest importam este ficheiro
 * diretamente, para que as regras comerciais sejam testáveis sem rede.
 *
 * Princípios inegociáveis:
 *  - o agente identifica-se sempre como IA;
 *  - só afirma o que vem das ferramentas (dados reais da base);
 *  - nunca inventa preços, disponibilidade, hotéis, voos, reviews ou guias;
 *  - nunca paga, nunca reserva, nunca contacta fornecedores.
 */

export const CONVERSION_INTENTS = [
  "inspiracao",
  "duvida",
  "interesse_pacote",
  "pedido_orcamento",
  "intencao_reserva",
] as const;

export type ConversionIntent = (typeof CONVERSION_INTENTS)[number];

export function isConversionIntent(value: unknown): value is ConversionIntent {
  return typeof value === "string" && (CONVERSION_INTENTS as readonly string[]).includes(value);
}

/** Primeira mensagem — fixa, nunca gerada por IA. */
export const AI_DISCLOSURE =
  "Olá! Sou o assistente virtual da Rotas do Éden — uma inteligência artificial, não um guia humano. " +
  "Posso ajudar-te a conhecer São Tomé e Príncipe e a preparar um pedido de orçamento. " +
  "Só falo de informação confirmada pela nossa equipa: não invento preços, disponibilidade nem alojamentos. " +
  "Qualquer valor só é válido numa proposta formal enviada pela equipa. " +
  "A qualquer momento podes pedir para falar com uma pessoa.";

export const HUMAN_HANDOFF =
  "Com certeza. Vou registar o teu pedido para a equipa da Rotas do Éden te responder pessoalmente.";

/** Resposta usada quando não há dados reais para sustentar uma afirmação. */
export const NO_DATA_FALLBACK =
  "Ainda não tenho essa informação confirmada na nossa base, por isso não te quero dar um valor ou uma " +
  "disponibilidade que possa estar errada. Posso registar o teu pedido para a equipa confirmar contigo?";

// ------------------------------------------------------------- intenção -----

const INTENT_PATTERNS: { intent: ConversionIntent; patterns: RegExp[] }[] = [
  {
    intent: "intencao_reserva",
    patterns: [
      /\b(quero|vou|posso)\s+(reservar|marcar|fechar|confirmar)\b/i,
      /\bfazer\s+a\s+reserva\b/i,
      /\bcomo\s+(é que\s+)?(pago|posso pagar|faço o pagamento)\b/i,
      /\bavan[çc]ar\s+com\s+a\s+(reserva|viagem)\b/i,
    ],
  },
  {
    intent: "pedido_orcamento",
    patterns: [
      /\bor[çc]amento\b/i,
      /\bproposta\b/i,
      /\bquanto\s+(custa|fica|é|seria)\b/i,
      /\bpre[çc]o\b/i,
      /\bcota[çc][ãa]o\b/i,
    ],
  },
  {
    intent: "interesse_pacote",
    patterns: [
      /\bpacote\b/i,
      /\brotas\s+(essencial|explorar|imers[ãa]o|à medida|a medida)\b/i,
      /\b\d{1,2}\s*dias\b/i,
      /\bitiner[áa]rio\b/i,
      /\bviagem\s+organizada\b/i,
    ],
  },
  {
    intent: "duvida",
    patterns: [
      /\b(visto|vacina|moeda|dobra|clima|tempo|seguran[çc]a|voo|aeroporto|malária|malaria)\b/i,
      /\bé\s+seguro\b/i,
      /\bpreciso\s+de\b/i,
      /\?\s*$/,
    ],
  },
];

/**
 * Classificação determinística, usada como rede de segurança e como validação
 * da classificação devolvida pelo modelo. A intenção mais comprometida ganha.
 */
export function classifyIntent(message: string): ConversionIntent {
  const text = (message ?? "").trim();
  if (!text) return "inspiracao";
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return intent;
  }
  return "inspiracao";
}

const INTENT_RANK: Record<ConversionIntent, number> = {
  inspiracao: 0,
  duvida: 1,
  interesse_pacote: 2,
  pedido_orcamento: 3,
  intencao_reserva: 4,
};

/** Nunca baixamos a intenção de uma conversa por causa de uma frase solta. */
export function mergeIntent(previous: ConversionIntent, next: ConversionIntent): ConversionIntent {
  return INTENT_RANK[next] >= INTENT_RANK[previous] ? next : previous;
}

/** Só estas intenções autorizam a recolha de um pedido de orçamento. */
export function allowsLead(intent: ConversionIntent): boolean {
  return intent === "pedido_orcamento" || intent === "intencao_reserva";
}

// ------------------------------------------------------------------ lead ----

export interface LeadDraft {
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  duration_days?: number | null;
  travelers_adults?: number | null;
  travelers_children?: number | null;
  origin_city?: string | null;
  interests?: string[] | null;
  notes?: string | null;
}

export interface LeadValidation {
  valid: boolean;
  missing: string[];
  lead: Required<Pick<LeadDraft, "travelers_adults" | "travelers_children">> & LeadDraft;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < 1000 ? n : null;
}

/**
 * Um lead só é aceite com contacto. Tudo o resto é opcional: preferimos um
 * pedido incompleto e verdadeiro a um pedido completo e inventado.
 */
export function validateLead(input: unknown): LeadValidation {
  const raw = (input ?? {}) as Record<string, unknown>;
  const missing: string[] = [];

  const email = cleanText(raw.contact_email, 150);
  const phone = cleanText(raw.contact_phone, 40);
  const validEmail = email && EMAIL_RE.test(email) ? email.toLowerCase() : null;
  if (!validEmail && !phone) missing.push("contacto");

  const start = cleanText(raw.travel_start, 10);
  const end = cleanText(raw.travel_end, 10);
  const travelStart = start && DATE_RE.test(start) ? start : null;
  const travelEnd = end && DATE_RE.test(end) ? end : null;
  const orderedEnd = travelStart && travelEnd && travelEnd < travelStart ? null : travelEnd;

  const interests = Array.isArray(raw.interests)
    ? (raw.interests.map((i) => cleanText(i, 60)).filter(Boolean) as string[]).slice(0, 10)
    : [];

  const lead = {
    contact_name: cleanText(raw.contact_name, 120),
    contact_email: validEmail,
    contact_phone: phone,
    travel_start: travelStart,
    travel_end: orderedEnd,
    duration_days: cleanInt(raw.duration_days) || null,
    travelers_adults: cleanInt(raw.travelers_adults) || 1,
    travelers_children: cleanInt(raw.travelers_children) ?? 0,
    origin_city: cleanText(raw.origin_city, 120),
    interests,
    notes: cleanText(raw.notes, 2000),
  };

  return { valid: missing.length === 0, missing, lead };
}

// ---------------------------------------------------------- sanitização -----

/** Termos que nunca podem chegar ao cliente numa resposta do agente. */
const FORBIDDEN_TERMS = [
  "custo do fornecedor",
  "custo de fornecedor",
  "supplier cost",
  "margem",
  "markup",
  "tarifa negociada",
  "comissão interna",
  "net rate",
];

export interface SanitizeResult {
  text: string;
  blocked: boolean;
  reasons: string[];
}

/**
 * Remove dados comerciais internos e, sobretudo, impede o agente de anunciar
 * valores quando não existe uma cotação real por trás.
 */
export function sanitizeReply(
  text: string,
  options: { hasQuote?: boolean } = {},
): SanitizeResult {
  const reasons: string[] = [];
  let out = (text ?? "").trim();

  for (const term of FORBIDDEN_TERMS) {
    if (out.toLowerCase().includes(term)) reasons.push(`termo_interno:${term}`);
  }

  if (!options.hasQuote && mentionsPrice(out)) reasons.push("preco_sem_cotacao");

  if (reasons.length > 0) {
    return { text: NO_DATA_FALLBACK, blocked: true, reasons };
  }
  return { text: out, blocked: false, reasons };
}

/** Deteta qualquer valor monetário no texto. */
export function mentionsPrice(text: string): boolean {
  return /(€|\bEUR\b|\bUSD\b|\$|\bdobras?\b|\bSTN\b)\s?\d|\d[\d .,]*\s?(€|\bEUR\b|\bUSD\b|\bdobras?\b|\bSTN\b)/i.test(
    text ?? "",
  );
}

// --------------------------------------------------------------- prompt -----

export interface GroundingContext {
  products: { name: string; summary: string | null; min_days: number | null; max_days: number | null }[];
  experiences: { title: string; district: string | null }[];
  guides: { name: string; specialty: string | null }[];
  quote: { reference: string; status: string; total_price: number; currency: string } | null;
}

export const CONVERSION_SYSTEM_PROMPT = `És o assistente virtual da Rotas do Éden, marketplace de turismo de São Tomé e Príncipe.

REGRAS ABSOLUTAS
1. És uma IA. Se te perguntarem, confirma-o de imediato.
2. Só podes afirmar factos que estejam no bloco DADOS REAIS. Se não estiverem lá, diz que ainda não tens confirmação e propõe registar o pedido.
3. NUNCA inventes preços, disponibilidade, hotéis, voos, experiências, guias, datas ou avaliações.
4. NUNCA indiques valores monetários, exceto se existir uma cotação no bloco DADOS REAIS — nesse caso repete exatamente o valor indicado.
5. NUNCA fales de custos de fornecedor, tarifas negociadas, margens ou markup.
6. NUNCA reserves, cobres, emitas bilhetes ou prometas contactar fornecedores.
7. Responde sempre em português de Portugal, de forma curta, calorosa e concreta (máximo 6 frases).

O QUE PODES FAZER
- Inspirar e explicar o destino com base nos DADOS REAIS.
- Esclarecer dúvidas gerais de viagem sem prometer nada operacional.
- Recolher um pedido de orçamento: datas ou duração, número de viajantes, cidade de origem, interesses e um contacto.
- Encaminhar para a equipa humana sempre que o visitante pedir.

FORMATO DE RESPOSTA
Devolve apenas JSON válido, sem texto à volta:
{"intent":"inspiracao|duvida|interesse_pacote|pedido_orcamento|intencao_reserva","reply":"texto para o visitante","lead":null ou {"contact_name":"","contact_email":"","contact_phone":"","travel_start":"AAAA-MM-DD","travel_end":"AAAA-MM-DD","duration_days":0,"travelers_adults":0,"travelers_children":0,"origin_city":"","interests":[],"notes":""},"handoff":false}
Preenche "lead" apenas quando já tiveres um contacto (email ou telefone) dado pelo visitante. Caso contrário, "lead": null.`;

export function buildGroundingBlock(ctx: GroundingContext): string {
  const lines: string[] = ["DADOS REAIS (única fonte de verdade):"];

  lines.push(
    ctx.products.length
      ? `Pacotes publicados: ${ctx.products
          .map((p) => `${p.name}${p.min_days ? ` (${p.min_days}${p.max_days ? `-${p.max_days}` : "+"} dias)` : ""}`)
          .join("; ")}`
      : "Pacotes publicados: nenhum confirmado neste momento.",
  );
  lines.push(
    ctx.experiences.length
      ? `Experiências ativas: ${ctx.experiences.map((e) => e.title).join("; ")}`
      : "Experiências ativas: nenhuma confirmada neste momento.",
  );
  lines.push(
    ctx.guides.length
      ? `Guias verificados: ${ctx.guides.map((g) => g.name).join("; ")}`
      : "Guias verificados: nenhum confirmado neste momento.",
  );
  lines.push(
    ctx.quote
      ? `Cotação do visitante: ${ctx.quote.reference}, estado ${ctx.quote.status}, total ${ctx.quote.total_price} ${ctx.quote.currency}.`
      : "Cotação do visitante: não existe.",
  );

  return lines.join("\n");
}

/** Verdadeiro quando há mesmo alguma coisa confirmada para conversar. */
export function hasRealData(ctx: GroundingContext): boolean {
  return ctx.products.length > 0 || ctx.experiences.length > 0 || ctx.guides.length > 0;
}

// -------------------------------------------------------- parse do modelo ---

export interface AgentDecision {
  intent: ConversionIntent;
  reply: string;
  lead: LeadDraft | null;
  handoff: boolean;
}

/** O modelo pode falhar o formato; nunca deixamos isso rebentar a conversa. */
export function parseAgentOutput(raw: string, fallbackIntent: ConversionIntent): AgentDecision {
  const text = (raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { intent: fallbackIntent, reply: text || NO_DATA_FALLBACK, lead: null, handoff: false };
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : NO_DATA_FALLBACK;
    return {
      intent: isConversionIntent(parsed.intent) ? parsed.intent : fallbackIntent,
      reply,
      lead: parsed.lead && typeof parsed.lead === "object" ? (parsed.lead as LeadDraft) : null,
      handoff: parsed.handoff === true,
    };
  } catch {
    return { intent: fallbackIntent, reply: NO_DATA_FALLBACK, lead: null, handoff: false };
  }
}

// ------------------------------------------------------------ eventos -------

export const CONVERSION_TRAFFIC_EVENTS = [
  "chat_opened",
  "chat_intent_detected",
  "lead_created",
  "quote_link_opened",
  "quote_accepted",
] as const;

// ----------------------------------------------------------- limites --------

export const CONVERSION_LIMITS = {
  maxMessageChars: 1500,
  maxMessagesPerConversation: 40,
  maxRequestsPerWindow: 12,
  rateWindowMs: 60_000,
  historyTurns: 8,
};

export function isMessageAcceptable(message: string): { ok: boolean; error?: string } {
  const text = (message ?? "").trim();
  if (!text) return { ok: false, error: "Mensagem vazia." };
  if (text.length > CONVERSION_LIMITS.maxMessageChars) return { ok: false, error: "Mensagem demasiado longa." };
  return { ok: true };
}
