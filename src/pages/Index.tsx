import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { FeaturedGuides } from "@/components/home/FeaturedGuides";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuideCTA } from "@/components/home/GuideCTA";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturedGuides />
        <HowItWorks />
        <GuideCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
