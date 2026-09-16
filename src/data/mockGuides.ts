import type { Guide } from "@/types";

// Plataforma em adesão, sem guias fictícios.
// Os guias reais são carregados directamente do backend (profiles + user_roles + kyc_submissions)
// quando aprovados pela equipa de verificação.
export const mockGuides: Guide[] = [];
