import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MediaItem } from '@/data/portfolioData';

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
      .order('order_index', { ascending: true })
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

    // Active (non-archived) categories & subcategories sets
    const activeCats = (catData || []).filter((c) => c.status !== 'archived');
    const activeCatIds = new Set(activeCats.map((c) => c.id));

    const activeSubs = (subData || []).filter(
      (s) => s.status !== 'archived' && activeCatIds.has(s.category_id)
    );
    const activeSubIds = new Set(activeSubs.map((s) => s.id));

    let categories: GalleryCategory[] = [];
    if (activeCats.length > 0) {
      categories = activeCats.map((c) => ({
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
    }

    let items: MediaItem[] = [];
    if (contentData && contentData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items = contentData
        .filter((d: any) => {
          // Verify content's own status
          if (d.status && d.status !== 'published') return false;

          const sub = d.subcategories;
          const cat = sub?.categories;

          // If subcategory or category is archived, hide this content
          if (sub?.status === 'archived' || cat?.status === 'archived') return false;

          const subId = sub?.id || d.subcategory_id;
          const catId = cat?.id || sub?.category_id;

          // Ensure it belongs to active subcategory and category
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
          aspect: d.aspect || undefined,
          order_index: d.order_index ?? 0,
          created_at: d.created_at,
          slides: Array.isArray(d.slides) ? d.slides : undefined,
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
