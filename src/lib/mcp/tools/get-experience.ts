import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_experience",
  title: "Detalhe de uma experiência",
  description: "Devolve os detalhes completos de uma experiência ativa e aprovada, a partir do seu identificador.",
  inputSchema: { id: z.string().uuid().describe("Identificador da experiência.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("services")
      .select(
        "id,title,description,category,price_per_person,currency,duration_hours,min_people,max_people,languages,includes,excludes,available_days,available_times,meeting_point,additional_info,images",
      )
      .eq("id", id)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Experiência não encontrada" }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { experience: data },
    };
  },
});
