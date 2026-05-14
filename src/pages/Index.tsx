import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { GuidesComingSoon } from "@/components/home/GuidesComingSoon";
import { TrustBlock } from "@/components/home/TrustBlock";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuideCTA } from "@/components/home/GuideCTA";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <GuidesComingSoon />
        <TrustBlock />
        <HowItWorks />
        <GuideCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
