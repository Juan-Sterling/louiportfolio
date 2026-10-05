'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Play,
  Layers,
} from 'lucide-react';
import {
  portfolioItems,
  CATEGORIES,
  MainCategory,
  MediaItem,
} from '@/data/portfolioData';
import MediaLightbox from './MediaLightbox';

type CategoryFilter = 'all' | MainCategory;

export default function ModernGallery() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Available subcategories for currently active category
  const currentSubcategories = useMemo(() => {
    if (activeCategory === 'all') return [];
    const catGroup = CATEGORIES.find((c) => c.key === activeCategory);
    return catGroup ? catGroup.subcategories : [];
  }, [activeCategory]);

  // Handle switching main category
  const handleSelectCategory = (catKey: CategoryFilter) => {
    setActiveCategory(catKey);
    setActiveSubcategory('all'); // Reset subcategory filter when switching main category
  };

  // Filter items based on activeCategory and activeSubcategory
  const filteredItems = useMemo(() => {
    let items: MediaItem[] = portfolioItems;

    if (activeCategory !== 'all') {
      items = items.filter((item) => item.category === activeCategory);
    }

    if (activeSubcategory !== 'all') {
      items = items.filter((item) => item.subcategory === activeSubcategory);
    }

    return items;
  }, [activeCategory, activeSubcategory]);

  // Active headline title for the Masthead (Option 1)
  const activeTitle = useMemo(() => {
    if (activeCategory === 'all') return 'SELECTED WORKS';
    if (activeSubcategory !== 'all') {
      const sub = currentSubcategories.find((s) => s.key === activeSubcategory);
      if (sub) return sub.label;
    }
    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    return cat ? cat.label : 'SELECTED WORKS';
  }, [activeCategory, activeSubcategory, currentSubcategories]);

  // Active tagline/description matching Canva's category subtitles
  const activeDescription = useMemo(() => {
    if (activeCategory === 'all') {
      return 'A CURATED SELECTION ACROSS PHOTOGRAPHY, VIDEOGRAPHY, GRAPHIC DESIGN & APPAREL';
    }
    const catGroup = CATEGORIES.find((c) => c.key === activeCategory);
    if (!catGroup) return '';

    if (activeSubcategory !== 'all') {
      const sub = catGroup.subcategories.find((s) => s.key === activeSubcategory);
      return sub ? (sub.description ?? '') : '';
    }

    return catGroup.description;
  }, [activeCategory, activeSubcategory]);

  const openLightbox = (index: number) => {
    setActiveMediaIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section id="work" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-28 md:pb-36">
      {/* Category Navigation Bar */}
      <div className="flex flex-col gap-6 mb-10 pb-6 border-b border-black/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500 block mb-1">
              PORTFOLIO SHOWCASE
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl uppercase tracking-tight text-neutral-900">
              SELECTED WORKS
            </h2>
          </div>

          {/* Primary Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-300 ${activeCategory === 'all'
                ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                }`}
            >
              <span>All Works</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-neutral-600'
                  }`}
              >
                {portfolioItems.length}
              </span>
            </button>

            {CATEGORIES.map((cat) => {
              const count = portfolioItems.filter((i) => i.category === cat.key).length;
              const isActive = activeCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  onClick={() => handleSelectCategory(cat.key)}
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-300 ${isActive
                    ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                    : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                    }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-neutral-600'
                      }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategory Pills Row (rendered when a category is selected) */}
        {currentSubcategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-fadeIn">
            <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-600 flex items-center gap-1.5 mr-2">
              <Layers className="w-3 h-3 text-neutral-600" />
            </span>

            {/* All in Category button */}
            <button
              onClick={() => setActiveSubcategory('all')}
              className={`text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${activeSubcategory === 'all'
                ? 'bg-black text-white font-semibold shadow-sm'
                : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
                }`}
            >
              All {CATEGORIES.find((c) => c.key === activeCategory)?.label}
            </button>

            {/* Subcategory buttons */}
            {currentSubcategories.map((sub) => {
              const subCount = portfolioItems.filter(
                (i) => i.category === activeCategory && i.subcategory === sub.key
              ).length;
              const isSubActive = activeSubcategory === sub.key;

              return (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubcategory(sub.key)}
                  className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${isSubActive
                    ? 'bg-black text-white font-semibold shadow-sm'
                    : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
                    }`}
                >
                  <span>{sub.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded-full ${isSubActive ? 'bg-white/20 text-white' : 'bg-black/10 text-neutral-600'
                      }`}
                  >
                    {subCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Visual-First Gallery: True Masonry Columns Layout */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7 [column-fill:_balance]">
        {/* Unboxed Editorial Statement (Option 4: In-grid typography without card container) */}
        {activeCategory !== 'all' && (
          <div className="break-inside-avoid mb-8 md:mb-10 py-3 md:py-4 px-1 select-none flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                {activeSubcategory !== 'all'
                  ? `${CATEGORIES.find((c) => c.key === activeCategory)?.label} - ${activeTitle}`
                  : `ALL ${CATEGORIES.find((c) => c.key === activeCategory)?.label}`}
              </span>
            </div>

            <h3 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-neutral-900 leading-[1.08] mb-3">
              {activeTitle}
            </h3>

            {activeDescription && (
              <p className="text-xs sm:text-sm font-sans uppercase tracking-[0.15em] text-neutral-600 leading-relaxed font-medium max-w-md">
                {activeDescription}
              </p>
            )}

          </div>
        )}
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => openLightbox(idx)}
            className="break-inside-avoid mb-6 md:mb-7 group relative cursor-pointer overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-200 shadow-[0_6px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 isolate"
          >
            {/* Aspect container */}
            <div className={`relative w-full ${item.aspect} overflow-hidden`}>
              <Image
                src={item.image}
                alt={item.subcategoryLabel}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
              />

              {/* Clean Subtle Gradient for Contrast on Tag */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-40 group-hover:opacity-60 transition-opacity duration-300" />

              {/* Central Video Play Indicator for video items */}
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl backdrop-blur-md transition-all duration-300 transform scale-95 group-hover:scale-110 group-hover:bg-white">
                    <Play className="w-6 h-6 md:w-7 md:h-7 fill-current translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Bottom Tag: Category & Subcategory ONLY */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-white/95 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm">
                  {item.subcategoryLabel}
                </span>

                {item.type === 'video' && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Video
                  </span>
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
