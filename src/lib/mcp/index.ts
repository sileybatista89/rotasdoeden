import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchExperiences from "./tools/search-experiences";
import getExperience from "./tools/get-experience";
import listGuides from "./tools/list-guides";
import listMyBookings from "./tools/list-my-bookings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "eden-explorer",
  title: "Eden Explorer",
  version: "0.1.0",
  instructions:
    "Ferramentas da Rotas do Éden, marketplace de guias turísticos em São Tomé e Príncipe. Use `search_experiences` e `get_experience` para experiências publicadas, `list_guides` para guias verificados e `list_my_bookings` para as reservas do utilizador autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchExperiences, getExperience, listGuides, listMyBookings],
});
