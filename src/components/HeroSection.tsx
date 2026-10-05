'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowDown, Camera, Film, Sparkles, MapPin } from 'lucide-react';

export default function HeroSection() {
  const scrollToWork = () => {
    const el = document.getElementById('work');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative w-full max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-14 md:pb-20 select-none"
    >
      {/* Top Header Identity Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-10 border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative">
            <Image
              src="/images/loui-logo.png"
              alt="LOUI"
              fill
              priority
              sizes="48px"
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl uppercase tracking-tight text-neutral-900 leading-none">
              LOUI
            </h2>
            <p className="text-xs text-neutral-500 font-sans tracking-wide mt-1">
              Visual Storyteller & Cinematographer
            </p>
          </div>
        </div>

        {/* Location & Status pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 border border-black/10 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Available for Bookings</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-600 font-medium font-sans">
            <MapPin className="w-3.5 h-3.5 text-neutral-500" />
            <span>Bandung, Indonesia</span>
          </div>
        </div>
      </div>

      {/* Main Punchy Hero Headline */}
      <div className="pt-12 md:pt-16 pb-8 max-w-4xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 mb-4 bg-neutral-200/70 px-3.5 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PORTFOLIO // 2025</span>
        </span>

        <h1 className="font-heading font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl uppercase tracking-[-0.03em] text-neutral-900 leading-[0.92] mb-6">
          CAPTURING REAL HUMAN MOMENTS & CINEMATIC MOTION.
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-neutral-700 leading-relaxed font-sans max-w-2xl">
          A visual portfolio focused on documentary portraiture, cinematic narrative directing, and creative visual identities based in Bandung, West Java.
        </p>

        {/* Focus Tags & Action Button */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={scrollToWork}
            className="flex items-center gap-2 bg-neutral-900 text-[#edeced] hover:bg-black font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
          >
            <span>Explore Works</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600 font-sans">
            <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
              <Camera className="w-3 h-3 text-neutral-500" />
              <span>Photography</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
              <Film className="w-3 h-3 text-neutral-500" />
              <span>Cinematography</span>
            </span>
            <span className="bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
              Graphic Design
            </span>
            <span className="bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
              Streetwear
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
