import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import ContactSection from '@/components/ContactSection';

export const metadata = {
  title: 'Photography — LOUI Portfolio',
  description: 'Portraits, candid moments, and visual human stories by LOUI.',
};

export default function PhotographyPage() {
  const photoSeries = [
    {
      title: 'WARMTH & COMPANIONSHIP',
      subtitle: 'Capturing lifelong bonds, wisdom, and warm smiles',
      location: 'Bandung, Indonesia',
      aspect: 'aspect-[4/5]',
    },
    {
      title: 'CANDID EMOTIONS',
      subtitle: 'Unscripted glances and genuine authentic connection',
      location: 'West Java, Indonesia',
      aspect: 'aspect-[1/1]',
    },
    {
      title: 'EDITORIAL PORTRAITURE',
      subtitle: 'Natural ambient lighting with nostalgic cinematic color tones',
      location: 'Studio & Outdoor',
      aspect: 'aspect-[4/5]',
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
          COLLECTION // 02
        </span>
        <h1 className="font-heading font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tight text-neutral-900 leading-[0.88] mb-6">
          PHOTO-
          <br />
          GRAPHY
        </h1>
        <p className="max-w-2xl text-neutral-700 text-base md:text-lg leading-relaxed font-sans">
          Emotional, timeless portraiture and documentary photography highlighting real human stories, intimate warmth, and everyday beauty.
        </p>

        {/* Featured Showcase Hero Image */}
        <div className="mt-12 relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[32px] md:rounded-[44px] overflow-hidden shadow-2xl bg-neutral-900">
          <Image
            src="/images/photography.jpg"
            alt="Photography Hero"
            fill
            priority
            className="object-cover object-center"
          />
        </div>
      </section>

      {/* Photo Series Showcase */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {photoSeries.map((series, idx) => (
            <div
              key={idx}
              className="group relative rounded-[32px] overflow-hidden bg-neutral-900 aspect-[3/4] flex flex-col justify-end p-8 text-white shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <Image
                src="/images/photography.jpg"
                alt={series.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-xs text-white/70 uppercase tracking-wider mb-2">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{series.location}</span>
                </div>
                <h2 className="font-heading font-bold text-2xl uppercase tracking-tight text-white mb-2">
                  {series.title}
                </h2>
                <p className="text-neutral-300 text-xs leading-relaxed font-sans">
                  {series.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Contact */}
      <ContactSection />
    </main>
  );
}
