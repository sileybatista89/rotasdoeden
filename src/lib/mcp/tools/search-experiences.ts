import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_experiences",
  title: "Procurar experiências",
  description:
    "Lista as experiências turísticas ativas e aprovadas em São Tomé e Príncipe, com filtro por texto e categoria.",
  inputSchema: {
    query: z.string().trim().optional().describe("Texto a procurar no título ou descrição."),
    category: z.string().trim().optional().describe("Categoria da experiência."),
    limit: z.number().int().optional().describe("Número máximo de resultados (1-50, por omissão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const max = Math.min(Math.max(limit ?? 20, 1), 50);
    let request = supabaseForUser(ctx)
      .from("services")
      .select(
        "id,title,description,category,price_per_person,currency,duration_hours,min_people,max_people,languages,meeting_point",
      )
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(max);

    if (category) request = request.eq("category", category);
    if (query) request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { experiences: data ?? [] },
    };
  },
});
