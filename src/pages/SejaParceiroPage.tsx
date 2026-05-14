import { Link } from "react-router-dom";
import { ArrowRight, FileCheck, IdCard, Camera, ShieldCheck, Wallet, MessageSquare, Users, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const requirements = [
  { icon: IdCard, title: "Documento de identificação", text: "Bilhete de identidade ou passaporte válido emitido por autoridade reconhecida." },
  { icon: FileCheck, title: "Licença DGTH ou equivalente", text: "Comprovativo de licença de guia turístico emitida pela autoridade competente em São Tomé e Príncipe." },
  { icon: Camera, title: "Foto profissional", text: "Imagem real e actual, em boa qualidade, para o teu perfil público." },
];

const benefits = [
  { icon: Users, title: "Visibilidade nacional e internacional", text: "Aparece a turistas verificados que procuram experiências autênticas em São Tomé e Príncipe." },
  { icon: Wallet, title: "Pagamentos protegidos", text: "Recebes o valor após o serviço prestado. Sem intermediários informais nem risco de não pagamento." },
  { icon: ShieldCheck, title: "Suporte dedicado", text: "Equipa disponível para resolver disputas, ajudar com KYC e apoiar na construção do teu perfil." },
  { icon: MessageSquare, title: "Comunicação segura", text: "Chat moderado dentro da plataforma — proteges-te a ti e ao turista contra fraudes." },
];

const steps = [
  { n: "01", title: "Regista-te", text: "Cria a tua conta de guia em menos de 2 minutos." },
  { n: "02", title: "Submete o KYC", text: "Envia documento de identificação, licença e selfie de verificação." },
  { n: "03", title: "Entrevista breve", text: "Conversamos contigo para validar experiência e expectativas." },
  { n: "04", title: "Activação", text: "O teu perfil fica visível e podes começar a receber reservas." },
];

const faqs = [
  {
    q: "Quanto custa entrar na plataforma?",
    a: "O registo e a candidatura são gratuitos. A Rotas do Éden cobra uma comissão apenas sobre reservas concluídas — o valor exacto é comunicado por escrito antes da activação do perfil.",
  },
  {
    q: "Quanto tempo demora o processo?",
    a: "Depois de submeteres todos os documentos, a verificação demora normalmente entre 3 e 7 dias úteis.",
  },
  {
    q: "Posso continuar a trabalhar com agências?",
    a: "Sim. Não pedimos exclusividade. Apenas exigimos que as reservas feitas através da plataforma sejam geridas dentro da plataforma.",
  },
  {
    q: "O que acontece se houver uma reclamação?",
    a: "Temos um processo de disputas transparente, descrito na nossa Política de Disputas. Ouvimos sempre as duas partes antes de qualquer decisão.",
  },
];

export default function SejaParceiroPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-accent/30 to-background py-16 md:py-24">
          <div className="container max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5">
              <Sparkles size={12} /> Programa de Guias Parceiros
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-5">
              Sê um dos primeiros guias verificados da Rotas do Éden
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Procuramos guias profissionais de São Tomé e Príncipe que queiram trabalhar
              com turistas internacionais numa plataforma transparente, segura e construída
              com critério.
            </p>
            <Button asChild variant="hero" size="lg" className="rounded-full px-8">
              <Link to="/auth?mode=register&role=guide&next=/kyc">
                Candidatar-me agora <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">Porquê juntares-te à Rotas do Éden</h2>
              <p className="text-muted-foreground">Construímos a plataforma a pensar em ti — não apenas no turista.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="bg-card border border-border rounded-2xl p-6 flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <b.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">O que precisas para te candidatares</h2>
              <p className="text-muted-foreground">Trabalhamos só com profissionais reais. Estes são os requisitos mínimos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {requirements.map((r) => (
                <div key={r.title} className="bg-card border border-border rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <r.icon size={22} className="text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{r.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section id="processo" className="py-16 md:py-20">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">Processo de candidatura</h2>
              <p className="text-muted-foreground">4 passos simples, sem burocracia desnecessária.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {steps.map((s) => (
                <div key={s.n} className="bg-card border border-border rounded-2xl p-6">
                  <span className="font-display text-3xl font-bold text-primary/40">{s.n}</span>
                  <h3 className="font-display font-semibold text-foreground mt-2 mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commissions */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Comissões transparentes</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Não cobramos qualquer mensalidade nem taxa de adesão. A plataforma sustenta-se
              de uma comissão fixa sobre cada reserva concluída, comunicada por escrito antes
              da activação do teu perfil.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Acreditamos em condições justas e adaptadas à realidade do turismo em
              São Tomé e Príncipe. Sem letras pequenas, sem cobranças surpresa.
            </p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/legal/parcerias#comissoes">Ler a Política de Comissões →</Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <h2 className="font-display text-3xl font-bold text-foreground text-center mb-10">Perguntas frequentes</h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <div key={f.q} className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-display font-semibold text-foreground mb-1.5">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary relative overflow-hidden">
          <div className="container relative text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 text-lg">
              Junta-te à primeira geração de guias verificados da Rotas do Éden.
            </p>
            <Button asChild variant="sand" size="lg" className="rounded-full px-8">
              <Link to="/auth?mode=register&role=guide&next=/kyc">
                Tornar-me Guia Parceiro <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
