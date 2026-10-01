import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { JourneyChoiceDialog } from "@/components/home/JourneyChoiceDialog";

export function HeroSection() {
  const [choiceOpen, setChoiceOpen] = useState(false);

  return (
    <section className="bg-background">
      <div className="container flex min-h-[calc(100vh-5rem)] items-center py-14 md:min-h-[760px]">
        <div className="flex max-w-4xl flex-col">
          <span className="eyebrow mb-7">São Tomé e Príncipe</span>
          <h1 className="display-xl max-w-2xl text-foreground">
            Viagens completas a São Tomé e Príncipe, <em className="font-normal text-primary">feitas para si.</em>
          </h1>
          <p className="mt-7 max-w-lg text-base font-light leading-8 text-muted-foreground md:text-lg">
            A Rotas do Éden organiza a sua viagem às ilhas. Escolha uma rota, personalize os dias e receba uma proposta completa.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button variant="hero" size="lg" onClick={() => setChoiceOpen(true)}>
              Começar a viagem <ArrowRight />
            </Button>
            <Link to="/sobre-sao-tome" className="link-underline w-fit text-sm text-foreground">Conhecer o destino</Link>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6">
            <div>
              <p className="text-xs uppercase text-muted-foreground">A viagem</p>
              <p className="mt-2 font-display text-xl">Pacotes flexíveis</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">As ilhas</p>
              <p className="mt-2 font-display text-xl">São Tomé · Príncipe</p>
            </div>
          </div>
        </div>
      </div>
      <JourneyChoiceDialog open={choiceOpen} onOpenChange={setChoiceOpen} />
    </section>
  );
}
