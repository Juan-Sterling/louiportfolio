export type MainCategory = 'photography' | 'videography' | 'graphic-design' | 'loui-tee';

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

export const CATEGORIES: CategoryGroup[] = [
  {
    key: 'photography',
    label: 'Photography',
    description: 'EVENT PHOTOSHOOT, MODEL PHOTOSHOOT, RETRO CAMERA, ‘CAT EYE’ PROJECT',
    subcategories: [
      {
        key: 'event-photoshoot',
        label: 'Event Photoshoot',
        description: 'FOR BIRTHDAY, WEDDING, GRADUATION, OR MUSIC EVENT',
      },
      {
        key: 'model-photoshoot',
        label: 'Model Photoshoot',
        description: 'FOR FAMILY POTRAIT, COUPLE, FRIENDS, AND ANOTHER MEMORIES WITH THE LOVED ONES',
      },
      {
        key: 'retro-camera',
        label: 'Retro Camera',
        description: 'FOR THOSE WHO WANT SOMETHING BOLD, UNIQUE, AND TOUCH OF NOSTALGIA',
      },
      {
        key: 'cat-eye-project',
        label: "‘Cat Eye’ Project",
        description: 'MY EXPERIMENTAL PROJECT, PORTRAYS THE LIVES OF STRAY CATS SURVIVING IN THE HUMAN WORLD.',
      },
    ],
  },
  {
    key: 'videography',
    label: 'Videography',
    description: 'MUSIC VIDEO, CINEMATIC EDIT, COMPETITION',
    subcategories: [
      {
        key: 'music-video',
        label: 'Music Video',
        description: 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG',
      },
      {
        key: 'cinematic-edit',
        label: 'Cinematic Edit',
        description: '',
      },
      {
        key: 'competition',
        label: 'Competition',
        description: 'THESE ARE SOME VIDEOS I’VE SUBMITTED FOR VIDEO COMPETITION',
      },
    ],
  },
  {
    key: 'graphic-design',
    label: 'Graphic Design',
    description: 'KARBIDA FC, EVENT POSTERS, THUMBNAILS, RE-CREATE',
    subcategories: [
      {
        key: 'karbida-fc',
        label: 'Karbida FC',
        description: 'FOOTBALL, COMIC-STYLE, FOR GANINDRA BIMO (INSTAGRAM FEEDS FORMAT)',
      },
      {
        key: 'event-posters',
        label: 'Event Posters',
        description: 'INSTAGRAM FEEDS FORMAT (SQUARE, 1080 x 1080p)',
      },
      {
        key: 'thumbnails',
        label: 'Thumbnails',
        description: 'MOSTLY, FOR YOUTUBE PLATFORM (1920 x 1080p)',
      },
      {
        key: 're-create',
        label: 'Re-create',
        description: 'THE IDEA IS RE-CREATING BAND/MOVIES POSTER WITH MY CREATIVE WAY',
      },
    ],
  },
  {
    key: 'loui-tee',
    label: 'Loui Tee',
    description: 'TEE PRODUCTION ©2025 — ‘BOOTLEG’ GRAPHIC TEE PRODUCTS & CUSTOM ORDER',
    subcategories: [
      {
        key: 'graphic-tee',
        label: 'Graphic Tee',
        description: '‘BOOTLEG’ GRAPHIC TEE PRODUCTS (RELEASED SO FAR . . .)',
      },
      {
        key: 'custom-order',
        label: 'Custom Order',
        description: 'YOU CAN ALSO GET YOUR OWN GRAPHIC TEE. JUST SAY THE WORD AND LET ME DO IT FOR YOU! HERE SOME OF THE RESULTS!',
      },
    ],
  },
];

