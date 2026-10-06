'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  portfolioItems as fallbackPortfolioItems,
  CATEGORIES as fallbackCategories,
  MediaItem,
  getYouTubeThumbnail,
} from '@/data/portfolioData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import MediaLightbox from './MediaLightbox';

export interface GalleryCategory {
  id: string;
  label: string;
  description: string;
  subcategories: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}


/**
 * Cara 2: Interleave media items (photos and videos) so that videos are evenly
 * distributed throughout the list instead of clumping at the bottom or sides.
 */
function interleaveMediaItems(items: MediaItem[]): MediaItem[] {
  const videos = items.filter((i) => i.type === 'video');
  const photos = items.filter((i) => i.type !== 'video');

  // If no videos or no photos, keep original order
  if (videos.length === 0 || photos.length === 0) {
    return items;
  }

  const result: MediaItem[] = [];
  const total = items.length;
  const numVideos = videos.length;
  const step = total / numVideos;

  let vIdx = 0;
  let pIdx = 0;

  for (let i = 0; i < total; i++) {
    const isVideoSlot =
      vIdx < numVideos &&
      (pIdx >= photos.length || i >= Math.round((vIdx + 0.5) * step));

    if (isVideoSlot) {
      result.push(videos[vIdx++]);
    } else if (pIdx < photos.length) {
      result.push(photos[pIdx++]);
    } else if (vIdx < numVideos) {
      result.push(videos[vIdx++]);
    }
  }

  return result;
}

