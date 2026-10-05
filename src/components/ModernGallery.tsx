'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Play,
  Maximize2,
  Camera,
  Film,
  ArrowUpRight,
} from 'lucide-react';
import { portfolioItems } from '@/data/portfolioData';
import MediaLightbox from './MediaLightbox';

type CategoryFilter = 'all' | 'photography' | 'videography' | 'graphic-design' | 'loui-tee';

interface FilterOption {
  key: CategoryFilter;
  label: string;
}

const filterOptions: FilterOption[] = [
  { key: 'all', label: 'All Works' },
  { key: 'photography', label: 'Photography' },
  { key: 'videography', label: 'Videography' },
  { key: 'graphic-design', label: 'Graphic Design' },
  { key: 'loui-tee', label: 'Loui Tee' },
];

export default function ModernGallery() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Filter items without page reload
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return portfolioItems;
    return portfolioItems.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const openLightbox = (index: number) => {
    setActiveMediaIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section id="work" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-28 md:pb-36">
      {/* Category Filter Tabs Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10 pb-6 border-b border-black/10">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1">
            EXPLORE PORTFOLIO
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl uppercase tracking-tight text-neutral-900">
            SELECTED WORKS
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((opt) => {
            const count =
              opt.key === 'all'
                ? portfolioItems.length
                : portfolioItems.filter((i) => i.category === opt.key).length;

            const isActive = activeCategory === opt.key;

            return (
              <button
                key={opt.key}
                onClick={() => setActiveCategory(opt.key)}
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                    : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-neutral-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modern Visual-First Masonry / Multi-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => openLightbox(idx)}
            className="group relative cursor-pointer overflow-hidden rounded-[28px] md:rounded-[36px] bg-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.16)] transition-all duration-500"
          >
            {/* Aspect container */}
            <div className={`relative w-full ${item.aspect} overflow-hidden`}>
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
              />

              {/* Ambient overlay gradient for clean hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 opacity-40 group-hover:opacity-85 transition-opacity duration-300" />

              {/* Top Floating Badge (Category & Media Type Indicator) */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  {item.type === 'video' ? (
                    <Film className="w-3 h-3 text-amber-300" />
                  ) : (
                    <Camera className="w-3 h-3 text-blue-300" />
                  )}
                  <span>{item.categoryLabel}</span>
                </span>

                {/* Video Duration or Expand pill */}
                {item.type === 'video' ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-white/90 bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 backdrop-blur-md px-2.5 py-1 rounded-full">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{item.duration || 'Watch'}</span>
                  </span>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/15 hover:bg-white text-white hover:text-black flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Central Video Teaser Hover Pulse for Video items */}
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-500 transform scale-90 opacity-80 group-hover:scale-110 group-hover:opacity-100 group-hover:bg-white">
                    <Play className="w-7 h-7 md:w-8 md:h-8 fill-current translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Bottom Info Card: Elegant, clean, non-intrusive */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex flex-col justify-end text-white z-10 transition-transform duration-300 transform translate-y-1 group-hover:translate-y-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-300">
                    {item.client || item.categoryLabel}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">{item.year}</span>
                </div>

                <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight text-white leading-tight">
                  {item.title}
                </h3>

                <p className="text-xs text-neutral-300/90 font-sans mt-1 line-clamp-1">
                  {item.subtitle}
                </p>

                {/* Specs metadata tag */}
                {item.specs && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-300 font-mono">
                    <span className="truncate max-w-[80%]">{item.specs}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal Provider */}
      <MediaLightbox
        items={filteredItems}
        currentIndex={activeMediaIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setActiveMediaIndex(idx)}
      />
    </section>
  );
}