export interface MediaItem {
  id: string;
  title?: string;
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
 * (embeds, watch?v=, youtu.be, shorts)
 */
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
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
  const isDirectId = /^[a-zA-Z0-9_-]{11}$/.test(urlOrId);
  const videoId = isDirectId ? urlOrId : getYouTubeVideoId(urlOrId);
  if (!videoId) return urlOrId;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

export const portfolioItems: MediaItem[] = [
  // --- PHOTOGRAPHY ---
  {
    id: 'photo-event-1',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'event-photoshoot',
    subcategoryLabel: 'Event Photoshoot',
    description: 'FOR BIRTHDAY, WEDDING, GRADUATION, OR MUSIC EVENT',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[4/5]',
  },
  {
    id: 'photo-event-2',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'event-photoshoot',
    subcategoryLabel: 'Event Photoshoot',
    description: 'FOR BIRTHDAY, WEDDING, GRADUATION, OR MUSIC EVENT',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[16/9]',
  },
  {
    id: 'photo-model-1',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'model-photoshoot',
    subcategoryLabel: 'Model Photoshoot',
    description: 'FOR FAMILY POTRAIT, COUPLE, FRIENDS, AND ANOTHER MEMORIES WITH THE LOVED ONES',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[3/4]',
  },
  {
    id: 'photo-model-2',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'model-photoshoot',
    subcategoryLabel: 'Model Photoshoot',
    description: 'FOR FAMILY POTRAIT, COUPLE, FRIENDS, AND ANOTHER MEMORIES WITH THE LOVED ONES',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[4/5]',
  },
  {
    id: 'photo-retro-1',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'retro-camera',
    subcategoryLabel: 'Retro Camera',
    description: 'FOR THOSE WHO WANT SOMETHING BOLD, UNIQUE, AND TOUCH OF NOSTALGIA',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[1/1]',
  },
  {
    id: 'photo-cateye-1',
    category: 'photography',
    categoryLabel: 'Photography',
    subcategory: 'cat-eye-project',
    subcategoryLabel: "‘Cat Eye’ Project",
    description: 'MY EXPERIMENTAL PROJECT, PORTRAYS THE LIVES OF STRAY CATS SURVIVING IN THE HUMAN WORLD.',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[4/5]',
  },

  // --- VIDEOGRAPHY ---
  {
    id: 'video-mv-1',
    category: 'videography',
    categoryLabel: 'Videography',
    subcategory: 'music-video',
    subcategoryLabel: 'Music Video',
    description: 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG',
    type: 'video',
    image: getYouTubeThumbnail('https://www.youtube.com/embed/XyLoPRmUR3s?autoplay=1'),
    aspect: 'aspect-[16/9]',
    videoUrl: 'https://www.youtube.com/embed/XyLoPRmUR3s?autoplay=1',
  },
  {
    id: 'video-cinematic-1',
    category: 'videography',
    categoryLabel: 'Videography',
    subcategory: 'cinematic-edit',
    subcategoryLabel: 'Cinematic Edit',
    type: 'video',
    image: getYouTubeThumbnail('https://www.youtube.com/embed/g1j1ufqg8ng?autoplay=1'),
    aspect: 'aspect-[16/9]',
    videoUrl: 'https://www.youtube.com/embed/g1j1ufqg8ng?autoplay=1',
  },
  {
    id: 'video-competition-1',
    category: 'videography',
    categoryLabel: 'Videography',
    subcategory: 'competition',
    subcategoryLabel: 'Competition',
    description: 'THESE ARE SOME VIDEOS I’VE SUBMITTED FOR VIDEO COMPETITION',
    type: 'video',
    image: getYouTubeThumbnail('https://www.youtube.com/embed/qm2ZoAJPGTg?autoplay=1'),
    aspect: 'aspect-[16/9]',
    videoUrl: 'https://www.youtube.com/embed/qm2ZoAJPGTg?autoplay=1',
  },
  {
    id: 'video-mv-2',
    category: 'videography',
    categoryLabel: 'Videography',
    subcategory: 'music-video',
    subcategoryLabel: 'Music Video',
    description: 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG',
    type: 'video',
    image: getYouTubeThumbnail('https://www.youtube.com/embed/82GMXxyepLc?autoplay=1'),
    aspect: 'aspect-[16/9]',
    videoUrl: 'https://www.youtube.com/embed/82GMXxyepLc?autoplay=1',
  },

  // --- GRAPHIC DESIGN ---
  {
    id: 'gd-karbida-1',
    category: 'graphic-design',
    categoryLabel: 'Graphic Design',
    subcategory: 'karbida-fc',
    subcategoryLabel: 'Karbida FC',
    description: 'FOOTBALL, COMIC-STYLE, FOR GANINDRA BIMO (INSTAGRAM FEEDS FORMAT)',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[1/1]',
  },
  {
    id: 'gd-posters-1',
    category: 'graphic-design',
    categoryLabel: 'Graphic Design',
    subcategory: 'event-posters',
    subcategoryLabel: 'Event Posters',
    description: 'INSTAGRAM FEEDS FORMAT (SQUARE, 1080 x 1080p)',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[3/4]',
  },
  {
    id: 'gd-thumbnails-1',
    category: 'graphic-design',
    categoryLabel: 'Graphic Design',
    subcategory: 'thumbnails',
    subcategoryLabel: 'Thumbnails',
    description: 'MOSTLY, FOR YOUTUBE PLATFORM (1920 x 1080p)',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[16/9]',
  },
  {
    id: 'gd-recreate-1',
    category: 'graphic-design',
    categoryLabel: 'Graphic Design',
    subcategory: 're-create',
    subcategoryLabel: 'Re-create',
    description: 'THE IDEA IS RE-CREATING BAND/MOVIES POSTER WITH MY CREATIVE WAY',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[1/1]',
  },

  // --- LOUI TEE ---
  {
    id: 'tee-graphic-1',
    category: 'loui-tee',
    categoryLabel: 'Loui Tee',
    subcategory: 'graphic-tee',
    subcategoryLabel: 'Graphic Tee',
    description: '‘BOOTLEG’ GRAPHIC TEE PRODUCTS (RELEASED SO FAR . . .)',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[4/5]',
  },
  {
    id: 'tee-custom-1',
    category: 'loui-tee',
    categoryLabel: 'Loui Tee',
    subcategory: 'custom-order',
    subcategoryLabel: 'Custom Order',
    description: 'YOU CAN ALSO GET YOUR OWN GRAPHIC TEE. JUST SAY THE WORD AND LET ME DO IT FOR YOU! HERE SOME OF THE RESULTS!',
    type: 'photo',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop',
    aspect: 'aspect-[4/5]',
  },
];
