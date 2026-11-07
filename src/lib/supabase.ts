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

/**
 * Retrieves the current active Supabase session access token for authorized API requests.
 */
export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Syncs the authentication token with an HTTP cookie for Next.js server proxy & API validation.
 */
export function syncAuthCookie(token?: string | null) {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (token) {
    document.cookie = `sb-token=${encodeURIComponent(
      token
    )}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; secure' : ''}`;
  } else {
    document.cookie = `sb-token=; path=/; max-age=0; SameSite=Lax${isSecure ? '; secure' : ''}`;
  }
}

// Automatically sync token to cookie when running in client browser
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      syncAuthCookie(session.access_token);
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncAuthCookie(session?.access_token || null);
  });
}

// Exact Clean DB interfaces
export interface DBCategory {
  id: string;
  label: string;
  key?: string;
  description?: string;
  order_index?: number;
  status?: 'draft' | 'published' | 'archived';
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
  status?: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DBContent {
  id: string;
  subcategory_id: string;
  description?: string;
  type: 'photo' | 'video';
  image_url: string;
  video_url?: string;
  aspect?: string;
  ratio?: string;
  status: 'draft' | 'published' | 'archived';
  order_index?: number;
  slides?: unknown[];
  created_at: string;
  updated_at: string;
  subcategories?: DBSubcategory & {
    categories?: DBCategory;
  };
}
