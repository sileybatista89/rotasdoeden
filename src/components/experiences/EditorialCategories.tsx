import praias from "@/assets/optimized/praia-jale-card.webp";
import trilhos from "@/assets/optimized/pico-cao-grande-card.webp";
import cacau from "@/assets/optimized/cacau-card.webp";
import rocas from "@/assets/optimized/roca-card.webp";
import mar from "@/assets/optimized/biodiversidade-card.webp";
import gastronomia from "@/assets/optimized/calulu-card.webp";

const CATEGORIES = [
  { img: praias, title: "Praias e natureza", text: "Praia Jalé, Praia Banana e enseadas de areia clara no sul da ilha." },
  { img: trilhos, title: "Trilhos e floresta", text: "Caminhadas até ao Pico Cão Grande e à floresta do Obô, com guia local." },
  { img: rocas, title: "Roças e história", text: "Agua Izé, Monte Café e a arquitetura das antigas roças de cacau." },
  { img: cacau, title: "Cacau e café", text: "Da fermentação ao chocolate — visitas a produtores são-tomenses." },
  { img: mar, title: "Vida marinha", text: "Mergulho, tartarugas em desova e saídas de barco pela costa." },
  { img: gastronomia, title: "Gastronomia", text: "Calulu, banana cozida, peixe fresco e mesas de família." },
];

export function EditorialCategories() {
  return (
    <section className="py-14 border-t border-border">
      <div className="container">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">O que se faz em São Tomé e Príncipe</h2>
          <p className="text-muted-foreground">
            Estas são as experiências que estamos a organizar com parceiros locais. Ainda não há reservas abertas em todas
            as categorias — mostramos apenas o que existe de verdade no destino.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <article key={c.title} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img src={c.img} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-display font-semibold text-lg text-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
