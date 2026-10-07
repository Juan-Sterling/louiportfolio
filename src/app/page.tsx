import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import ModernGallery from "@/components/ModernGallery";
import ContactSection from "@/components/ContactSection";
import { getGalleryData } from "@/lib/galleryData";

// Enable Incremental Static Regeneration (ISR) - cached on Edge CDN, regenerated in background every 60s
export const revalidate = 60;

export default async function Home() {
  const { categories, items } = await getGalleryData();

  return (
    <main className="min-h-screen flex flex-col bg-[#edeced]">
      {/* Top Floating Navbar (appears on scroll) */}
      <HeaderNav />

      {/* Hero Header with Location, Logo, and Portfolio subtitle */}
      <HeroSection />

      {/* Modern Visual-First Masonry Gallery with Instant Filter & Fullscreen Lightbox */}
      <ModernGallery initialCategories={categories} initialItems={items} />

      {/* Dark Contact & Social Footer */}
      <ContactSection />
    </main>
  );
}

