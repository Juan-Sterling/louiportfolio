import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MediaItem } from '@/data/portfolioData';

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
  if (!isSupabaseConfigured || !supabase) {
    return {
      categories: [],
      items: [],
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
      console.warn('Supabase fetch notice, returning available data:', {
        catError,
        subError,
        contentError,
      });
      return {
        categories: [],
        items: [],
      };
    }

    let categories: GalleryCategory[] = [];
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

    let items: MediaItem[] = [];
    if (contentData && contentData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items = contentData.map((d: any) => ({
        id: d.id,
        category: (d.subcategories?.categories?.id || 'photography') as any,
        categoryLabel: d.subcategories?.categories?.label || 'Portfolio',
        subcategory: d.subcategories?.id || d.subcategory_id,
        subcategoryLabel: d.subcategories?.label || 'Portfolio',
        description: d.description || '',
        type: (d.type || 'photo') as 'photo' | 'video',
        image: d.image_url,
        videoUrl: d.video_url || undefined,
        aspect: d.aspect || undefined,
      }));
    }

    return {
      categories,
      items,
    };
  } catch (err) {
    console.error('Error fetching gallery data from Supabase:', err);
    return {
      categories: [],
      items: [],
    };
  }
}
