import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import ModernGallery from "@/components/ModernGallery";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#edeced]">
      {/* Top Floating Navbar (appears on scroll) */}
      <HeaderNav />

      {/* Hero Header with Location, Logo, and Portfolio subtitle */}
      <HeroSection />

      {/* Modern Visual-First Masonry Gallery with Instant Filter & Fullscreen Lightbox */}
      <ModernGallery />

      {/* Dark Contact & Social Footer */}
      <ContactSection />
    </main>
  );
}
