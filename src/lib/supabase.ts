import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Sanitize URL by removing /rest/v1 or trailing slashes if present
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Exact Clean DB interfaces
export interface DBCategory {
  id: string;
  label: string;
  key?: string;
  description?: string;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface DBSubcategory {
  id: string;
  category_id: string;
  label: string;
  key?: string;
  description?: string;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface DBContent {
  id: string;
  subcategory_id: string;
  title: string;
  description?: string;
  type: 'photo' | 'video';
  image_url: string;
  video_url?: string;
  aspect: string;
  status: 'draft' | 'published' | 'archived';
  order_index?: number;
  created_at: string;
  updated_at: string;
  subcategories?: DBSubcategory & {
    categories?: DBCategory;
  };
}
