'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Play,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
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

interface ModernGalleryProps {
  initialCategories?: GalleryCategory[];
  initialItems?: MediaItem[];
}

export default function ModernGallery({
  initialCategories,
  initialItems,
}: ModernGalleryProps = {}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [items, setItems] = useState<MediaItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : fallbackPortfolioItems
  );
  const [categories, setCategories] = useState<GalleryCategory[]>(
    initialCategories && initialCategories.length > 0
      ? initialCategories
      : fallbackCategories.map((c) => ({
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

  const ITEMS_PER_PAGE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Sync if server props change
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Fetch live portfolio data from Database if not provided by server
  useEffect(() => {
    setHasMounted(true);

    if (initialItems && initialItems.length > 0) {
      return;
    }

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
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination count
  };

  // Handle switching subcategory
  const handleSelectSubcategory = (subId: string) => {
    setActiveSubcategory(subId);
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination count
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

  // Proactive background preloader for instant lightbox viewing
  useEffect(() => {
    if (typeof window === 'undefined' || filteredItems.length === 0) return;

    const preloadGalleryImages = () => {
      // Preload first 24 gallery items so they are already cached and GPU-decoded in browser memory
      filteredItems.slice(0, 24).forEach((item) => {
        const src =
          item.type === 'video' && item.videoUrl
            ? getYouTubeThumbnail(item.videoUrl)
            : item.image;
        if (src) {
          const img = new window.Image();
          img.src = src;
          if ('decode' in img) {
            img.decode().catch(() => {});
          }
        }
      });
    };

    if ('requestIdleCallback' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = (window as any).requestIdleCallback(preloadGalleryImages, {
        timeout: 2000,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadGalleryImages, 800);
      return () => clearTimeout(timer);
    }
  }, [filteredItems]);

  // Fitur Load More / Show Less disimpan (di-keep), saat ini dinonaktifkan sementara menunggu persetujuan client
  // Cukup ubah nilai ENABLE_LOAD_MORE menjadi true untuk mengaktifkannya kembali di kemudian hari!
  const ENABLE_LOAD_MORE = false;

  // Displayed items slice based on Load More count (atau tampil penuh jika nonaktif)
  const displayedItems = useMemo(() => {
    if (!ENABLE_LOAD_MORE) return filteredItems;
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount, ENABLE_LOAD_MORE]);

  const hasMore = visibleCount < filteredItems.length;
  const remainingCount = Math.max(0, filteredItems.length - visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleShowAll = () => {
    setVisibleCount(filteredItems.length);
  };

  const handleShowLess = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    const workSection = document.getElementById('work');
    if (workSection) {
      workSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

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


  // Responsive columns count for true row-by-row masonry layout
  const [columnsCount, setColumnsCount] = useState<number>(3);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumnsCount(1);
      } else if (width < 1024) {
        setColumnsCount(2);
      } else {
        setColumnsCount(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Distribute items across columns so visual left-to-right reading order matches the array index 100%
  const columnBuckets = useMemo(() => {
    const count = Math.max(1, columnsCount);
    const buckets: { item: MediaItem; originalIndex: number }[][] = Array.from(
      { length: count },
      () => []
    );

    const hasEditorial = activeCategory !== 'all';

    displayedItems.forEach((item, idx) => {
      // If there's an editorial card at col 0, item 0 starts at col 1 (when count > 1)
      const targetCol =
        hasEditorial && count > 1 ? (idx + 1) % count : idx % count;

      buckets[targetCol].push({ item, originalIndex: idx });
    });

    return buckets;
  }, [displayedItems, columnsCount, activeCategory]);

  const openLightbox = (index: number) => {
    setActiveMediaIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section id="work" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-28 md:pb-36">
      {/* Category Navigation Bar */}
      <div className="flex flex-col gap-6 mb-10 pb-6 border-b border-black/10 animate-entrance-nav">
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
              onClick={() => handleSelectSubcategory('all')}
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
                  onClick={() => handleSelectSubcategory(sub.id)}
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
            <>
              <div
                key={`${activeCategory}-${activeSubcategory}`}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 items-start"
              >
                {columnBuckets.map((bucket, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-6 md:gap-7">
                    {/* Unboxed Editorial Statement sitting at the top of Column 0 */}
                    {colIdx === 0 && activeCategory !== 'all' && (
                      <div
                        className="py-3 md:py-4 px-1 select-none flex flex-col justify-center animate-entrance-card"
                        style={{
                          animationDelay: `${hasMounted ? 35 : 360}ms`,
                        }}
                      >
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

                    {bucket.map(({ item, originalIndex }) => {
                      const itemThumbnail =
                        item.type === 'video' && item.videoUrl
                          ? getYouTubeThumbnail(item.videoUrl) || item.image
                          : item.image;

                      const baseDelay = hasMounted ? 35 : 380;
                      const stepDelay = hasMounted ? 35 : 55;
                      const cardDelay = Math.min(originalIndex * stepDelay + baseDelay, hasMounted ? 450 : 950);
                      const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);

                      return (
                        <div
                          key={item.id}
                          className="animate-entrance-card"
                          style={{
                            animationDelay: `${cardDelay}ms`,
                          }}
                        >
                          <div
                            onClick={() => openLightbox(fullIndex !== -1 ? fullIndex : originalIndex)}
                            onMouseEnter={() => {
                              const currentIdx = fullIndex !== -1 ? fullIndex : originalIndex;
                              const nextIdx = (currentIdx + 1) % filteredItems.length;
                              const prevIdx = (currentIdx - 1 + filteredItems.length) % filteredItems.length;

                              [filteredItems[currentIdx], filteredItems[nextIdx], filteredItems[prevIdx]].forEach(
                                (it) => {
                                  if (it?.image) {
                                    const img = new window.Image();
                                    img.src = it.image;
                                  }
                                }
                              );
                            }}
                            className="group relative cursor-pointer overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-200 shadow-[0_6px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 isolate"
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
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            {/* 
              ========================================================================
              LOAD MORE / SHOW LESS CONTROLLER (DI-KEEP / SEMENTARA NONAKTIF)
              Untuk mengaktifkan kembali, ubah konstanta ENABLE_LOAD_MORE = true di atas
              ========================================================================
            */}
            {ENABLE_LOAD_MORE && filteredItems.length > ITEMS_PER_PAGE && (
              <div className="mt-14 md:mt-20 flex flex-col items-center justify-center gap-3.5 text-center">
                {hasMore ? (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {/* Primary Load More Button */}
                    <button
                      onClick={handleLoadMore}
                      className="group flex items-center gap-3 px-8 py-4 rounded-full bg-neutral-900 text-[#edeced] font-sans text-xs font-semibold uppercase tracking-[0.18em] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.22)] hover:bg-black transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span>Load More Works</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono tracking-normal text-white group-hover:bg-white/30 transition-colors">
                        +{Math.min(ITEMS_PER_PAGE, remainingCount)}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white transition-transform group-hover:translate-y-0.5" />
                    </button>

                    {/* Quick Show All Button if remaining is more than 6 */}
                    {remainingCount > 6 && (
                      <button
                        onClick={handleShowAll}
                        className="px-5 py-3.5 rounded-full bg-transparent hover:bg-black/5 text-neutral-700 hover:text-black font-sans text-xs font-semibold uppercase tracking-wider transition-colors border border-black/10"
                      >
                        Show All ({filteredItems.length})
                      </button>
                    )}

                    {/* Show Less Button (if currently expanded beyond initial batch) */}
                    {visibleCount > ITEMS_PER_PAGE && (
                      <button
                        onClick={handleShowLess}
                        className="group flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/80 hover:bg-white text-neutral-800 hover:text-black font-sans text-xs font-semibold uppercase tracking-wider transition-all duration-200 border border-black/10 shadow-sm hover:shadow active:scale-95"
                      >
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-500 group-hover:text-black transition-transform group-hover:-translate-y-0.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {/* Status indicator when all items are loaded */}
                    <div className="flex items-center gap-3 py-3 px-5 rounded-full bg-black/5 text-xs font-mono uppercase tracking-widest text-neutral-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      <span>All {filteredItems.length} Works Displayed</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    </div>

                    {/* Show Less Button */}
                    {visibleCount > ITEMS_PER_PAGE && (
                      <button
                        onClick={handleShowLess}
                        className="group flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 hover:bg-black text-[#edeced] font-sans text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-md hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Progress Counter */}
                <p className="text-[11px] font-mono tracking-wider text-neutral-500 uppercase">
                  Showing {displayedItems.length} of {filteredItems.length} projects
                </p>
              </div>
            )}
          </>
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
