import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContactSection from '@/components/ContactSection';

export const metadata = {
  title: 'Graphic Design — LOUI Portfolio',
  description: 'Graphic design, event posters, branding, and editorial art by LOUI.',
};

export default function GraphicDesignPage() {
  const sections = [
    {
      title: 'KARBIDA FC',
      subtitle: 'Football, Comic-Style for Ganindra Bimo',
      format: 'Instagram Feeds Format (Square 1080x1080p & Rectangle 1080x1350p)',
      items: [
        { title: 'Matchday Poster 01', tag: 'Social Media Feed' },
        { title: 'Player Spotlight', tag: 'Comic Style Illustration' },
        { title: 'Victory Celebration', tag: 'Editorial Feed' },
      ],
    },
    {
      title: 'EVENT POSTERS',
      subtitle: 'Concerts, Festivals & Community Gatherings',
      format: 'High-Resolution Print & Screen Posters',
      items: [
        { title: 'Live Session Fest', tag: 'Typography & Layout' },
        { title: 'Indie Wave Night', tag: 'Visual Art Direction' },
        { title: 'Underground Sound', tag: 'Monochrome Print' },
      ],
    },
    {
      title: 'THUMBNAILS & COVERS',
      subtitle: 'Digital Content, YouTube & Media Covers',
      format: '16:9 High-CTR Visual Artwork',
      items: [
        { title: 'Series Premiere Thumbnail', tag: 'Digital Compositing' },
        { title: 'Documentary Cover', tag: 'Minimalist Editorial' },
        { title: 'Creative Storytelling', tag: 'Color Pop' },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#edeced] flex flex-col">
      {/* Top Bar with Back Link */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-800 hover:text-black transition-transform hover:-translate-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO HOME</span>
        </Link>

        <div className="w-8 h-8 relative">
          <Image src="/images/loui-logo.png" alt="LOUI" fill className="object-contain" />
        </div>
      </header>

      {/* Hero Header */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-16">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold block mb-3">
          COLLECTION // 01
        </span>
        <h1 className="font-heading font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tight text-neutral-900 leading-[0.88] mb-6">
          GRAPHIC
          <br />
          DESIGN
        </h1>
        <p className="max-w-2xl text-neutral-700 text-base md:text-lg leading-relaxed font-sans">
          Curated visual artwork exploring typography, comic illustrations, football aesthetics, editorial posters, and social media branding.
        </p>

        {/* Featured Showcase Hero Image */}
        <div className="mt-12 relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[32px] md:rounded-[44px] overflow-hidden shadow-2xl bg-neutral-900">
          <Image
            src="/images/graphic-design.png"
            alt="Graphic Design Hero"
            fill
            priority
            className="object-cover object-center"
          />
        </div>
      </section>

      {/* Detailed Gallery Sections */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-28 space-y-20">
        {sections.map((sec, idx) => (
          <div key={idx} className="border-t border-neutral-300 pt-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase block mb-1">
                  PROJECT 0{idx + 1}
                </span>
                <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-neutral-900">
                  {sec.title}
                </h2>
                <p className="text-neutral-600 text-sm md:text-base mt-1">{sec.subtitle}</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 bg-neutral-200/80 px-4 py-1.5 rounded-full self-start md:self-auto">
                {sec.format}
              </span>
            </div>

            {/* Grid of Artwork Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sec.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="group relative aspect-[4/5] rounded-[28px] overflow-hidden bg-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-end p-6"
                >
                  <Image
                    src="/images/graphic-design.png"
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative z-10 text-white">
                    <span className="text-[11px] font-medium tracking-widest uppercase text-white/70 block mb-1">
                      {item.tag}
                    </span>
                    <h3 className="font-heading font-bold text-2xl uppercase tracking-tight text-white group-hover:text-amber-200 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Footer / Contact */}
      <ContactSection />
    </main>
  );
}
