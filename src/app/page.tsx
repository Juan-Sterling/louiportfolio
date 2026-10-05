import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import ModernGallery from "@/components/ModernGallery";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#edeced]">
      {/* Top Floating & Header Navigation */}
      <HeaderNav />

      {/* Modern Visual-First Hero */}
      <HeroSection />

      {/* Filterable Media Gallery with Fullscreen Lightbox & Video Player Modal */}
      <ModernGallery />

      {/* Contact & Social Channels Footer */}
      <ContactSection />
    </main>
  );
}
