import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_bookings",
  title: "As minhas reservas",
  description:
    "Lista as reservas de experiências do utilizador autenticado (como turista ou como guia), da mais recente para a mais antiga.",
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
      .from("bookings")
      .select(
        "id,service_title,date,num_people,total_price,currency,status,payment_status,special_requests,created_at",
      )
      .order("date", { ascending: false })
      .limit(max);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