export default function ModernGallery() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<MediaItem[]>(fallbackPortfolioItems);
  const [categories, setCategories] = useState<GalleryCategory[]>(
    fallbackCategories.map((c) => ({
      id: c.key,
      label: c.label,
      description: c.description,
      subcategories: c.subcategories.map((s) => ({
        id: s.key,
        label: s.label,
        description: s.description,
      })),
    }))
  );

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Fetch live portfolio data from Database
  useEffect(() => {
    async function fetchDatabaseData() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Fetch Categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        // 2. Fetch Subcategories
        const { data: subData } = await supabase
          .from('subcategories')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        // 3. Fetch Published Contents
        const { data: contentData } = await supabase
          .from('contents')
          .select(`
            id,
            title,
            description,
            subcategory_id,
            image_url,
            type,
            video_url,
            status,
            created_at,
            subcategories:subcategory_id (
              id,
              label,
              category_id,
              categories:category_id (
                id,
                label
              )
            )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        // Map categories & subcategories
        if (catData && catData.length > 0) {
          const structuredCats: GalleryCategory[] = catData.map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description || '',
            subcategories: (subData || [])
              .filter((s) => s.category_id === c.id)
              .map((s) => ({
                id: s.id,
                label: s.label,
                description: s.description || '',
              })),
          }));
          setCategories(structuredCats);
        }

        // Map contents into MediaItem format
        if (contentData && contentData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedItems: MediaItem[] = contentData.map((d: any) => {
            const fallback = fallbackPortfolioItems.find(
              (f) => f.id === d.id || f.image === d.image_url
            );
            return {
              id: d.id,
              category: (d.subcategories?.categories?.id || 'photography') as any,
              categoryLabel: d.subcategories?.categories?.label || 'Portfolio',
              subcategory: d.subcategories?.id || d.subcategory_id,
              subcategoryLabel: d.subcategories?.label || d.title,
              description: d.description || '',
              type: (d.type || 'photo') as 'photo' | 'video',
              image: d.image_url,
              videoUrl: d.video_url || undefined,
              aspect: fallback?.aspect || undefined,
            };
          });
          setItems(mappedItems);
        }
      } catch (err) {
        console.warn('Database fetch notice:', err);
      } finally {
        // Subtle delay for smooth visual transition
        setTimeout(() => {
          setIsLoading(false);
        }, 400);
      }
    }

    fetchDatabaseData();
  }, []);

  // Currently active Category Object
  const activeCategoryObj = useMemo(() => {
    if (activeCategory === 'all') return null;
    return categories.find((c) => c.id === activeCategory) || null;
  }, [activeCategory, categories]);

  // Available subcategories for currently active category
  const currentSubcategories = useMemo(() => {
    return activeCategoryObj ? activeCategoryObj.subcategories : [];
  }, [activeCategoryObj]);

  // Handle switching main category
  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setActiveSubcategory('all'); // Reset subcategory filter when switching main category
  };


  // Filter items based on activeCategory and activeSubcategory
  const filteredItems = useMemo(() => {
    let result: MediaItem[] = items;

    if (activeCategory !== 'all') {
      result = result.filter(
        (item) =>
          item.category === activeCategory ||
          (activeCategoryObj && item.categoryLabel === activeCategoryObj.label)
      );
    }

    if (activeSubcategory !== 'all') {
      result = result.filter(
        (item) =>
          item.subcategory === activeSubcategory ||
          item.subcategoryLabel ===
            currentSubcategories.find((s) => s.id === activeSubcategory)?.label
      );
    }

    // Cara 2: Smart Interleaving - mix video and photo items evenly across the gallery
    if (activeCategory === 'all') {
      result = interleaveMediaItems(result);
    }

    return result;
  }, [items, activeCategory, activeSubcategory, activeCategoryObj, currentSubcategories]);

  // Active headline title for the Masthead
  const activeTitle = useMemo(() => {
    if (activeCategory === 'all') return 'SELECTED WORKS';
    if (activeSubcategory !== 'all') {
      const sub = currentSubcategories.find((s) => s.id === activeSubcategory);
      if (sub) return sub.label;
    }
    return activeCategoryObj ? activeCategoryObj.label : 'SELECTED WORKS';
  }, [activeCategory, activeSubcategory, activeCategoryObj, currentSubcategories]);

  // Active tagline/description
  const activeDescription = useMemo(() => {
    if (activeCategory === 'all') {
      return 'A CURATED SELECTION ACROSS PHOTOGRAPHY, VIDEOGRAPHY, GRAPHIC DESIGN & APPAREL';
    }
    if (!activeCategoryObj) return '';

    if (activeSubcategory !== 'all') {
      const sub = currentSubcategories.find((s) => s.id === activeSubcategory);
      return sub ? sub.description : '';
    }

    return activeCategoryObj.description;
  }, [activeCategory, activeCategoryObj, activeSubcategory, currentSubcategories]);


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
          {isLoading ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-10 w-24 rounded-full bg-neutral-300/60 animate-pulse" />
              <div className="h-10 w-28 rounded-full bg-neutral-300/40 animate-pulse" />
              <div className="h-10 w-32 rounded-full bg-neutral-300/40 animate-pulse" />
              <div className="h-10 w-28 rounded-full bg-neutral-300/40 animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSelectCategory('all')}
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-300 ${
                  activeCategory === 'all'
                    ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                    : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                }`}
              >
                <span>All Works</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeCategory === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 text-neutral-600'
                  }`}
                >
                  {items.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = items.filter(
                  (i) => i.category === cat.id || i.categoryLabel === cat.label
                ).length;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                        : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                    }`}
                  >
                    <span>{cat.label}</span>
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
          )}
        </div>

        {/* Subcategory Pills Row (rendered when a category is selected) */}
        {!isLoading && currentSubcategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-fadeIn">
            <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-600 flex items-center gap-1.5 mr-2">
              <Layers className="w-3 h-3 text-neutral-600" />
            </span>

            {/* All in Category button */}
            <button
              onClick={() => setActiveSubcategory('all')}
              className={`text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                activeSubcategory === 'all'
                  ? 'bg-black text-white font-semibold shadow-sm'
                  : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
              }`}
            >
              All {activeCategoryObj?.label}
            </button>

            {/* Subcategory buttons */}
            {currentSubcategories.map((sub) => {
              const subCount = items.filter(
                (i) =>
                  (i.category === activeCategory ||
                    (activeCategoryObj && i.categoryLabel === activeCategoryObj.label)) &&
                  (i.subcategory === sub.id || i.subcategoryLabel === sub.label)
              ).length;
              const isSubActive = activeSubcategory === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubcategory(sub.id)}
                  className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    isSubActive
                      ? 'bg-black text-white font-semibold shadow-sm'
                      : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
                  }`}
                >
                  <span>{sub.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded-full ${
                      isSubActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/10 text-neutral-600'
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

      {/* ==================================================== */}
      {/* LOADING STATE SKELETON */}
      {/* ==================================================== */}
      {isLoading ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Subtle Loading Notification Badge */}
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-black/5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-neutral-900 animate-ping" />
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-700 font-medium">
                Loading Portfolio Works...
              </span>
            </div>
          </div>

          {/* Masonry Columns Skeleton */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7 [column-fill:_balance]">
            {[
              'aspect-[16/9]',
              'aspect-[4/5]',
              'aspect-[1/1]',
              'aspect-[3/4]',
              'aspect-[16/9]',
              'aspect-[4/5]',
            ].map((aspectRatio, idx) => (
              <div
                key={idx}
                className="break-inside-avoid mb-6 md:mb-7 overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-300/40 relative shadow-sm"
              >
                <div
                  className={`relative w-full ${aspectRatio} bg-gradient-to-r from-neutral-300/40 via-neutral-200/70 to-neutral-300/40 animate-pulse flex flex-col justify-end p-5`}
                >
                  <div className="h-6 w-1/2 rounded-full bg-neutral-400/25 mb-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* GALLERY GRID LAYOUT */
        /* ==================================================== */
        <div>
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              {activeCategory !== 'all' && (
                <div className="mb-8 md:mb-10 py-3 md:py-4 px-1 select-none flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                      {activeSubcategory !== 'all'
                        ? `${activeCategoryObj?.label} - ${activeTitle}`
                        : `ALL ${activeCategoryObj?.label}`}
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
              <p className="text-sm text-neutral-500 font-mono uppercase tracking-wider">
                No works found in this category.
              </p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7 [column-fill:_balance]">
              {/* Unboxed Editorial Statement sitting at the top of Column 1 */}
              {activeCategory !== 'all' && (
                <div className="break-inside-avoid mb-6 md:mb-7 py-3 md:py-4 px-1 select-none flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                      {activeSubcategory !== 'all'
                        ? `${activeCategoryObj?.label} - ${activeTitle}`
                        : `ALL ${activeCategoryObj?.label}`}
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

              {filteredItems.map((item, idx) => {
                const itemThumbnail =
                  item.type === 'video' && item.videoUrl
                    ? getYouTubeThumbnail(item.videoUrl) || item.image
                    : item.image;

                return (
                  <div
                    key={item.id}
                    onClick={() => openLightbox(idx)}
                    className="break-inside-avoid mb-6 md:mb-7 group relative cursor-pointer overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-200 shadow-[0_6px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 isolate"
                  >
                    {/* Media Container: Natural Aspect Ratio for both Photos & Videos */}
                    <div className="relative w-full overflow-hidden">
                      <Image
                        src={itemThumbnail}
                        alt={item.subcategoryLabel}
                        width={1200}
                        height={1200}
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-auto block object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                      />

                      {/* Clean Subtle Gradient for Contrast on Tag */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

                      {/* Central Video Play Indicator for video items */}
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl backdrop-blur-md transition-all duration-300 transform scale-95 group-hover:scale-110 group-hover:bg-white">
                            <Play className="w-6 h-6 md:w-7 md:h-7 fill-current translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Bottom-Left Tag: Subcategory Only */}
                      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-white/95 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm inline-block">
                          {item.subcategoryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
