import type { Database } from "@/integrations/supabase/types";

export type ProfessionalType = Database["public"]["Enums"]["professional_type"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];

export const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string; hint: string }[] = [
  { value: "guia_credenciado", label: "Guia Credenciado", hint: "Com licença emitida pela autoridade de turismo" },
  { value: "guia_local", label: "Guia Local", hint: "Conhecedor da zona, sem licença formal" },
  { value: "operador_turistico", label: "Operador Turístico", hint: "Organiza circuitos e transporte" },
  { value: "empresa_agencia", label: "Empresa / Agência", hint: "Entidade registada com equipa própria" },
  { value: "outro", label: "Outro", hint: "Serviços turísticos complementares" },
];

export const professionalTypeLabel = (t?: ProfessionalType | null) =>
  PROFESSIONAL_TYPES.find((p) => p.value === t)?.label ?? "Por definir";

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  not_verified: "Não verificado",
  pending: "Verificação pendente",
  verified: "Perfil verificado",
  rejected: "Verificação recusada",
  expired: "Verificação expirada",
};

export const AREAS_OF_ACTIVITY = [
  "Natureza e trilhos",
  "Praias e mar",
  "Mergulho",
  "Pesca",
  "Observação de aves",
  "História e roças",
  "Cultura e comunidade",
  "Gastronomia",
  "Cacau e café",
  "Fotografia",
  "Transfers e transporte",
  "Passeios de barco",
];

export const LANGUAGES = ["Português", "Inglês", "Francês", "Espanhol", "Alemão", "Italiano", "Crioulo"];

export const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
