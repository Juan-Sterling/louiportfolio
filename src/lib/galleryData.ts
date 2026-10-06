import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  portfolioItems as fallbackPortfolioItems,
  CATEGORIES as fallbackCategories,
  MediaItem,
} from '@/data/portfolioData';

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

export async function getGalleryData(): Promise<{
  categories: GalleryCategory[];
  items: MediaItem[];
}> {
  const defaultCategories: GalleryCategory[] = fallbackCategories.map((c) => ({
    id: c.key,
    label: c.label,
    description: c.description,
    subcategories: c.subcategories.map((s) => ({
      id: s.key,
      label: s.label,
      description: s.description,
    })),
  }));

  if (!isSupabaseConfigured || !supabase) {
    return {
      categories: defaultCategories,
      items: fallbackPortfolioItems,
    };
  }

  try {
    // 1. Fetch Categories
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    // 2. Fetch Subcategories
    const { data: subData, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    // 3. Fetch Published Contents
    const { data: contentData, error: contentError } = await supabase
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

    if (catError || subError || contentError) {
      console.warn('Supabase fetch notice, falling back:', {
        catError,
        subError,
        contentError,
      });
      return {
        categories: defaultCategories,
        items: fallbackPortfolioItems,
      };
    }

    let categories = defaultCategories;
    if (catData && catData.length > 0) {
      categories = catData.map((c) => ({
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
    }

    let items = fallbackPortfolioItems;
    if (contentData && contentData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items = contentData.map((d: any) => {
        const fallback = fallbackPortfolioItems.find(
          (f) => f.id === d.id || f.image === d.image_url
        );
        return {
          id: d.id,
          title: d.title || undefined,
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
    }

    return {
      categories,
      items,
    };
  } catch (err) {
    console.error('Error fetching gallery data from Supabase:', err);
    return {
      categories: defaultCategories,
      items: fallbackPortfolioItems,
    };
  }
}
