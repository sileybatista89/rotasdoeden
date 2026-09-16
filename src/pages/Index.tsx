import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { GuidesComingSoon } from "@/components/home/GuidesComingSoon";
import { TrustBlock } from "@/components/home/TrustBlock";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuideCTA } from "@/components/home/GuideCTA";
import { DescobreStpSection } from "@/components/home/DescobreStpSection";
import { SustentabilidadeSection } from "@/components/home/SustentabilidadeSection";
import { PackagesShowcase } from "@/components/home/PackagesShowcase";


const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Rotas do Éden, Guias turísticos em São Tomé e Príncipe"
        description="Marketplace de guias turísticos verificados em São Tomé e Príncipe. Reserve trilhas, mergulho, gastronomia e cultura com confiança."
        path="/"
      />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <PackagesShowcase />
        <HowItWorks />
        <DescobreStpSection />
        <SustentabilidadeSection />
        <GuidesComingSoon />
        <TrustBlock />
        <GuideCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
