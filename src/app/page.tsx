import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import ModernGallery from "@/components/ModernGallery";
import ContactSection from "@/components/ContactSection";
import { getGalleryData } from "@/lib/galleryData";

// Always render fresh data from database on reload
export const dynamic = 'force-dynamic';

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

