import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import PortfolioGrid from "@/components/PortfolioGrid";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#edeced]">
      {/* Top Navigation & Contact trigger */}
      <HeaderNav />

      {/* Hero Header with Location, Logo, and Portfolio subtitle */}
      <HeroSection />

      {/* 2x2 Showcase Grid */}
      <PortfolioGrid />

      {/* Dark Contact & Social Footer */}
      <ContactSection />
    </main>
  );
}
