import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useProductBaseline } from "@/hooks/usePackageBuilder";
import { Reveal } from "@/components/ui/reveal";
import essencialImage from "@/assets/real/praia-sul-hd.jpg";
import explorarImage from "@/assets/real/pico-cao-grande-real.jpg";
import imersaoImage from "@/assets/real/roca-casa-grande.jpg";
import medidaImage from "@/assets/real/costa-floresta.jpg";

const packages = [
  {
    slug: "rotas-essencial",
    name: "Rotas Essencial",
    duration: "5 a 7 dias",
    description: "A primeira leitura das ilhas: natureza, costa, património e tempo para respirar.",
    image: essencialImage,
  },
  {
    slug: "rotas-explorar",
    name: "Rotas Explorar",
    duration: "8 a 10 dias",
    description: "Mais caminhos, mais encontros e espaço para conhecer São Tomé para lá do evidente.",
    image: explorarImage,
  },
  {
    slug: "rotas-imersao",
    name: "Rotas Imersão",
    duration: "14 a 15 dias",
    description: "Uma viagem longa e pausada, entre floresta, roças, comunidades e oceano.",
    image: imersaoImage,
  },
  {
    slug: "rotas-a-medida",
    name: "Rotas à Medida",
    duration: "A partir de 5 dias",
    description: "Uma rota construída à volta do seu ritmo, das suas datas e da forma como gosta de viajar.",
    image: medidaImage,
  },
];

export function PackagesShowcase() {
  const baseline = useProductBaseline("rotas-essencial");

  return (
    <section id="pacotes" className="section-space bg-forest text-primary-foreground">
      <div className="container">
        <Reveal className="grid gap-8 border-b border-primary-foreground/20 pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="eyebrow text-coral">Viagens Rotas do Éden</span>
            <h2 className="display-lg mt-6 max-w-3xl text-primary-foreground">
              Quatro maneiras de chegar mais perto das ilhas.
            </h2>
          </div>
          <p className="max-w-md text-base font-light leading-7 text-primary-foreground/72 lg:col-span-4 lg:col-start-9">
            Escolha uma base, ajuste os dias e construa uma viagem completa com o ritmo certo para si.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
          {packages.map((item, index) => (
            <Reveal
              key={item.slug}
              delay={(index % 2) * 100}
              className={index < 2 ? "lg:col-span-6" : "lg:col-span-5 lg:first-of-type:col-start-2"}
            >
              <Link to={`/pacotes/${item.slug}`} className="group block">
                <div className={`overflow-hidden bg-primary-foreground/10 ${index === 0 ? "aspect-[5/4]" : "aspect-[4/3]"}`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 border-t border-primary-foreground/20 pt-5 mt-5">
                  <span className="text-xs text-coral">0{index + 1}</span>
                  <div>
                    <p className="text-xs uppercase text-primary-foreground/65">{item.duration} · personalizável</p>
                    <h3 className="mt-1 font-display text-3xl font-normal text-primary-foreground">{item.name}</h3>
                    <p className="mt-3 max-w-md text-sm font-light leading-6 text-primary-foreground/70">{item.description}</p>
                    {index === 0 && baseline.data && (
                      <div className="mt-4">
                        <p className="font-display text-2xl text-coral">
                          Desde {new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: baseline.data.currency ?? "EUR",
                          maximumFractionDigits: 0,
                        }).format(baseline.data.price_per_person)} / pessoa
                        </p>
                        <p className="mt-1 text-xs leading-5 text-primary-foreground/60">O valor final é confirmado antes da reserva.</p>
                      </div>
                    )}
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase text-primary-foreground">
                      Personalizar esta viagem <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <ArrowUpRight className="mt-1 hidden h-5 w-5 text-primary-foreground/60 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 md:block" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}