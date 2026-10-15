export type MainCategory = string;

export interface SubCategoryDef {
  key: string;
  label: string;
  description: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface CategoryGroup {
  key: MainCategory;
  label: string;
  description: string;
  status?: 'draft' | 'published' | 'archived';
  subcategories: SubCategoryDef[];
}

// Default categories are empty: all category hierarchies are driven by the database.
export const CATEGORIES: CategoryGroup[] = [];

export interface MediaSlide {
  id: string;
  type: 'photo' | 'video';
  image: string;
  videoUrl?: string;
  caption?: string;
}

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
  ratio?: string;
  videoUrl?: string; // YouTube embed link for playable modal
  status?: 'draft' | 'published' | 'archived';
  order_index?: number;
  created_at?: string;
  slides?: MediaSlide[];
}

/**
 * Normalizes all slides for a media item so that the primary cover media
 * (photo or video) is always guaranteed to be present as the first slide,
 * followed by any additional slides.
 */
export function getNormalizedSlides(item?: MediaItem | null): MediaSlide[] {
  if (!item) return [];

  const coverSlide: MediaSlide = {
    id: `${item.id}-cover`,
    type: item.type,
    image: item.image,
    videoUrl: item.type === 'video' ? item.videoUrl : undefined,
    caption: item.description || '',
  };

  if (!item.slides || item.slides.length === 0) {
    return [coverSlide];
  }

  // Check if primary media is already included in slides
  const isCoverInSlides = item.slides.some(
    (s) =>
      (item.type === 'video' && s.type === 'video' && Boolean(s.videoUrl && item.videoUrl && s.videoUrl === item.videoUrl)) ||
      (item.type === 'photo' && s.type === 'photo' && Boolean(s.image && item.image && s.image === item.image))
  );

  if (isCoverInSlides) {
    return item.slides;
  }

  return [coverSlide, ...item.slides];
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
export function getYouTubeEmbedUrl(
  urlOrId?: string,
  autoplay: boolean = true,
  loop: boolean = true
): string {
  if (!urlOrId) return '';
  const videoId = getYouTubeVideoId(urlOrId);
  if (!videoId) return urlOrId;
  const loopParams = loop ? `&loop=1&playlist=${videoId}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}${loopParams}&rel=0&modestbranding=1&enablejsapi=1`;
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

