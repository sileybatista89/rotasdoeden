import { Card } from "@/components/ui/card";
import type { BuilderSummary } from "@/lib/packageBuilder";

export function TripSummary({ summary }: { summary: BuilderSummary }) {
  return (
    <Card className="space-y-5 rounded-sm p-6 shadow-none">
      <div>
        <h2 className="font-display text-xl font-medium text-foreground">Resumo da sua viagem</h2>
        <p className="text-sm text-muted-foreground">
          {summary.totalSelections} escolhas · {summary.bookableSelections} com serviço confirmado ·{" "}
          {summary.inspirationSelections} como inspiração
        </p>
      </div>

      <ol className="space-y-3">
        {summary.days.map((d) => (
          <li key={d.day} className="border-l-2 border-border pl-3">
            <p className="text-sm font-medium text-foreground">Dia {d.day} · {d.title}</p>
            {d.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {d.kind === "livre" ? "Ainda sem escolhas." : "Estrutura padrão do pacote."}
              </p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {d.items.map((i, index) => (
                  <li key={`${i.id}-${index}`} className="border-b border-border pb-1 text-xs text-foreground">
                    {i.name}<span className="text-muted-foreground">{i.bookable ? "" : " · inspiração"}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {summary.warnings.length > 0 && (
        <div className="space-y-1">
          {summary.warnings.map((w) => (
            <p key={`${w.day}-${w.message}`} className="text-sm text-muted-foreground">
              Dia {w.day}: {w.message}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        As opções marcadas como inspiração ainda não têm serviço e preço confirmados, por isso não entram no valor da
        proposta. A equipa confirma disponibilidade e preço antes de lhe enviar a proposta final.
      </p>
    </Card>
  );
}
