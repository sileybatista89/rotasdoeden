import { Landmark, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/ui/reveal";
import roca from "@/assets/real/roca-casa-grande.jpg.asset.json";
import rocaPortao from "@/assets/real/roca-portao.jpg.asset.json";

const facts = [
  { k: "Século XIX", v: "Auge das roças de cacau e café, que fizeram das ilhas o maior produtor mundial de cacau." },
  { k: "Arquitetura", v: "Hospitais, senzalas, capelas e casas-grandes desenhadas por arquitetos portugueses." },
  { k: "Hoje", v: "Roças recuperadas acolhem pousadas, cooperativas de chocolate e museus vivos da memória santomense." },
];

export function UnescoSection() {
  return (
    <section className="bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Reveal className="relative min-h-[22rem] lg:min-h-[38rem] grid grid-rows-2">
          <img
            src={roca.url}
            alt="Casa-grande de uma roça histórica de São Tomé e Príncipe, com escadaria e varanda coloniais"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <img
            src={rocaPortao.url}
            alt="Portão amarelo de entrada de uma roça histórica de São Tomé, com sino e canhões"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </Reveal>


        <Reveal delay={120} className="flex items-center">
          <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-16 md:py-24 max-w-2xl">
            <span className="eyebrow mb-6">
              <Landmark size={13} strokeWidth={1.75} className="ml-1" />
              Património Mundial
            </span>
            <h2 className="display-md text-foreground mt-5 mb-6">
              As roças históricas reconhecidas pela UNESCO
            </h2>
            <p className="body-copy mb-10">
              O conjunto das roças de São Tomé e Príncipe integra o Património Mundial da UNESCO —
              um testemunho raro da história agrícola atlântica. Visitá-las é atravessar avenidas de
              palmeiras, hospitais centenários e terreiros de secagem de cacau ainda em uso.
            </p>

            <dl>
              {facts.map((f) => (
                <div key={f.k} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 py-5 border-t border-border last:border-b">
                  <dt className="text-[0.7rem] uppercase tracking-[0.2em] text-primary font-semibold pt-1">{f.k}</dt>
                  <dd className="sm:col-span-2 text-[0.93rem] text-muted-foreground leading-[1.8] font-light">{f.v}</dd>
                </div>
              ))}
            </dl>

            <Link
              to="/sobre-sao-tome"
              className="link-underline mt-10 text-sm uppercase tracking-[0.16em] text-foreground hover:text-primary transition-colors"
            >
              Conhecer o destino <ArrowRight size={15} strokeWidth={1.75} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
