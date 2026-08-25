import passeioGruta from "@/assets/real/passeio-gruta-real.jpeg.asset.json";
import praiaBanana from "@/assets/real/praia-banana-hd.jpg.asset.json";
import costaFloresta from "@/assets/real/costa-floresta.jpg.asset.json";
import picoCaoGrande from "@/assets/real/pico-cao-grande-real.jpg.asset.json";
import cacau from "@/assets/real/cacau-real.jpg.asset.json";
import roca from "@/assets/real/roca-casa-grande.jpg.asset.json";

const CATEGORIES = [
  {
    img: passeioGruta.url,
    title: "Vida Marinha",
    text: "Conheça a costa a partir do mar, as grutas vulcânicas e as águas do arquipélago.",
  },
  {
    img: praiaBanana.url,
    title: "Praias e Ilhas",
    text: "Descubra praias entre coqueiros, pequenas enseadas e ilhéus de origem vulcânica.",
  },
  {
    img: costaFloresta.url,
    title: "Natureza e Floresta",
    text: "Explore paisagens onde a floresta tropical encontra diretamente o Atlântico.",
  },
  {
    img: picoCaoGrande.url,
    title: "Trilhos e Aventura",
    text: "Conheça os caminhos do Obô e as paisagens em redor do Pico Cão Grande.",
  },
  {
    img: cacau.url,
    title: "Cacau e Gastronomia",
    text: "Descubra o cacau são-tomense, os produtos locais e os sabores preparados nas ilhas.",
  },
  {
    img: roca.url,
    title: "Cultura e Património",
    text: "Explore as roças históricas, a arquitetura e as tradições vivas das comunidades.",
  },
];

export function EditorialCategories() {
  return (
    <section className="py-12 md:py-16" aria-labelledby="explore-destino-title">
      <div className="container">
        <div className="max-w-2xl mb-8 md:mb-10">
          <span className="eyebrow mb-3">Conheça as ilhas</span>
          <h2 id="explore-destino-title" className="font-display text-3xl md:text-4xl font-medium text-foreground mb-3">
            Explore o destino
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Uma introdução ao que pode descobrir em São Tomé e Príncipe. Este conteúdo é inspiracional e não representa
            experiências disponíveis para reserva.
          </p>
        </div>
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <article key={c.title} className="group">
              <div className="aspect-[4/3] bg-muted overflow-hidden rounded-md">
                <img
                  src={c.img}
                  alt={`Fotografia real de ${c.title.toLowerCase()} em São Tomé e Príncipe`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase text-primary mb-1">Descubra</p>
                <h3 className="font-display font-medium text-xl text-foreground mb-1">{c.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
