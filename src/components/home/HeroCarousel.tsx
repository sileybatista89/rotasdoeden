import { useEffect, useState } from "react";
import principeAerial from "@/assets/real/principe-aerial-hd.jpg.asset.json";
import praiaBanana from "@/assets/real/praia-banana-hd.jpg.asset.json";
import lagoaAzul from "@/assets/real/lagoa-azul-hd.jpg.asset.json";
import ilheuRolas from "@/assets/real/ilheu-rolas.jpg.asset.json";
import praiaEscondida from "@/assets/real/praia-escondida.jpg.asset.json";
import picoCaoGrande from "@/assets/real/pico-cao-grande-real.jpg.asset.json";
import santana from "@/assets/real/santana-coast.jpg.asset.json";

const slides = [
  { src: praiaEscondida.url, alt: "Praia escondida no Príncipe" },
  { src: picoCaoGrande.url, alt: "Pico Cão Grande — agulha vulcânica de São Tomé" },
  { src: santana.url, alt: "Baía de Santana, costa leste de São Tomé" },
  { src: principeAerial.url, alt: "Vista aérea de Príncipe — Pico Papagaio e praia" },
  { src: praiaBanana.url, alt: "Praia Banana, Príncipe — meia-lua de areia dourada" },
  { src: lagoaAzul.url, alt: "Lagoa Azul, norte de São Tomé — baobá centenário" },
  { src: ilheuRolas.url, alt: "Praia do Ilhéu das Rolas — equador de São Tomé" },
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
      {slides.map((s, i) => {
        const shouldRender = i === index || i === (index + 1) % slides.length;
        if (!shouldRender) return null;

        return (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100 scale-105 animate-ken-burns" : "opacity-0 scale-100"
            }`}
          />
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/35 to-foreground/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(152_60%_38%_/_0.35),_transparent_55%)]" />
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
