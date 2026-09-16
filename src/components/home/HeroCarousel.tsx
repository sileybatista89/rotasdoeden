import { useEffect, useState } from "react";
import principeAerial from "@/assets/real/bom-bom.jpg";
import praiaBanana from "@/assets/real/praia-palmeiras.jpg";
import lagoaAzul from "@/assets/real/lagoa-azul.jpg";
import ilheuRolas from "@/assets/real/ilheu-rolas.jpg";
import praiaEscondida from "@/assets/real/praia-rochas.jpg";
import picoCaoGrande from "@/assets/real/pico-cao-grande.jpg";
import santana from "@/assets/real/santana-real.jpg";
import rochasAerea from "@/assets/real/praia-rochas-aerea.jpg";
import enseada from "@/assets/real/enseada-principe.jpg";
import barco from "@/assets/real/barco-turquesa.jpg";
import banho from "@/assets/real/banho-praia.jpg";

const slides = [
  { src: picoCaoGrande, alt: "Pico Cão Grande, agulha vulcânica de São Tomé vista do mar" },
  { src: rochasAerea, alt: "Praia de areia clara com rochas vulcânicas vista de cima, São Tomé" },
  { src: barco, alt: "Barco de pesca em água turquesa entre rochas vulcânicas" },
  { src: praiaEscondida, alt: "Praia com rochas vulcânicas e água turquesa, Príncipe" },
  { src: lagoaAzul, alt: "Lagoa Azul, baobás centenários e enseada turquesa no norte de São Tomé" },
  { src: enseada, alt: "Enseada de floresta densa e praia deserta, ilha do Príncipe" },
  { src: principeAerial, alt: "Passadiço de Bom Bom, ilha do Príncipe" },
  { src: banho, alt: "Visitantes a banhar-se numa praia de palmeiras em São Tomé" },
  { src: praiaBanana, alt: "Praia de palmeiras e areia branca, Príncipe" },
  { src: santana, alt: "Baía de Santana, costa leste de São Tomé" },
  { src: ilheuRolas, alt: "Ilhéu das Rolas, equador de São Tomé" },
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
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out ${
              i === index ? "opacity-100 scale-105 animate-ken-burns" : "opacity-0 scale-100"
            }`}
          />
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-t from-eden-ink/85 via-eden-ink/35 to-eden-ink/45" />

      <div className="absolute bottom-7 right-6 md:right-10 flex gap-2 z-10" aria-hidden="false">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para imagem ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-px transition-all duration-700 ${
              i === index ? "w-10 bg-secondary" : "w-4 bg-primary-foreground/45 hover:bg-primary-foreground/80"
            }`}
          />
        ))}
      </div>

    </div>
  );
}
