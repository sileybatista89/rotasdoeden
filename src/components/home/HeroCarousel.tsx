import { useEffect, useState } from "react";
import praiaBanana from "@/assets/praias/praia-banana.jpg";
import praiaJale from "@/assets/praias/praia-jale.jpg";
import praiaPiscina from "@/assets/praias/praia-piscina.jpg";
import praiaInhame from "@/assets/praias/praia-inhame.jpg";
import ilheuRolas from "@/assets/praias/ilheu-rolas.jpg";
import lagoaAzul from "@/assets/praias/lagoa-azul.jpg";
import picoCaoGrande from "@/assets/praias/pico-cao-grande.jpg";
import cascata from "@/assets/stp/cascata-sao-nicolau.jpg";
import trilho from "@/assets/stp/trilho-floresta.jpg";
import barco from "@/assets/stp/passeio-barco.jpg";
import tartarugas from "@/assets/stp/tartarugas.jpg";

const slides = [
  { src: praiaBanana, alt: "Praia Banana, Ilhéu das Rolas — meia-lua de areia dourada" },
  { src: ilheuRolas, alt: "Ilhéu das Rolas visto de cima, marco do Equador" },
  { src: praiaJale, alt: "Praia Jalé, sul de São Tomé, refúgio de tartarugas" },
  { src: praiaInhame, alt: "Praia Inhame ao entardecer, palmeirais e barcos tradicionais" },
  { src: lagoaAzul, alt: "Lagoa Azul, baobás e águas turquesa no norte de São Tomé" },
  { src: praiaPiscina, alt: "Praia Piscina — piscina natural rodeada de palmeiras" },
  { src: picoCaoGrande, alt: "Pico Cão Grande, agulha vulcânica na floresta tropical" },
  { src: cascata, alt: "Cascata São Nicolau, queda de água na floresta do Obô" },
  { src: trilho, alt: "Trilho na floresta do Obô entre árvores centenárias" },
  { src: barco, alt: "Passeio de barco ao pôr do sol com Pico Cão Grande ao fundo" },
  { src: tartarugas, alt: "Tartarugas recém-nascidas a caminho do oceano" },
];

interface Props {
  intervalMs?: number;
  className?: string;
}

export function HeroCarousel({ intervalMs = 6000, className = "" }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.alt}
          width={1920}
          height={1080}
          fetchPriority={i === 0 ? "high" : "low"}
          decoding="async"
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out will-change-[opacity,transform] ${
            i === index ? "opacity-100 scale-105 animate-ken-burns" : "opacity-0 scale-100"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/35 to-foreground/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(153_42%_25%_/_0.35),_transparent_55%)]" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para imagem ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-secondary" : "w-1.5 bg-primary-foreground/50 hover:bg-primary-foreground/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
