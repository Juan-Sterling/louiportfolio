'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Play,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MediaItem,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from '@/data/portfolioData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { resolveVideoPlayUrl } from '@/lib/r2';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import MediaLightbox from './MediaLightbox';
import GalleryCard from './GalleryCard';

export interface GalleryCategory {
  id: string;
  label: string;
  description: string;
  status?: 'published' | 'archived' | 'draft';
  subcategories: Array<{
    id: string;
    label: string;
    description: string;
    status?: 'published' | 'archived' | 'draft';
  }>;
}


export interface DistributedColumns {
  columns: MediaItem[][];
  flatItems: MediaItem[];
}

/**
 * Helper to compute an item's rendered vertical pixel height (including margin gap mb-6/7).
 */
function getItemRenderHeight(item: MediaItem, aspectRatios?: Record<string, number>): number {
  const colWidth = 376;
  const colGap = 28; // mb-6 md:mb-7
  let aspect = 0.8; // Default 4:5 portrait

  if (aspectRatios && aspectRatios[item.id] && aspectRatios[item.id] > 0) {
    aspect = aspectRatios[item.id];
  } else if (item.aspect) {
    const parts = item.aspect.split(/[:/]/);
    if (parts.length === 2) {
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      if (w > 0 && h > 0) aspect = w / h;
    }
  } else if (item.type === 'video') {
    aspect = 0.8;
  }

  // Constrain to reasonable bounds
  aspect = Math.max(0.4, Math.min(4.0, aspect));
  return (colWidth / aspect) + colGap;
}

/**
 * Deterministic pseudo-random score generator based on item ID and seed.
 * Guarantees stable positioning across re-renders to prevent layout jumps/flicker
 * while ensuring works are completely randomized (not FIFO / not chronological).
 */
