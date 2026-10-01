import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { JourneyChoiceDialog } from "@/components/home/JourneyChoiceDialog";
import heroImage from "@/assets/real/enseada-principe.jpg";

export function HeroSection() {
  const [choiceOpen, setChoiceOpen] = useState(false);

  return (
    <section className="bg-background">
      <div className="container grid min-h-[calc(100vh-5rem)] gap-10 py-8 md:min-h-[760px] md:grid-cols-12 md:items-center md:py-14 lg:gap-14">
        <div className="relative order-2 md:order-1 md:col-span-6">
          <div className="aspect-[4/5] overflow-hidden bg-muted md:max-h-[680px]">
            <img
              src={heroImage}
              alt="Costa tropical da ilha do Príncipe vista do alto"
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Ilha do Príncipe · Golfo da Guiné</p>
        </div>

        <div className="order-1 flex flex-col pt-6 md:order-2 md:col-span-6 md:pl-6 md:pt-0 lg:pl-12">
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
