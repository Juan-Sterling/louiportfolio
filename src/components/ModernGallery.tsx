'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import GalleryCard from './GalleryCard';

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
 * Fast deterministic pseudo-random generator (Mulberry32)
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Distributes gallery items across 3 masonry columns so that:
 * 1. The NEWEST item is ALWAYS placed at the top-left (Bucket 0, index 0).
 * 2. If multiple new items share the same subcategory, subsequent ones are sent
 *    to other columns (Bucket 1 or 2) so they don't clump on the left.
 * 3. Videos and photos are evenly balanced across all 3 columns.
 * 4. Subcategories are distributed evenly across columns and interleaved within columns.
 * 5. Uses a deterministic PRNG based on item IDs so results are stable across renders.
 */
function distributeGalleryItemsBalanced(items: MediaItem[]): MediaItem[] {
  if (!items || items.length <= 1) return items;

  const total = items.length;
  const numCols = 3;
  const chunkSizes = [
    Math.ceil(total / numCols),
    Math.ceil((total - Math.ceil(total / numCols)) / 2),
    total - Math.ceil(total / numCols) - Math.ceil((total - Math.ceil(total / numCols)) / 2),
  ];

  const newestItem = items[0];
  const remaining = items.slice(1);

  // Deterministic PRNG seeded by item IDs for smooth stable rendering
  const seed = hashString(items.map((i) => i.id).join('-'));
  const random = mulberry32(seed);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const buckets: MediaItem[][] = [[], [], []];

  // Bucket 0 (Left Column) ALWAYS gets the newest item first!
  buckets[0].push(newestItem);

  const newestSubcat = newestItem.subcategory;
  const sameSubcatItems: MediaItem[] = [];
  const otherVideos: MediaItem[] = [];
  const otherPhotos: MediaItem[] = [];

  for (const item of remaining) {
    if (newestSubcat && item.subcategory === newestSubcat) {
      sameSubcatItems.push(item);
    } else if (item.type === 'video') {
      otherVideos.push(item);
    } else {
      otherPhotos.push(item);
    }
  }

  const shuffledSameSub = shuffle(sameSubcatItems);
  const shuffledVideos = shuffle(otherVideos);
  const shuffledPhotos = shuffle(otherPhotos);

  // 1. Same-subcategory items go to Bucket 1 (middle) and Bucket 2 (right) first
  for (const item of shuffledSameSub) {
    const targetBucket =
      buckets[1].length < chunkSizes[1]
        ? 1
        : buckets[2].length < chunkSizes[2]
          ? 2
          : 0;
    buckets[targetBucket].push(item);
  }

  // 2. Distribute videos across columns round-robin so videos don't clump on one side
  let videoBucketIdx = newestItem.type === 'video' ? 1 : 0;
  for (const video of shuffledVideos) {
    let bestBucket = -1;
    let minVideos = Infinity;

    for (let i = 0; i < numCols; i++) {
      const bIdx = (videoBucketIdx + i) % numCols;
      if (buckets[bIdx].length < chunkSizes[bIdx]) {
        const vCount = buckets[bIdx].filter((x) => x.type === 'video').length;
        if (vCount < minVideos) {
          minVideos = vCount;
          bestBucket = bIdx;
        }
      }
    }

    if (bestBucket !== -1) {
      buckets[bestBucket].push(video);
      videoBucketIdx = (bestBucket + 1) % numCols;
    } else {
      const shortest = buckets.reduce(
        (min, b, idx) => (b.length < buckets[min].length ? idx : min),
        0
      );
      buckets[shortest].push(video);
    }
  }

  // 3. Distribute other photos to fill remaining space, spreading subcategories
  const photosBySubcat: Record<string, MediaItem[]> = {};
  for (const p of shuffledPhotos) {
    const sub = p.subcategory || 'default';
    if (!photosBySubcat[sub]) photosBySubcat[sub] = [];
    photosBySubcat[sub].push(p);
  }

  const subcatKeys = Object.keys(photosBySubcat);
  while (Object.values(photosBySubcat).some((arr) => arr.length > 0)) {
    for (const key of subcatKeys) {
      const arr = photosBySubcat[key];
      if (arr && arr.length > 0) {
        const photo = arr.pop()!;
        let bestBucket = -1;
        let minSameSub = Infinity;

        for (let b = 0; b < numCols; b++) {
          if (buckets[b].length < chunkSizes[b]) {
            const sameSubCount = buckets[b].filter((x) => x.subcategory === key).length;
            if (sameSubCount < minSameSub) {
              minSameSub = sameSubCount;
              bestBucket = b;
            }
          }
        }

        if (bestBucket === -1) {
          bestBucket = buckets.reduce(
            (min, b, idx) => (b.length < buckets[min].length ? idx : min),
            0
          );
        }
        buckets[bestBucket].push(photo);
      }
    }
  }

  // 4. Inside each bucket, interleave photos and videos
  for (let b = 0; b < numCols; b++) {
    const isFirstBucket = b === 0;
    const bucketItems = isFirstBucket ? buckets[b].slice(1) : buckets[b];

    const vids = bucketItems.filter((x) => x.type === 'video');
    const phots = bucketItems.filter((x) => x.type !== 'video');
    const interleaved: MediaItem[] = [];

    let vI = 0;
    let pI = 0;
    while (vI < vids.length || pI < phots.length) {
      if (phots[pI]) interleaved.push(phots[pI++]);
      if (phots[pI]) interleaved.push(phots[pI++]);
      if (vids[vI]) interleaved.push(vids[vI++]);
    }

    buckets[b] = isFirstBucket ? [newestItem, ...interleaved] : interleaved;
  }

  return buckets.flat();
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
  const [isArrangingLayout, setIsArrangingLayout] = useState<boolean>(true);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [isInitialEntrance, setIsInitialEntrance] = useState<boolean>(true);
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

  // Preload top visible thumbnails and arrange layout stably before revealing
  useEffect(() => {
    setHasMounted(true);

    if (items.length === 0) {
      setIsArrangingLayout(false);
      return;
    }

    // Preload top visible thumbnails so the browser decodes dimensions before reveal
    const topThumbnails = items.slice(0, 9).map((i) => i.image).filter(Boolean);
    let loadedCount = 0;
    const totalToPreload = topThumbnails.length;

    const finishLoading = () => {
      // Small buffer (180ms) for DOM layout to balance peacefully in background
      setTimeout(() => {
        setIsArrangingLayout(false);
      }, 180);
    };

    if (totalToPreload === 0) {
      finishLoading();
      return;
    }

    // Safety timeout: maximum 900ms loading state so visitor never waits too long
    const safetyTimer = setTimeout(() => {
      setIsArrangingLayout(false);
    }, 900);

    topThumbnails.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount >= totalToPreload) {
          clearTimeout(safetyTimer);
          finishLoading();
        }
      };
    });

    const timer = setTimeout(() => {
      setIsInitialEntrance(false);
    }, 2400);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(timer);
    };
  }, [items]);

  useEffect(() => {
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
              subcategoryLabel: d.subcategories?.label || 'Portfolio',
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
    setIsInitialEntrance(false);
    setActiveCategory(catId);
    setActiveSubcategory('all'); // Reset subcategory filter when switching main category
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination count
  };

  // Handle switching subcategory
  const handleSelectSubcategory = (subId: string) => {
    setIsInitialEntrance(false);
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

    // Smart Balanced Distribution:
    // Newest work is always at top-left, while remaining works are pseudo-randomly
    // distributed across columns so videos, photos, and subcategories never clump!
    return distributeGalleryItemsBalanced(result);
  }, [items, activeCategory, activeSubcategory, activeCategoryObj, currentSubcategories]);



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


  const openLightbox = useCallback((index: number) => {
    setActiveMediaIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const navigateLightbox = useCallback((idx: number) => {
    setActiveMediaIndex(idx);
  }, []);

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
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-300 ${activeCategory === 'all'
                    ? 'bg-neutral-900 text-[#edeced] shadow-md scale-105'
                    : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-black border border-black/5 hover:border-black/15'
                  }`}
              >
                <span>All Works</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeCategory === 'all'
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
              className={`text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${activeSubcategory === 'all'
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
                  className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${isSubActive
                      ? 'bg-black text-white font-semibold shadow-sm'
                      : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
                    }`}
                >
                  <span>{sub.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded-full ${isSubActive
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
      {/* LOADING STATE (MINIMAL LUXURY ANIMATION)            */}
      {/* ==================================================== */}
      {isLoading || isArrangingLayout ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Central Luxury Animated Brand Loader */}
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Outer circular track */}
              <div className="absolute inset-0 rounded-full border-2 border-black/10" />
              {/* Spinning gradient arc */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neutral-900 border-r-neutral-900/40 animate-spin" />
              {/* Brand Lettermark */}
              <span className="font-heading font-black text-sm text-neutral-900 select-none">
                L
              </span>
            </div>

            {/* Subtle Bouncing Wave Dots */}
            <div className="flex items-center gap-1.5 pt-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-neutral-900/60 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-neutral-900/60 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-neutral-900/60 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>

          {/* Clean Shimmering Masonry Skeleton */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7 [column-fill:_balance]">
            {[
              'aspect-[4/5]',
              'aspect-[16/9]',
              'aspect-[1/1]',
              'aspect-[3/4]',
              'aspect-[16/9]',
              'aspect-[4/5]',
            ].map((aspectRatio, idx) => (
              <div
                key={idx}
                className="break-inside-avoid mb-6 md:mb-7 overflow-hidden rounded-[24px] md:rounded-[30px] bg-black/[0.04] relative shadow-sm"
              >
                <div
                  className={`w-full ${aspectRatio} bg-gradient-to-tr from-black/[0.03] via-black/[0.07] to-black/[0.03] animate-pulse`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* GALLERY GRID LAYOUT */
        /* ==================================================== */
        <div className="animate-fadeIn">
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
                className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7 [column-fill:_balance]"
              >
                {/* Unboxed Editorial Statement sitting at the top of Column 1 */}
                {activeCategory !== 'all' && (
                  <div
                    className="break-inside-avoid mb-6 md:mb-7 py-3 md:py-4 px-1 select-none flex flex-col justify-center animate-entrance-card"
                    style={{
                      animationDelay: `${isInitialEntrance ? 650 : 40}ms`,
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

                {displayedItems.map((item, idx) => {
                  const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);

                  return (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      fullIndex={fullIndex}
                      hasMounted={hasMounted}
                      isInitialEntrance={isInitialEntrance}
                      onOpenLightbox={openLightbox}
                    />
                  );
                })}
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
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    </section>
  );
}
