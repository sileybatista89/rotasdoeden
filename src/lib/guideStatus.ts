import type { Database } from "@/integrations/supabase/types";

export type GuideStatus = Database["public"]["Enums"]["guide_status"];

export const GUIDE_STATUSES: { value: GuideStatus; label: string; tone: "neutral" | "progress" | "good" | "bad" }[] = [
  { value: "candidatura_recebida", label: "Candidatura recebida", tone: "neutral" },
  { value: "em_analise", label: "Em análise", tone: "progress" },
  { value: "documentacao_pendente", label: "Documentação pendente", tone: "progress" },
  { value: "verificacao_em_curso", label: "Verificação em curso", tone: "progress" },
  { value: "aprovado", label: "Aprovado", tone: "good" },
  { value: "rejeitado", label: "Rejeitado", tone: "bad" },
  { value: "suspenso", label: "Suspenso", tone: "bad" },
  { value: "banido", label: "Banido", tone: "bad" },
];

export const guideStatusLabel = (s?: GuideStatus | null) =>
  GUIDE_STATUSES.find((g) => g.value === s)?.label ?? "Sem candidatura";

export const guideStatusClass = (s?: GuideStatus | null) => {
  const tone = GUIDE_STATUSES.find((g) => g.value === s)?.tone ?? "neutral";
  if (tone === "good") return "bg-primary/10 text-primary border-primary/30";
  if (tone === "bad") return "bg-destructive/10 text-destructive border-destructive/30";
  if (tone === "progress") return "bg-secondary/20 text-secondary-foreground border-secondary/40";
  return "bg-muted text-muted-foreground border-border";
};

export const DOCUMENT_TYPES = [
  { value: "identificacao", label: "Documento de identificação" },
  { value: "licenca_profissional", label: "Licença profissional" },
  { value: "certificacao", label: "Certificação" },
  { value: "seguro", label: "Seguro" },
  { value: "outro", label: "Outro documento" },
];

/** Campos obrigatórios para um perfil poder ser publicado. */
export function missingForPublication(pro: {
  profile_photo_url?: string | null;
  district_id?: string | null;
  languages?: string[] | null;
  headline?: string | null;
  description?: string | null;
} | null): string[] {
  if (!pro) return ["Perfil profissional por criar"];
  const missing: string[] = [];
  if (!pro.profile_photo_url) missing.push("Fotografia de perfil");
  if (!pro.district_id) missing.push("Localização");
  if (!pro.languages?.length) missing.push("Idiomas");
  if (!pro.headline && !pro.description) missing.push("Apresentação");
  return missing;
}

/** Estado de moderação de um serviço. */
export const moderationLabel = (s?: string | null) =>
  s === "approved" ? "Aprovado" : s === "rejected" ? "Alterações pedidas" : "Em revisão";

export const moderationClass = (s?: string | null) =>
  s === "approved"
    ? "bg-primary/10 text-primary border-primary/30"
    : s === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-secondary/20 text-secondary-foreground border-secondary/40";

/** Ciclo de vida de um documento pedido pela equipa. */
export const DOC_STATUS_LABELS: Record<string, string> = {
  open: "Solicitado",
  fulfilled: "Enviado",
  in_review: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
};

export const documentStatusLabel = (s?: string | null) => DOC_STATUS_LABELS[s ?? ""] ?? "Pendente";

export const documentStatusClass = (s?: string | null) =>
  s === "approved"
    ? "bg-primary/10 text-primary border-primary/30"
    : s === "rejected" || s === "expired"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : s === "fulfilled" || s === "in_review"
        ? "bg-secondary/20 text-secondary-foreground border-secondary/40"
        : "bg-muted text-muted-foreground border-border";
