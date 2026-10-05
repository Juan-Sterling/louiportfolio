import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Play, Film } from 'lucide-react';
import ContactSection from '@/components/ContactSection';

export const metadata = {
  title: 'Videography — LOUI Portfolio',
  description: 'Cinematography, short films, directing, and motion stories by LOUI.',
};

export default function VideographyPage() {
  const videoWorks = [
    {
      title: 'MOMENTS IN MOTION',
      category: 'Documentary Short',
      duration: '03:45',
      description: 'Poetic documentation capturing subtle nuances of life and everyday movement.',
    },
    {
      title: 'URBAN VIBES & RHYTHM',
      category: 'Commercial & Lifestyle',
      duration: '01:30',
      description: 'Fast-paced rhythmic editing celebrating youth culture and modern city scenes.',
    },
    {
      title: 'CINEMATIC PORTRAITS',
      category: 'Brand Visuals',
      duration: '02:15',
      description: 'High-contrast lighting and rich color palettes designed for visual brands.',
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
          COLLECTION // 03
        </span>
        <h1 className="font-heading font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tight text-neutral-900 leading-[0.88] mb-6">
          VIDEO-
          <br />
          GRAPHY
        </h1>
        <p className="max-w-2xl text-neutral-700 text-base md:text-lg leading-relaxed font-sans">
          Cinematography, narrative directing, and documentary filmmaking bringing human emotion, mood, and movement to life.
        </p>

        {/* Featured Showcase Hero Image with Play Icon */}
        <div className="mt-12 relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[32px] md:rounded-[44px] overflow-hidden shadow-2xl bg-neutral-900 group">
          <Image
            src="/images/videography.png"
            alt="Videography Hero"
            fill
            priority
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

          {/* Central Play Badge */}
          <a
            href="https://www.youtube.com/@GeraldyLouis"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Watch on YouTube"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 text-black flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
              <Play className="w-8 h-8 md:w-10 md:h-10 fill-current translate-x-0.5" />
            </div>
          </a>
        </div>
      </section>

      {/* Video Work Gallery */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {videoWorks.map((work, idx) => (
            <div
              key={idx}
              className="bg-white/60 backdrop-blur-sm border border-black/5 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between hover:bg-white transition-all duration-300 hover:shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-500 uppercase tracking-widest mb-3">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Film className="w-3.5 h-3.5" />
                    {work.category}
                  </span>
                  <span>{work.duration}</span>
                </div>

                <h2 className="font-heading font-bold text-2xl uppercase tracking-tight text-neutral-900 mb-3">
                  {work.title}
                </h2>

                <p className="text-neutral-600 text-sm leading-relaxed font-sans mb-6">
                  {work.description}
                </p>
              </div>

              <a
                href="https://www.youtube.com/@GeraldyLouis"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black hover:text-neutral-600 transition-colors"
              >
                <span>Watch on YouTube</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Contact */}
      <ContactSection />
    </main>
  );
}
