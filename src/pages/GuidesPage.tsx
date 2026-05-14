import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, FileCheck, MessageSquare, Eye, Sparkles, IdCard, Wallet, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const pillars = [
  { icon: IdCard, title: "Verificação manual de licença", text: "Cada licença é validada com a autoridade competente antes da activação do perfil." },
  { icon: FileCheck, title: "KYC documental", text: "Documento de identificação, comprovativo de licença e selfie de verificação obrigatórios." },
  { icon: MessageSquare, title: "Entrevista", text: "Conversamos com cada candidato antes de o activar como guia parceiro." },
  { icon: Eye, title: "Monitorização contínua", text: "Avaliações, mensagens e disputas são revistas regularmente pela nossa equipa." },
];

const benefits = [
  { icon: Users, title: "Visibilidade real", text: "Tráfego de turistas internacionais e nacionais qualificados." },
  { icon: Wallet, title: "Pagamentos protegidos", text: "Recebes o valor após o serviço, sem risco de calote." },
  { icon: ShieldCheck, title: "Suporte e mediação", text: "Equipa dedicada a resolver disputas e apoiar o teu trabalho." },
  { icon: MessageSquare, title: "Sem captação externa", text: "As reservas e a comunicação ficam dentro da plataforma — proteges-te a ti e ao turista." },
];

const steps = [
  { n: "01", title: "Registo", text: "Criar conta de guia." },
  { n: "02", title: "KYC", text: "Submeter documento, licença e selfie." },
  { n: "03", title: "Entrevista", text: "Validação por videochamada." },
  { n: "04", title: "Activação", text: "Perfil visível e a receber reservas." },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Guias verificados em São Tomé e Príncipe | Rotas do Éden"
        description="Conheça os nossos guias turísticos verificados em São Tomé e Príncipe. KYC obrigatório, licença validada e suporte dedicado."
        path="/guides"
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-accent/30 to-background py-16 md:py-20">
          <div className="container max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full mb-5">
              <Sparkles size={12} /> Novos parceiros em adesão
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Os primeiros guias parceiros estão em adesão
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Por princípio, a Rotas do Éden não publica guias antes de os verificar pessoalmente.
              Estamos a selecionar os primeiros guias locais — preferimos arrancar com qualidade
              comprovada a preencher esta página com perfis sem garantias.
            </p>
          </div>
        </section>

        {/* Why we wait */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">Porquê esperamos por guias verificados</h2>
              <p className="text-muted-foreground">Quatro pilares que distinguem a Rotas do Éden de directórios genéricos.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {pillars.map((p) => (
                <div key={p.title} className="bg-card border border-border rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <p.icon size={20} className="text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1.5">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">Benefícios para guias parceiros</h2>
              <p className="text-muted-foreground">O que oferecemos a quem se junta à plataforma.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
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

        {/* Process */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">Processo de candidatura</h2>
              <p className="text-muted-foreground">Quatro passos, sem burocracia desnecessária.</p>
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
            <p className="text-muted-foreground leading-relaxed">
              Não cobramos mensalidades nem taxas de adesão. A plataforma sustenta-se de
              uma comissão fixa por reserva concluída, comunicada por escrito a cada guia
              antes da activação do perfil. Sem letras pequenas, sem cobranças surpresa.
            </p>
            <Button asChild variant="link" className="mt-3">
              <Link to="/legal/parcerias#comissoes">Política de Comissões →</Link>
            </Button>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary">
          <div className="container text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              És guia turístico em São Tomé e Príncipe?
            </h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 text-lg">
              Junta-te à primeira geração de guias verificados da Rotas do Éden.
            </p>
            <Button asChild variant="sand" size="lg" className="rounded-full px-8">
              <Link to="/seja-parceiro">
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
