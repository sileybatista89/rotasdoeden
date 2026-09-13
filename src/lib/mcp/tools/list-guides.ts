import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_guides",
  title: "Listar guias verificados",
  description: "Lista os guias e profissionais verificados e ativos da Rotas do Éden.",
  inputSchema: {
    limit: z.number().int().optional().describe("Número máximo de resultados (1-50, por omissão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const max = Math.min(Math.max(limit ?? 20, 1), 50);
    const { data, error } = await supabaseForUser(ctx)
      .from("professional_profiles")
      .select(
        "id,headline,description,professional_type,areas_of_activity,experience_types,languages,years_experience,company_name",
      )
      .eq("verification_status", "verified")
      .eq("suspended", false)
      .limit(max);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { guides: data ?? [] },
    };
  },
});
