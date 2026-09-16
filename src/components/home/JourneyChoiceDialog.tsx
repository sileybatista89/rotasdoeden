import { ArrowRight, Compass, Map } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const packageOptions = [
  { name: "Rotas Essencial", duration: "5 a 7 dias", href: "/pacotes/rotas-essencial" },
  { name: "Rotas Explorar", duration: "8 a 10 dias", href: "/pacotes/rotas-explorar" },
  { name: "Rotas Imersão", duration: "14 a 15 dias", href: "/pacotes/rotas-imersao" },
  { name: "Rotas à Medida", duration: "A partir de 5 dias", href: "/pacotes/rotas-a-medida" },
];

interface JourneyChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JourneyChoiceDialog({ open, onOpenChange }: JourneyChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-sm p-0">
        <DialogHeader className="px-6 pb-2 pt-8 text-left md:px-9 md:pt-9">
          <DialogTitle className="font-display text-4xl font-normal leading-none text-foreground md:text-5xl">
            Como quer começar?
          </DialogTitle>
          <DialogDescription className="max-w-xl pt-3 text-sm leading-6 text-muted-foreground">
            Escolha uma viagem completa para personalizar ou conheça primeiro tudo o que as ilhas têm para oferecer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8 px-6 pb-8 pt-5 md:grid-cols-2 md:px-9 md:pb-9">
          <section aria-labelledby="complete-trip-title">
            <Compass className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="complete-trip-title" className="font-display text-2xl font-normal text-foreground">
              Quero organizar uma viagem completa
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Escolha a duração que mais combina consigo.</p>
            <nav className="mt-5" aria-label="Escolher um pacote">
              {packageOptions.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => onOpenChange(false)}
                  className="group flex min-h-16 items-center justify-between gap-4 border-t border-border py-3 text-foreground last:border-b hover:text-primary"
                >
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">{item.duration}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </section>

          <section aria-labelledby="explore-first-title">
            <Map className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="explore-first-title" className="font-display text-2xl font-normal text-foreground">
              Quero explorar São Tomé e Príncipe primeiro
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Conheça o destino ao seu ritmo antes de escolher.</p>
            <nav className="mt-5" aria-label="Explorar as ilhas">
              {[
                { label: "Experiências", href: "/experiences" },
                { label: "Guias", href: "/guides" },
                { label: "O destino", href: "/sobre-sao-tome" },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => onOpenChange(false)}
                  className="group flex min-h-16 items-center justify-between gap-4 border-t border-border py-3 font-medium text-foreground last:border-b hover:text-primary"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}