function getStableRandomScore(id: string, seed: number = 7919): number {
  let h = seed;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Distributes gallery items across 3 masonry columns with balanced vertical height:
 * 1. Works with order_index > 0 are assigned to exact slot positions:
 *    - Slot 1: Column 2 (Center Top)
 *    - Slot 2: Column 3 (Right Top)
 *    - Slot 3: Column 1 (Left, under editorial description)
 *    - Slot 4: Column 2 (Center, below Slot 1)
 *    - Slot 5: Column 3 (Right, below Slot 2)
 *    - Slot 6: Column 1 (Left, below Slot 3)
 *    - and so on (order_index % 3: 1 -> Col 1, 2 -> Col 2, 0 -> Col 0).
 * 2. Unslotted works (order_index === 0) are randomized (acak, no FIFO):
 *    - Works are pseudo-randomly shuffled using a deterministic seed to ensure stability.
 *    - Videos are distributed across columns round-robin / least-videos so they never clump.
 *    - Photos are distributed to balance vertical column height so all columns end cleanly.
 *    - Inside each column, photos and videos are interleaved smoothly.
 * 3. Returns { columns, flatItems } where columns provides the 3 deterministic columns,
 *    and flatItems provides the sequential order for mobile and lightbox.
 */
export function distributeGalleryColumns(
  items: MediaItem[],
  aspectRatios?: Record<string, number>,
  hasDescription: boolean = true,
  randomSeed: number = 7919
): DistributedColumns {
  if (!items || items.length === 0) {
    return { columns: [[], [], []], flatItems: [] };
  }

  const numCols = 3;
  const total = items.length;
  // Column 0 editorial statement description card height (~200px)
  const descHeight = hasDescription ? 200 : 0;
  const columns: MediaItem[][] = [[], [], []];
  const slottedByCol: MediaItem[][] = [[], [], []];
  const colHeights = [descHeight, 0, 0];

  // Slotted items: order_index > 0 sorted by order_index ascending
  const slottedItems = items
    .filter((i) => (i.order_index ?? 0) > 0)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // Map each slotted item to its exact column based on slot index:
  // Slot 1 -> Col 1 (Center Top)
  // Slot 2 -> Col 2 (Right Top)
  // Slot 3 -> Col 0 (Left, under Description)
  // Slot 4 -> Col 1 (Center, below Slot 1)
  // Slot 5 -> Col 2 (Right, below Slot 2)
  // Slot 6 -> Col 0 (Left, below Slot 3)
  // Formula: (order_index % 3): 1 -> Col 1, 2 -> Col 2, 0 -> Col 0
  for (const item of slottedItems) {
    const colIdx = (item.order_index ?? 0) % numCols;
    slottedByCol[colIdx].push(item);
    columns[colIdx].push(item);
    colHeights[colIdx] += getItemRenderHeight(item, aspectRatios);
  }

  // Regular items: order_index === 0, sorted randomly (acak, no FIFO)
  const regularItems = items
    .filter((i) => (i.order_index ?? 0) === 0)
    .sort((a, b) => {
      const scoreA = getStableRandomScore(a.id, randomSeed);
      const scoreB = getStableRandomScore(b.id, randomSeed);
      return scoreA - scoreB;
    });

  const unslottedPool = regularItems;

  // Separate remaining items into videos and photos
  const remainingVideos: MediaItem[] = [];
  const remainingPhotos: MediaItem[] = [];

  for (const item of unslottedPool) {
    if (item.type === 'video') {
      remainingVideos.push(item);
    } else {
      remainingPhotos.push(item);
    }
  }

  // 1. Distribute videos across columns round-robin & spread evenly
  const totalVideos = items.filter((i) => i.type === 'video').length;
  const maxVideosPerCol = Math.ceil(totalVideos / numCols);

  for (const video of remainingVideos) {
    let bestCol = -1;
    let minH = Infinity;

    for (let c = 0; c < numCols; c++) {
      const vCount = columns[c].filter((x) => x.type === 'video').length;
      if (vCount < maxVideosPerCol) {
        if (colHeights[c] < minH) {
          minH = colHeights[c];
          bestCol = c;
        }
      }
    }

    if (bestCol === -1) {
      bestCol = colHeights.indexOf(Math.min(...colHeights));
    }

    columns[bestCol].push(video);
    colHeights[bestCol] += getItemRenderHeight(video, aspectRatios);
  }

  // 2. Distribute photos greedily to column with lowest accumulated height (balancing empty space)
  for (const photo of remainingPhotos) {
    let bestCol = -1;
    let minH = Infinity;

    for (let c = 0; c < numCols; c++) {
      if (colHeights[c] < minH) {
        minH = colHeights[c];
        bestCol = c;
      }
    }

    columns[bestCol].push(photo);
    colHeights[bestCol] += getItemRenderHeight(photo, aspectRatios);
  }

  // 3. Two-Tier Optimization Phase: Transfer & Pairwise Swap
  // Guarantees all 3 columns align at the bottom regardless of future item additions, deletions, or ratio variations!
  let improved = true;
  for (let iter = 0; iter < 30 && improved; iter++) {
    improved = false;
    let currentRange = Math.max(...colHeights) - Math.min(...colHeights);
    if (currentRange <= 60) break;

    const tallestCol = colHeights.indexOf(Math.max(...colHeights));
    const shortestCol = colHeights.indexOf(Math.min(...colHeights));

    // A. Transfer: Move an unslotted photo from tallest column to shortest column if it strictly reduces range
    const unslottedTallest = columns[tallestCol].slice(slottedByCol[tallestCol].length).filter((i) => i.type === 'photo');
    for (const photo of unslottedTallest) {
      const h = getItemRenderHeight(photo, aspectRatios);
      const testHeights = [...colHeights];
      testHeights[tallestCol] -= h;
      testHeights[shortestCol] += h;

      const testRange = Math.max(...testHeights) - Math.min(...testHeights);
      if (testRange < currentRange - 30) {
        const pIdx = columns[tallestCol].lastIndexOf(photo);
        columns[tallestCol].splice(pIdx, 1);
        columns[shortestCol].push(photo);
        colHeights[tallestCol] -= h;
        colHeights[shortestCol] += h;
        currentRange = testRange;
        improved = true;
        break;
      }
    }

    if (improved) continue;

    // B. Pairwise Swap: Swap a taller photo in colA with a shorter photo in colB to fine-tune alignment
    for (let cA = 0; cA < numCols; cA++) {
      for (let cB = cA + 1; cB < numCols; cB++) {
        const unslottedA = columns[cA].slice(slottedByCol[cA].length).filter((i) => i.type === 'photo');
        const unslottedB = columns[cB].slice(slottedByCol[cB].length).filter((i) => i.type === 'photo');

        for (const itemA of unslottedA) {
          for (const itemB of unslottedB) {
            const hA = getItemRenderHeight(itemA, aspectRatios);
            const hB = getItemRenderHeight(itemB, aspectRatios);

            const testHeights = [...colHeights];
            testHeights[cA] = testHeights[cA] - hA + hB;
            testHeights[cB] = testHeights[cB] - hB + hA;

            const testRange = Math.max(...testHeights) - Math.min(...testHeights);
            if (testRange < currentRange - 20) {
              const idxA = columns[cA].lastIndexOf(itemA);
              const idxB = columns[cB].lastIndexOf(itemB);
              columns[cA][idxA] = itemB;
              columns[cB][idxB] = itemA;
              colHeights[cA] = testHeights[cA];
              colHeights[cB] = testHeights[cB];
              currentRange = testRange;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }

  // 4. Inside each column, keep slotted items at head, then interleave unslotted photos and videos smoothly
  for (let c = 0; c < numCols; c++) {
    const lockedHead = slottedByCol[c];
    const unslottedInCol = columns[c].slice(lockedHead.length);

    const colPhotos: MediaItem[] = [];
    const colVideos: MediaItem[] = [];

    for (const it of unslottedInCol) {
      if (it.type === 'video') {
        colVideos.push(it);
      } else {
        colPhotos.push(it);
      }
    }

    const finalList: MediaItem[] = [];
    let pIdx = 0;
    let vIdx = 0;
    const step =
      colVideos.length > 0
        ? Math.max(2, Math.floor(colPhotos.length / colVideos.length))
        : 3;

    while (pIdx < colPhotos.length || vIdx < colVideos.length) {
      for (let s = 0; s < step && pIdx < colPhotos.length; s++) {
        finalList.push(colPhotos[pIdx++]);
      }
      if (vIdx < colVideos.length) {
        finalList.push(colVideos[vIdx++]);
      }
    }

    columns[c] = [...lockedHead, ...finalList];
  }

  // flatItems: all slotted items first in slot order, then unslotted items
  const mobileFlat: MediaItem[] = [
    ...slottedItems,
    ...regularItems.filter((it) => !slottedItems.some((s) => s.id === it.id)),
  ];

  return {
    columns,
    flatItems: mobileFlat,
  };
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
    initialItems && initialItems.length > 0 ? initialItems : []
  );
  const [categories, setCategories] = useState<GalleryCategory[]>(
    initialCategories && initialCategories.length > 0 ? initialCategories : []
  );

  const ITEMS_PER_PAGE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategories && initialCategories.length > 0 ? initialCategories[0].id : ''
  );
  const [activeSubcategory, setActiveSubcategory] = useState<string>(
    initialCategories && initialCategories[0]?.subcategories?.length > 0
      ? initialCategories[0].subcategories[0].id
      : 'all'
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const galleryContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync if server props change
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      const firstCat = initialCategories[0];
      const validCatId =
        activeCategory && initialCategories.some((c) => c.id === activeCategory)
          ? activeCategory
          : firstCat.id;

      setActiveCategory(validCatId);

      const chosenCat =
        initialCategories.find((c) => c.id === validCatId) || firstCat;
      const firstSub = chosenCat.subcategories?.[0]?.id;

      setActiveSubcategory((prev) => {
        if (prev && prev !== 'all' && chosenCat.subcategories.some((s) => s.id === prev)) {
          return prev;
        }
        return firstSub || 'all';
      });
    }
  }, [initialCategories, activeCategory]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
            order_index,
            slides,
            created_at,
            subcategories:subcategory_id (
              id,
              label,
              category_id,
              status,
              categories:category_id (
                id,
                label,
                status
              )
            )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        // Filter active (non-archived) categories & subcategories
        const activeCats = (catData || []).filter((c) => c.status !== 'archived');
        const activeCatIds = new Set(activeCats.map((c) => c.id));
        const activeSubs = (subData || []).filter(
          (s) => s.status !== 'archived' && activeCatIds.has(s.category_id)
        );
        const activeSubIds = new Set(activeSubs.map((s) => s.id));

        // Map categories & subcategories
        if (activeCats.length > 0) {
          const structuredCats: GalleryCategory[] = activeCats.map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description || '',
            status: (c.status || 'published') as 'published' | 'archived' | 'draft',
            subcategories: activeSubs
              .filter((s) => s.category_id === c.id)
              .map((s) => ({
                id: s.id,
                label: s.label,
                description: s.description || '',
                status: (s.status || 'published') as 'published' | 'archived' | 'draft',
              })),
          }));
          setCategories(structuredCats);
          const firstCat = structuredCats[0];
          const validCatId =
            activeCategory && structuredCats.some((c) => c.id === activeCategory)
              ? activeCategory
              : firstCat?.id || '';

          setActiveCategory(validCatId);

          const chosenCat =
            structuredCats.find((c) => c.id === validCatId) || firstCat;
          const firstSub = chosenCat?.subcategories?.[0]?.id;

          setActiveSubcategory((prev) => {
            if (prev && prev !== 'all' && chosenCat?.subcategories.some((s) => s.id === prev)) {
              return prev;
            }
            return firstSub || 'all';
          });
        } else {
          setCategories([]);
        }

        // Map contents into MediaItem format
        if (contentData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedItems: MediaItem[] = contentData
            .filter((d: any) => {
              if (d.status && d.status !== 'published') return false;

              const sub = d.subcategories;
              const cat = sub?.categories;

              // If subcategory or category is archived, hide this content
              if (sub?.status === 'archived' || cat?.status === 'archived') return false;

              const subId = sub?.id || d.subcategory_id;
              const catId = cat?.id || sub?.category_id;

              if (subId && !activeSubIds.has(subId)) return false;
              if (catId && !activeCatIds.has(catId)) return false;

              return true;
            })
            .map((d: any) => ({
              id: d.id,
              category: (d.subcategories?.categories?.id || 'photography') as any,
              categoryLabel: d.subcategories?.categories?.label || 'Portfolio',
              subcategory: d.subcategories?.id || d.subcategory_id,
              subcategoryLabel: d.subcategories?.label || 'Portfolio',
              description: d.description || '',
              type: (d.type || 'photo') as 'photo' | 'video',
              image: d.image_url,
              videoUrl: d.video_url || undefined,
              aspect: undefined,
              order_index: d.order_index ?? 0,
              created_at: d.created_at,
              slides: Array.isArray(d.slides) ? d.slides : undefined,
            }));
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

  // Currently active Category Object (null if 'all' or no categories)
  const activeCategoryObj = useMemo(() => {
    if (activeCategory === 'all') return null;
    if (!categories || categories.length === 0) return null;
    return categories.find((c) => c.id === activeCategory) || categories[0];
  }, [activeCategory, categories]);

  // Available subcategories for currently active category
  const currentSubcategories = useMemo(() => {
    return activeCategoryObj ? activeCategoryObj.subcategories : [];
  }, [activeCategoryObj]);

  // Handle switching main category
  const handleSelectCategory = (catId: string) => {
    setIsInitialEntrance(false);
    setIsArrangingLayout(true);
    setActiveCategory(catId);
    const targetCat = categories.find((c) => c.id === catId);
    const firstSub = targetCat?.subcategories?.[0]?.id;
    setActiveSubcategory(firstSub || 'all'); // Sembunyikan 'all', langsung default ke subkategori pertama
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination count
  };

  // Handle switching subcategory
  const handleSelectSubcategory = (subId: string) => {
    setIsInitialEntrance(false);
    setIsArrangingLayout(true);
    setActiveSubcategory(subId);
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination count
  };

  // Filter items based on activeCategory and activeSubcategory
  const filteredItems = useMemo(() => {
    let result: MediaItem[] = items;

    // Filter by active category (only if a specific category is chosen, not 'all')
    if (activeCategory && activeCategory !== 'all') {
      result = result.filter(
        (item) =>
          item.category === activeCategory ||
          (activeCategoryObj && item.categoryLabel === activeCategoryObj.label)
      );
    } else if (!activeCategory && categories.length > 0) {
      // Fallback initial state if activeCategory is empty
      const firstCat = categories[0];
      result = result.filter(
        (item) =>
          item.category === firstCat.id ||
          item.categoryLabel === firstCat.label
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

    return result;
  }, [items, activeCategory, categories, activeCategoryObj, activeSubcategory, currentSubcategories]);

  // Fitur Load More / Show Less disimpan (di-keep), saat ini dinonaktifkan sementara menunggu persetujuan client
  // Cukup ubah nilai ENABLE_LOAD_MORE menjadi true untuk mengaktifkannya kembali di kemudian hari!
  const ENABLE_LOAD_MORE = false;

  // Distributed columns & flat items for responsive display
  const { columns: desktopColumns, flatItems } = useMemo(() => {
    const baseItems = !ENABLE_LOAD_MORE ? filteredItems : filteredItems.slice(0, visibleCount);
    const hasDesc = Boolean(activeCategory !== 'all' && activeCategoryObj);
    return distributeGalleryColumns(baseItems, aspectRatios, hasDesc);
  }, [filteredItems, visibleCount, ENABLE_LOAD_MORE, aspectRatios, activeCategory, activeCategoryObj]);

  // Items to preload before revealing gallery layout
  const itemsToPreload = useMemo(() => {
    return !ENABLE_LOAD_MORE ? filteredItems : filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount, ENABLE_LOAD_MORE]);

  // Combined displayed items for progress indicators
  const displayedItems = useMemo(() => {
    return [
      ...desktopColumns[0],
      ...desktopColumns[1],
      ...desktopColumns[2],
    ];
  }, [desktopColumns]);

  // PRELOAD & DECODE ALL IMAGES IN MEMORY BEFORE DISPLAYING TO USER
  // Menjamin semua gambar sudah tersusun dan ter-decode 100% di memori browser sebelum ditampilkan
  useEffect(() => {
    if (itemsToPreload.length === 0) {
      setIsArrangingLayout(false);
      return;
    }

    setIsArrangingLayout(true);
    let isCancelled = false;

    const preloadAllImages = async () => {
      const detectedAspects: Record<string, number> = {};
      const startTime = Date.now();

      const promises = itemsToPreload.map((item) => {
        return new Promise<void>((resolve) => {
          const isVideo = item.type === 'video' && Boolean(item.videoUrl);
          const isYouTube = isVideo && item.videoUrl ? Boolean(getYouTubeVideoId(item.videoUrl)) : false;
          const fallbackThumbnail =
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23141419"/></svg>';
          const rawThumbnail =
            (isYouTube && item.videoUrl ? getYouTubeThumbnail(item.videoUrl) || item.image : item.image) || fallbackThumbnail;
          const url = getOptimizedCloudinaryUrl(resolveVideoPlayUrl(rawThumbnail), { width: 1200 });

          const img = new window.Image();
          img.src = url;

          const onFinish = () => {
            if (img.naturalWidth && img.naturalHeight && img.naturalHeight > 0) {
              detectedAspects[item.id] = img.naturalWidth / img.naturalHeight;
            }
            if (img.decode) {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          };

          if (img.complete && img.naturalHeight > 0) {
            onFinish();
          } else {
            img.onload = onFinish;
            img.onerror = () => resolve();
          }
        });
      });

      await Promise.all(promises);

      if (isCancelled) return;

      // Update aspect ratios map so GalleryCard and distributeGalleryColumns compute exact dimensions
      setAspectRatios((prev) => ({ ...prev, ...detectedAspects }));

      // Ensure minimal duration of 300ms for smooth skeleton transition so layout settles
      const elapsed = Date.now() - startTime;
      const minDisplayTime = 300;
      const remainingWait = Math.max(100, minDisplayTime - elapsed);

      setTimeout(() => {
        if (!isCancelled) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!isCancelled) {
                setIsArrangingLayout(false);
              }
            });
          });
        }
      }, remainingWait);
    };

    preloadAllImages();

    // Safety timeout: maximum 2500ms
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsArrangingLayout(false);
      }
    }, 2500);

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [activeCategory, activeSubcategory, itemsToPreload]);

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

  // Active Category Description
  const categoryDescription = useMemo(() => {
    if (activeCategory === 'all') {
      return 'A curated selection across photography, videography, graphic design & apparel.';
    }
    return activeCategoryObj?.description?.trim() || '';
  }, [activeCategory, activeCategoryObj]);

  // Active Subcategory Description
  const subcategoryDescription = useMemo(() => {
    if (activeSubcategory === 'all') return '';
    const sub = currentSubcategories.find((s) => s.id === activeSubcategory);
    return sub?.description?.trim() || '';
  }, [activeSubcategory, currentSubcategories]);

  // Combined active description for general fallbacks
  const activeDescription = subcategoryDescription || categoryDescription;

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
              {/* SEMENTARA DISEMBUNYIKAN: Filter 'All Works' (Dapat diaktifkan kembali jika diperlukan) */}
              {/*
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
              */}

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

            {/* SEMENTARA DISEMBUNYIKAN: Filter 'All in Category' (Dapat diaktifkan kembali jika diperlukan) */}
            {/*
            <button
              onClick={() => handleSelectSubcategory('all')}
              className={`text-[11px] font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${activeSubcategory === 'all'
                  ? 'bg-black text-white font-semibold shadow-sm'
                  : 'bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700'
                }`}
            >
              All {activeCategoryObj?.label}
            </button>
            */}

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
      {/* GALLERY SECTION WRAPPER                              */}
      {/* Real cards stay in DOM in background to compute and  */}
      {/* settle CSS columns before revealing to user.         */}
      {/* ==================================================== */}
      <div className="relative min-h-[600px]">
        {/* LOADING STATE OVERLAY (MINIMAL LUXURY ANIMATION) */}
        {(isLoading || isArrangingLayout) && (
          <div className="absolute inset-0 z-20 bg-[#edeced] pointer-events-none transition-opacity duration-500 space-y-8 animate-fadeIn">
            {/* Central Luxury Animated Brand Loader */}
            <div className="py-6 sm:py-8 flex flex-col items-center justify-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Outer circular track */}
                <div className="absolute inset-0 rounded-full border-2 border-black/10" />
                {/* Spinning gradient arc */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neutral-900 border-r-neutral-900/40 animate-spin" />
                {/* Brand Lettermark */}
                <div className="relative w-5 h-6 flex items-center justify-center">
                  <Image
                    src="/images/loading-l.png"
                    alt="Loading"
                    fill
                    sizes="24px"
                    className="object-contain select-none"
                    priority
                  />
                </div>
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
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-7">
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
        )}

        {/* GALLERY GRID (Always in DOM in background to balance columns stably) */}
        <div
          ref={galleryContainerRef}
          className={`transition-opacity duration-500 ease-out ${isLoading || isArrangingLayout
              ? 'opacity-0 pointer-events-none select-none'
              : 'opacity-100 pointer-events-auto'
            }`}
        >
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
              <div key={`${activeCategory}-${activeSubcategory}`}>
                {/* DESKTOP VIEWPORT (lg: 3 Columns Deterministic Grid) */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-6 md:gap-7 items-start">
                  {/* Column 1 (Left): Editorial Description sitting at top, then Slot 3, 6... & unslotted */}
                  <div className="flex flex-col">
                    {activeCategory !== 'all' && activeCategoryObj && (
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
                              ? `${activeCategoryObj.label} - ${activeTitle}`
                              : `ALL ${activeCategoryObj.label}`}
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

                    {desktopColumns[0].map((item, idx) => {
                      const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);
                      return (
                        <GalleryCard
                          key={item.id}
                          item={item}
                          idx={idx * 3}
                          fullIndex={fullIndex}
                          hasMounted={hasMounted}
                          isInitialEntrance={isInitialEntrance}
                          onOpenLightbox={openLightbox}
                          aspectRatio={aspectRatios[item.id]}
                        />
                      );
                    })}
                  </div>

                  {/* Column 2 (Center): Slot 1, 4, 7... at head, then unslotted */}
                  <div className="flex flex-col">
                    {desktopColumns[1].map((item, idx) => {
                      const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);
                      return (
                        <GalleryCard
                          key={item.id}
                          item={item}
                          idx={idx * 3 + 1}
                          fullIndex={fullIndex}
                          hasMounted={hasMounted}
                          isInitialEntrance={isInitialEntrance}
                          onOpenLightbox={openLightbox}
                          aspectRatio={aspectRatios[item.id]}
                        />
                      );
                    })}
                  </div>

                  {/* Column 3 (Right): Slot 2, 5, 8... at head, then unslotted */}
                  <div className="flex flex-col">
                    {desktopColumns[2].map((item, idx) => {
                      const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);
                      return (
                        <GalleryCard
                          key={item.id}
                          item={item}
                          idx={idx * 3 + 2}
                          fullIndex={fullIndex}
                          hasMounted={hasMounted}
                          isInitialEntrance={isInitialEntrance}
                          onOpenLightbox={openLightbox}
                          aspectRatio={aspectRatios[item.id]}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* MOBILE & TABLET VIEWPORT (columns-1 sm:columns-2) */}
                <div className="lg:hidden columns-1 sm:columns-2 gap-6 md:gap-7">
                  {activeCategory !== 'all' && activeCategoryObj && (
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
                            ? `${activeCategoryObj.label} - ${activeTitle}`
                            : `ALL ${activeCategoryObj.label}`}
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

                  {flatItems.map((item, idx) => {
                    const fullIndex = filteredItems.findIndex((fi) => fi.id === item.id);
                    return (
                      <GalleryCard
                        key={`mob-${item.id}`}
                        item={item}
                        idx={idx}
                        fullIndex={fullIndex}
                        hasMounted={hasMounted}
                        isInitialEntrance={isInitialEntrance}
                        onOpenLightbox={openLightbox}
                        aspectRatio={aspectRatios[item.id]}
                      />
                    );
                  })}
                </div>
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
      </div>

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
