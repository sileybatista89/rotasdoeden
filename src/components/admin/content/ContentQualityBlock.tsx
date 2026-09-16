import { Badge } from "@/components/ui/badge";

interface Issue {
  code?: string;
  severity?: string;
  detail?: string;
}

interface Props {
  qualityPassed: boolean;
  issues: unknown;
  wordCount?: number | null;
}

const CODE_LABEL: Record<string, string> = {
  no_sources: "Sem fontes",
  price_without_source: "Preço sem fonte",
  claim_without_source: "Número sem fonte",
  invented_url: "Endereço não verificado",
  invalid_internal_link: "Ligação interna inexistente",
  unknown_entity: "Entidade não confirmada",
  keyword_stuffing: "Excesso de palavra-chave",
  duplicate_content: "Conteúdo demasiado parecido",
  too_short: "Demasiado curto",
  wrong_language: "Idioma errado",
  missing_title: "Sem título",
  missing_meta: "Sem descrição",
  missing_keyword: "Sem palavra-chave",
  source_without_url: "Fonte externa sem endereço",
  source_without_table: "Fonte interna incompleta",
  invalid_source: "Fonte inválida",
};

export function ContentQualityBlock({ qualityPassed, issues, wordCount }: Props) {
  const list: Issue[] = Array.isArray(issues) ? (issues as Issue[]) : [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-semibold text-foreground">Controlo de qualidade</h3>
        <Badge variant={qualityPassed ? "default" : "destructive"}>
          {qualityPassed ? "Sem bloqueios" : "Com bloqueios"}
        </Badge>
      </div>
      {typeof wordCount === "number" && (
        <p className="text-xs text-muted-foreground">{wordCount} palavras</p>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum problema registado.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((issue, i) => (
            <li key={`${issue.code}-${i}`} className="flex items-start gap-2 text-sm">
              <Badge variant={issue.severity === "blocking" ? "destructive" : "outline"} className="shrink-0">
                {issue.severity === "blocking" ? "Bloqueio" : "Aviso"}
              </Badge>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{CODE_LABEL[issue.code ?? ""] ?? issue.code}</strong>
                {issue.detail ? `, ${issue.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
