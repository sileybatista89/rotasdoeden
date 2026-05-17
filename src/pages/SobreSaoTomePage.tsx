import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Plane, Languages, Coins, Sun } from "lucide-react";

const facts = [
  { icon: MapPin, label: "Localização", value: "Golfo da Guiné, ~250 km da costa do Gabão" },
  { icon: Sun, label: "Clima", value: "Tropical equatorial, 22–30°C todo o ano" },
  { icon: Calendar, label: "Melhor altura", value: "Junho–Set (seca) e Dez–Fev (gravana)" },
  { icon: Plane, label: "Como chegar", value: "Voos via Lisboa, Acra ou Luanda" },
  { icon: Languages, label: "Língua", value: "Português + crioulos forro e angolar" },
  { icon: Coins, label: "Moeda", value: "Dobra (STN). Euro aceite em hotéis" },
];

export default function SobreSaoTomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Sobre São Tomé e Príncipe | Rotas do Éden"
        description="Guia essencial sobre São Tomé e Príncipe: história, geografia, cultura, gastronomia, biodiversidade e dicas práticas para viajar."
        path="/sobre-sao-tome"
      />
      <Navbar />

      <header className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b border-border">
        <div className="container py-14 md:py-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            O destino
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground max-w-3xl leading-tight">
            São Tomé e Príncipe: África no seu estado mais puro
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mt-5 leading-relaxed">
            Duas ilhas vulcânicas sobre o equador, cobertas de floresta primária, com praias quase virgens e um ritmo
            de vida que convida a desacelerar. Tudo o que precisas saber antes de partir.
          </p>
        </div>
      </header>

      <main className="container py-12 md:py-16 flex-1">
        {/* Factos rápidos */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-card border border-border rounded-xl p-5">
                <Icon size={18} className="text-primary mb-2" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                <p className="text-sm font-medium text-foreground leading-snug">{f.value}</p>
              </div>
            );
          })}
        </section>

        <div className="grid md:grid-cols-[1fr_280px] gap-12">
          <article className="prose prose-stone max-w-none">
            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">História breve</h2>
              <p className="text-foreground/85 leading-relaxed">
                Desabitadas até à chegada dos portugueses em 1470, as ilhas foram um dos primeiros laboratórios da
                economia de plantação atlântica — cana-de-açúcar primeiro, café e cacau depois. No início do século XX,
                São Tomé chegou a ser o maior produtor mundial de cacau. A independência foi declarada a <strong>12 de
                Julho de 1975</strong>. Hoje é uma república democrática que vive de pesca, agricultura e,
                crescentemente, de um turismo de pequena escala focado em natureza e cultura.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Geografia e ilhas</h2>
              <p className="text-foreground/85 leading-relaxed mb-3">
                O arquipélago tem 1 001 km² e duas ilhas principais. <strong>São Tomé</strong> concentra a capital, o
                Pico de São Tomé (2 024 m) e o icónico Cão Grande. <strong>Príncipe</strong>, a 150 km a nordeste, é
                Reserva Mundial da Biosfera da UNESCO — menos de 8 000 habitantes vivem rodeados de floresta húmida,
                praias selvagens e baías recortadas.
              </p>
              <p className="text-foreground/85 leading-relaxed">
                Ambas as ilhas são vulcânicas, com solos férteis e rede hidrográfica densa. As cataratas de São Nicolau
                e de Bombaim são paragens obrigatórias para quem caminha no interior.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Cultura e gastronomia</h2>
              <p className="text-foreground/85 leading-relaxed mb-3">
                A cultura santomense é crioula: mistura raízes bantu, portuguesas e angolares. O <em>tchiloli</em> e o{" "}
                <em>danço-congo</em> são teatros de tradição secular. A música — do <em>ússua</em> ao <em>kizomba</em>{" "}
                contemporâneo — anima as festas das comunidades.
              </p>
              <p className="text-foreground/85 leading-relaxed">
                Na mesa, prova o <strong>calulu de peixe</strong> (peixe seco com folhas e óleo de palma), a{" "}
                <strong>banana frita</strong>, o <strong>blá-blá</strong> (massa de milho com molho), a{" "}
                <strong>jaca</strong> e o <strong>izaquente</strong>. Acaba com chocolate de origem ou um café arábica
                cultivado em altitude.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Natureza e biodiversidade</h2>
              <p className="text-foreground/85 leading-relaxed mb-3">
                Mais de 60% da superfície está coberta por floresta, parte dela primária — o <strong>Parque Natural
                Obô</strong> é um dos ecossistemas mais ricos de África Ocidental. Existem mais de 100 espécies
                endémicas, incluindo o tordo-de-Príncipe, o íbis-oliváceo e a maior begónia do mundo.
              </p>
              <p className="text-foreground/85 leading-relaxed">
                Entre Outubro e Março, cinco espécies de <strong>tartarugas marinhas</strong> desovam nas praias do
                sul. Programas locais como o ATM Tatô envolvem visitantes na protecção dos ninhos.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Quando visitar</h2>
              <p className="text-foreground/85 leading-relaxed">
                Há duas estações secas: a <strong>gravana</strong> (Junho–Setembro), fresca e ventosa, ideal para
                caminhadas; e a <strong>gravanita</strong> (Dezembro–Fevereiro), quente e mais seca, óptima para praia
                e mergulho. As chuvas de Março–Maio e Outubro–Novembro são intensas mas curtas — a floresta fica
                deslumbrante.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Dicas práticas</h2>
              <ul className="space-y-2 text-foreground/85 leading-relaxed list-disc pl-5">
                <li>Vacina da febre amarela é obrigatória à entrada.</li>
                <li>Profilaxia anti-malária recomendada — consulta o teu médico.</li>
                <li>Leva calçado fechado para floresta, fato de banho e protector solar biodegradável.</li>
                <li>Conexão móvel funciona bem na ilha de São Tomé; no Príncipe é mais limitada.</li>
                <li>Aluga carro 4x4 ou contrata guia local para acederes ao sul e interior.</li>
              </ul>
            </section>
          </article>

          <aside className="md:sticky md:top-24 h-fit">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Pronto para descobrir?</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Reserva experiências autênticas com guias verificados localmente.
              </p>
              <Link
                to="/experiences"
                className="block text-center bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Ver experiências
              </Link>
              <Link
                to="/guides"
                className="block text-center mt-2 border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Conhecer guias
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
