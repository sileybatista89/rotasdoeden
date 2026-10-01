import costaMar from "@/assets/real/costa-mar-real.jpeg";
import passeioGruta from "@/assets/real/passeio-gruta-real.jpeg";
import praiaBanana from "@/assets/real/ilheu-rolas.jpg";
import picoCaoGrande from "@/assets/real/pico-cao-grande.jpg";
import cacau from "@/assets/real/cacau-real.jpg";
import roca from "@/assets/real/roca-casa-grande.jpg";

const CATEGORIES = [
  {
    img: passeioGruta,
    title: "Vida Marinha",
    text: "Conheça a costa a partir do mar, as grutas vulcânicas e as águas do arquipélago.",
  },
  {
    img: praiaBanana,
    title: "Praias e Ilhas",
    text: "Descubra praias entre coqueiros, pequenas enseadas e ilhéus de origem vulcânica.",
  },
  {
    img: costaMar,
    title: "Natureza e Floresta",
    text: "Explore paisagens onde a floresta tropical encontra diretamente o Atlântico.",
  },
  {
    img: picoCaoGrande,
    title: "Trilhos e Aventura",
    text: "Conheça os caminhos do Obô e as paisagens em redor do Pico Cão Grande.",
  },
  {
    img: cacau,
    title: "Cacau e Gastronomia",
    text: "Descubra o cacau são-tomense, os produtos locais e os sabores preparados nas ilhas.",
  },
  {
    img: roca,
    title: "Cultura e Património",
    text: "Explore as roças históricas, a arquitetura e as tradições vivas das comunidades.",
  },
];

export function EditorialCategories() {
  return (
    <section className="section-space" aria-labelledby="explore-destino-title">
      <div className="container">
        <div className="max-w-2xl mb-8 md:mb-10">
          <span className="eyebrow mb-3">Conheça as ilhas</span>
          <h2 id="explore-destino-title" className="display-md mb-3 text-foreground">
            Explore o destino
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Uma introdução ao que pode descobrir em São Tomé e Príncipe. Este conteúdo é inspiracional e não representa
            experiências disponíveis para reserva.
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
          {CATEGORIES.map((c, index) => (
            <article key={c.title} className={`group ${index === 0 || index === 3 ? "lg:col-span-5" : "lg:col-span-3"}`}>
              <div className="aspect-[4/3] overflow-hidden bg-muted">
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
