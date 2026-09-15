import { describe, expect, it } from "vitest";
import {
  AI_DISCLOSURE,
  allowsLead,
  buildGroundingBlock,
  classifyIntent,
  CONVERSION_INTENTS,
  hasRealData,
  isConversionIntent,
  isMessageAcceptable,
  mentionsPrice,
  mergeIntent,
  NO_DATA_FALLBACK,
  parseAgentOutput,
  sanitizeReply,
  validateLead,
  type GroundingContext,
} from "../../supabase/functions/_shared/agents/conversion";

const emptyContext: GroundingContext = { products: [], experiences: [], guides: [], quote: null };

describe("Fase 6 — identificação como IA", () => {
  it("a primeira mensagem declara que é uma IA e que não inventa valores", () => {
    expect(AI_DISCLOSURE).toMatch(/intelig[êe]ncia artificial/i);
    expect(AI_DISCLOSURE).toMatch(/n[ãa]o invento/i);
  });
});

describe("Fase 6 — classificação de intenção", () => {
  it("reconhece inspiração por omissão", () => {
    expect(classifyIntent("Olá, conta-me sobre as ilhas")).toBe("inspiracao");
    expect(classifyIntent("")).toBe("inspiracao");
  });

  it("reconhece dúvidas operacionais", () => {
    expect(classifyIntent("Preciso de visto para São Tomé?")).toBe("duvida");
    expect(classifyIntent("Como está o clima em novembro?")).toBe("duvida");
  });

  it("reconhece interesse em pacote", () => {
    expect(classifyIntent("Querem mostrar-me o pacote Rotas Essencial?")).toBe("interesse_pacote");
    expect(classifyIntent("Uma viagem de 10 dias é possível?")).toBe("interesse_pacote");
  });

  it("reconhece pedido de orçamento", () => {
    expect(classifyIntent("Quanto custa uma semana?")).toBe("pedido_orcamento");
    expect(classifyIntent("Podem enviar uma proposta?")).toBe("pedido_orcamento");
  });

  it("reconhece intenção de reserva", () => {
    expect(classifyIntent("Quero reservar para março")).toBe("intencao_reserva");
    expect(classifyIntent("Como faço o pagamento?")).toBe("intencao_reserva");
  });

  it("nunca regride a intenção da conversa", () => {
    expect(mergeIntent("pedido_orcamento", "inspiracao")).toBe("pedido_orcamento");
    expect(mergeIntent("duvida", "intencao_reserva")).toBe("intencao_reserva");
  });

  it("só autoriza lead nas intenções comerciais", () => {
    expect(allowsLead("inspiracao")).toBe(false);
    expect(allowsLead("duvida")).toBe(false);
    expect(allowsLead("interesse_pacote")).toBe(false);
    expect(allowsLead("pedido_orcamento")).toBe(true);
    expect(allowsLead("intencao_reserva")).toBe(true);
  });

  it("valida o conjunto fechado de intenções", () => {
    expect(CONVERSION_INTENTS).toHaveLength(5);
    expect(isConversionIntent("inspiracao")).toBe(true);
    expect(isConversionIntent("qualquer")).toBe(false);
  });
});

describe("Fase 6 — proteção comercial", () => {
  it("bloqueia valores quando não existe cotação real", () => {
    const res = sanitizeReply("O pacote fica por 1.850 € por pessoa.");
    expect(res.blocked).toBe(true);
    expect(res.text).toBe(NO_DATA_FALLBACK);
    expect(res.reasons).toContain("preco_sem_cotacao");
  });

  it("permite repetir o valor quando existe cotação real", () => {
    const res = sanitizeReply("A tua proposta tem um total de 1850 EUR.", { hasQuote: true });
    expect(res.blocked).toBe(false);
    expect(res.text).toMatch(/1850/);
  });

  it("nunca deixa passar custos internos, mesmo com cotação", () => {
    for (const term of ["margem", "markup", "tarifa negociada", "custo do fornecedor"]) {
      const res = sanitizeReply(`Internamente a ${term} é confortável.`, { hasQuote: true });
      expect(res.blocked).toBe(true);
      expect(res.text).toBe(NO_DATA_FALLBACK);
    }
  });

  it("deteta valores em várias moedas", () => {
    expect(mentionsPrice("custa €120")).toBe(true);
    expect(mentionsPrice("são 500 dobras")).toBe(true);
    expect(mentionsPrice("350 USD")).toBe(true);
    expect(mentionsPrice("uma viagem inesquecível")).toBe(false);
  });
});

