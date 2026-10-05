export interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'photography' | 'videography' | 'graphic-design' | 'loui-tee';
  categoryLabel: string;
  type: 'photo' | 'video';
  image: string;
  aspect: string; // e.g. 'aspect-[4/5]', 'aspect-[16/9]', 'aspect-[1/1]', 'aspect-[3/4]'
  year: string;
  client?: string;
  location?: string;
  tags: string[];
  description: string;
  specs?: string; // e.g. '35mm Film • Leica M6', 'Arri Alexa 35 • Anamorphic'
  duration?: string; // For videos e.g. '02:45'
  videoUrl?: string; // YouTube embed or video link
}

export const portfolioItems: MediaItem[] = [
  {
    id: 'cinematic-reel-braga',
    title: 'NIGHTS IN BRAGA',
    subtitle: 'Cinematic Mood & Narrative Short',
    category: 'videography',
    categoryLabel: 'Videography',
    type: 'video',
    image: '/images/cinematic-reel.jpg',
    aspect: 'aspect-[16/9]',
    year: '2025',
    client: 'Independent Short Film',
    location: 'Braga, Bandung',
    tags: ['Cinematography', 'Directing', 'Color Grading', 'Narrative'],
    description:
      'A moody nocturnal character study captured along the historic rain-slicked streets of Jalan Braga, Bandung. Exploring intimate urban solitude through anamorphic framing and teal-amber color tonality.',
    specs: 'Arri Alexa 35 • Anamorphic 50mm T2.0',
    duration: '03:12',
    videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1', // Fallback or channel video
  },
  {
    id: 'braga-street-portrait',
    title: 'STREETS OF BANDUNG',
    subtitle: 'Golden Hour 35mm Street Portrait',
    category: 'photography',
    categoryLabel: 'Photography',
    type: 'photo',
    image: '/images/street-photography.jpg',
    aspect: 'aspect-[4/5]',
    year: '2025',
    client: 'Personal Visual Journal',
    location: 'Jl. Braga, Bandung',
    tags: ['Street Portrait', '35mm Film', 'Natural Light', 'Bandung Culture'],
    description:
      'Candid portraiture capturing the vibrant spirit, charisma, and warmth of contemporary Indonesian youth amidst the colonial-era facades of historic Bandung.',
    specs: 'Leica M6 • Summicron 35mm f/2 • Kodak Portra 400',
  },
  {
    id: 'life-companions',
    title: 'TIMELESS COMPANIONSHIP',
    subtitle: 'Documentary Portrait of Lifelong Bond',
    category: 'photography',
    categoryLabel: 'Photography',
    type: 'photo',
    image: '/images/photography.jpg',
    aspect: 'aspect-[4/4]',
    year: '2024',
    client: 'Family Archive Series',
    location: 'West Java, Indonesia',
    tags: ['Documentary', 'Human Stories', 'Authentic Smiles', 'Warm Tone'],
    description:
      'An intimate and heartfelt portrait celebrating decades of love, resilience, and genuine companionship. Lit entirely by soft afternoon daylight.',
    specs: 'Canon EOS R5 • RF 50mm f/1.2L USM',
  },
  {
    id: 'candid-motion-story',
    title: 'MOMENTS IN MOTION',
    subtitle: 'Documentary Short & Candid Film',
    category: 'videography',
    categoryLabel: 'Videography',
    type: 'video',
    image: '/images/videography.png',
    aspect: 'aspect-[4/5]',
    year: '2024',
    client: 'Visual Diary Project',
    location: 'Bandung',
    tags: ['Candid Motion', 'Directing', 'Everyday Poetry'],
    description:
      'Unchoreographed documentary motion capturing childhood innocence and the subtle, fleeting beauty of everyday domestic life.',
    specs: 'Sony FX3 • Sony 24-70mm f/2.8 GM II • S-Log3',
    duration: '01:45',
    videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  },
  {
    id: 'brutalist-archives-tee',
    title: 'BRUTALIST ARCHIVES TEE',
    subtitle: 'Architectural Streetwear Lookbook',
    category: 'loui-tee',
    categoryLabel: 'Loui Tee',
    type: 'photo',
    image: '/images/editorial-tee.jpg',
    aspect: 'aspect-[4/5]',
    year: '2025',
    client: 'LOUI Official Apparel',
    location: 'Brutalist Concrete Pavilion, Bandung',
    tags: ['Apparel', 'Lookbook', 'Streetwear', 'Graphic Tee'],
    description:
      'Visual lookbook for the Brutalist Archives drop, photographed against raw architectural concrete. Heavyweight 24s combed cotton with oversized boxy cut.',
    specs: 'Fujifilm GFX 100S • GF 45mm f/2.8',
  },
  {
    id: 'classical-fine-art',
    title: 'SACRED COMPOSITION',
    subtitle: 'Fine Art & Classical Graphic Direction',
    category: 'graphic-design',
    categoryLabel: 'Graphic Design',
    type: 'photo',
    image: '/images/graphic-design.png',
    aspect: 'aspect-[1/1]',
    year: '2024',
    client: 'Art & Exhibition Identity',
    location: 'Bandung',
    tags: ['Fine Art', 'Editorial Design', 'Composition', 'Visual Art'],
    description:
      'Dramatic chiaroscuro digital artwork and fine art layout direction blending Renaissance compositional harmony with contemporary editorial precision.',
    specs: 'Digital Medium • Adobe Suite & Mixed Media',
  },
  {
    id: 'cristiano-ronaldo-vintage-tee',
    title: 'LEGENDS VINTAGE BOOTLEG',
    subtitle: '90s Sports Graphic Screenprint Drop',
    category: 'loui-tee',
    categoryLabel: 'Loui Tee',
    type: 'photo',
    image: '/images/loui-tee.png',
    aspect: 'aspect-[4/5]',
    year: '2025',
    client: 'LOUI Official Apparel',
    location: 'Bandung',
    tags: ['Vintage Bootleg', 'Apparel Design', 'Merchandise', 'Tokopedia / Shopee'],
    description:
      'High-density screenprint graphic t-shirt inspired by vintage 1990s championship apparel. Washed charcoal heavyweight fabric with distressed textural depth.',
    specs: 'Heavyweight 24s Cotton • Vintage Screenprint',
  },
];
