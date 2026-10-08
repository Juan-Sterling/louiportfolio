export type MainCategory = string;

export interface SubCategoryDef {
  key: string;
  label: string;
  description: string;
}

export interface CategoryGroup {
  key: MainCategory;
  label: string;
  description: string;
  subcategories: SubCategoryDef[];
}

// Default categories are empty: all category hierarchies are driven by the database.
export const CATEGORIES: CategoryGroup[] = [];

export interface MediaItem {
  id: string;
  category: MainCategory;
  categoryLabel: string;
  subcategory: string;
  subcategoryLabel: string;
  description?: string;
  type: 'photo' | 'video';
  image: string;
  aspect?: string; // Optional legacy aspect ratio
  videoUrl?: string; // YouTube embed link for playable modal
  status?: 'draft' | 'published' | 'archived';
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * (embeds, watch?v=, youtu.be, shorts, parameters like ?si=)
 */
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }
  const match = cleanUrl.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Converts any YouTube URL or video ID into a clean, embeddable YouTube URL
 * that bypasses X-Frame-Options blocking.
 */
export function getYouTubeEmbedUrl(urlOrId?: string, autoplay: boolean = true): string {
  if (!urlOrId) return '';
  const videoId = getYouTubeVideoId(urlOrId);
  if (!videoId) return urlOrId;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
}

export function isYouTubeUrl(url?: string): boolean {
  return Boolean(getYouTubeVideoId(url));
}

/**
 * Returns thumbnail URL from YouTube
 * Defaults to maxresdefault.jpg (1280x720 HD) with hqdefault.jpg (480x360) option
 */
export function getYouTubeThumbnail(
  urlOrId?: string,
  quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault'
): string {
  if (!urlOrId) return '';
  const videoId = getYouTubeVideoId(urlOrId);
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

// Default items are empty: all gallery content is dynamically driven by the database.
export const portfolioItems: MediaItem[] = [];