describe("Fase 6 — grounding", () => {
  it("declara explicitamente a ausência de dados reais", () => {
    const block = buildGroundingBlock(emptyContext);
    expect(block).toMatch(/nenhum confirmado/);
    expect(hasRealData(emptyContext)).toBe(false);
  });

  it("lista apenas o que existe na base", () => {
    const block = buildGroundingBlock({
      products: [{ name: "Rotas Essencial", summary: null, min_days: 5, max_days: 7 }],
      experiences: [{ title: "Trilho do Pico", district: null }],
      guides: [],
      quote: { reference: "COT-1", status: "enviada", total_price: 100, currency: "EUR" },
    });
    expect(block).toMatch(/Rotas Essencial \(5-7 dias\)/);
    expect(block).toMatch(/Trilho do Pico/);
    expect(block).toMatch(/Guias verificados: nenhum/);
    expect(block).toMatch(/COT-1/);
  });
});

describe("Fase 6 — leads", () => {
  it("rejeita um pedido sem contacto", () => {
    const res = validateLead({ contact_name: "Ana" });
    expect(res.valid).toBe(false);
    expect(res.missing).toContain("contacto");
  });

  it("aceita email válido e normaliza os dados", () => {
    const res = validateLead({
      contact_name: "  Ana   Silva ",
      contact_email: "ANA@Exemplo.com",
      travelers_adults: 2,
      travelers_children: 1,
      interests: ["praias", "  trilhos "],
      duration_days: 7,
    });
    expect(res.valid).toBe(true);
    expect(res.lead.contact_name).toBe("Ana Silva");
    expect(res.lead.contact_email).toBe("ana@exemplo.com");
    expect(res.lead.interests).toEqual(["praias", "trilhos"]);
    expect(res.lead.travelers_adults).toBe(2);
  });

  it("rejeita email inválido mas aceita telefone", () => {
    const res = validateLead({ contact_email: "nao-e-email", contact_phone: "+239 990 0000" });
    expect(res.valid).toBe(true);
    expect(res.lead.contact_email).toBeNull();
  });

  it("descarta datas mal formadas ou invertidas", () => {
    const res = validateLead({
      contact_phone: "912345678",
      travel_start: "2027-03-10",
      travel_end: "2027-03-01",
    });
    expect(res.lead.travel_start).toBe("2027-03-10");
    expect(res.lead.travel_end).toBeNull();
    expect(validateLead({ contact_phone: "1", travel_start: "10/03/2027" }).lead.travel_start).toBeNull();
  });

  it("aplica valores por omissão seguros aos viajantes", () => {
    const res = validateLead({ contact_phone: "912345678" });
    expect(res.lead.travelers_adults).toBe(1);
    expect(res.lead.travelers_children).toBe(0);
  });
});

describe("Fase 6 — resposta do modelo", () => {
  it("lê JSON válido", () => {
    const decision = parseAgentOutput(
      '{"intent":"duvida","reply":"Não precisas de visto prévio.","lead":null,"handoff":false}',
      "inspiracao",
    );
    expect(decision.intent).toBe("duvida");
    expect(decision.reply).toMatch(/visto/);
  });

  it("recupera JSON envolvido em texto", () => {
    const decision = parseAgentOutput('Claro:\n{"intent":"inspiracao","reply":"Olá!"}\nObrigado', "duvida");
    expect(decision.reply).toBe("Olá!");
  });

  it("degrada com segurança quando o formato falha", () => {
    const decision = parseAgentOutput("{isto não é json", "duvida");
    expect(decision.intent).toBe("duvida");
    expect(decision.lead).toBeNull();
  });

  it("nunca reencaminha texto cru do modelo quando não há JSON", () => {
    const decision = parseAgentOutput("Return the JSON object. Max 6 sentences.", "duvida");
    expect(decision.reply).toBe(NO_DATA_FALLBACK);
  });

  it("nunca devolve resposta vazia", () => {
    expect(parseAgentOutput('{"reply":"   "}', "inspiracao").reply).toBe(NO_DATA_FALLBACK);
    expect(parseAgentOutput("", "inspiracao").reply).toBe(NO_DATA_FALLBACK);
  });
});

describe("Fase 6 — limites de uso", () => {
  it("rejeita mensagens vazias ou demasiado longas", () => {
    expect(isMessageAcceptable("   ").ok).toBe(false);
    expect(isMessageAcceptable("a".repeat(2000)).ok).toBe(false);
    expect(isMessageAcceptable("Olá").ok).toBe(true);
  });
});
