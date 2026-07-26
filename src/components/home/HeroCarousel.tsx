import { useEffect, useState } from "react";
import principeAerial from "@/assets/real/bom-bom.jpg.asset.json";
import praiaBanana from "@/assets/real/praia-palmeiras.jpg.asset.json";
import lagoaAzul from "@/assets/real/lagoa-azul.jpg.asset.json";
import ilheuRolas from "@/assets/real/ilheu-rolas.jpg.asset.json";
import praiaEscondida from "@/assets/real/praia-rochas.jpg.asset.json";
import picoCaoGrande from "@/assets/real/pico-cao-grande.jpg.asset.json";
import santana from "@/assets/real/santana-real.jpg.asset.json";
import rochasAerea from "@/assets/real/praia-rochas-aerea.jpg.asset.json";
import enseada from "@/assets/real/enseada-principe.jpg.asset.json";
import barco from "@/assets/real/barco-turquesa.jpg.asset.json";
import banho from "@/assets/real/banho-praia.jpg.asset.json";

const slides = [
  { src: picoCaoGrande.url, alt: "Pico Cão Grande — agulha vulcânica de São Tomé vista do mar" },
  { src: rochasAerea.url, alt: "Praia de areia clara com rochas vulcânicas vista de cima, São Tomé" },
  { src: barco.url, alt: "Barco de pesca em água turquesa entre rochas vulcânicas" },
  { src: praiaEscondida.url, alt: "Praia com rochas vulcânicas e água turquesa, Príncipe" },
  { src: lagoaAzul.url, alt: "Lagoa Azul — baobás centenários e enseada turquesa no norte de São Tomé" },
  { src: enseada.url, alt: "Enseada de floresta densa e praia deserta, ilha do Príncipe" },
  { src: principeAerial.url, alt: "Passadiço de Bom Bom, ilha do Príncipe" },
  { src: banho.url, alt: "Visitantes a banhar-se numa praia de palmeiras em São Tomé" },
  { src: praiaBanana.url, alt: "Praia de palmeiras e areia branca, Príncipe" },
  { src: santana.url, alt: "Baía de Santana, costa leste de São Tomé" },
  { src: ilheuRolas.url, alt: "Ilhéu das Rolas — equador de São Tomé" },
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
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/25 to-foreground/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--eden-tropical)_/_0.18),_transparent_60%)]" />
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
