'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Sparkles, X, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface PortfolioItem {
  id: string;
  titleLines: string[];
  subtitle: string;
  category: string;
  image: string;
  href: string;
  description: string;
  client?: string;
  year?: string;
  tags?: string[];
}

const portfolioItems: PortfolioItem[] = [
  {
    id: 'graphic-design',
    titleLines: ['GRAPHIC', 'DESIGN'],
    subtitle: 'Visual Identity, Editorial & Digital Art',
    category: 'Graphic Design',
    image: '/images/graphic-design.png',
    href: '/graphic-design',
    description:
      'A curated collection of visual storytelling, editorial designs, digital posters, and brand identities crafted with precision and artistic vision.',
    year: '2024 - 2025',
    tags: ['Art Direction', 'Editorial', 'Visual Identity', 'Typography'],
  },
  {
    id: 'photography',
    titleLines: ['PHOTO-', 'GRAPHY'],
    subtitle: 'Portraits, Editorial & Human Stories',
    category: 'Photography',
    image: '/images/photography.jpg',
    href: '/photography',
    description:
      'Warm, emotional, and timeless portraits capturing authentic human connections, candid everyday moments, and cinematic storytelling.',
    year: '2024 - 2025',
    tags: ['Portrait', 'Candid', 'Editorial', 'Natural Light'],
  },
  {
    id: 'videography',
    titleLines: ['VIDEO-', 'GRAPHY'],
    subtitle: 'Cinematic Motion, Commercial & Storytelling',
    category: 'Videography',
    image: '/images/videography.png',
    href: '/videography',
    description:
      'Dynamic cinematography and short film narratives crafted with immersive color grading, pacing, and emotional depth.',
    year: '2024 - 2025',
    tags: ['Cinematography', 'Directing', 'Color Grading', 'Documentary'],
  },
  {
    id: 'loui-tee',
    titleLines: ['LOUI', 'TEE'],
    subtitle: 'Streetwear, Apparel & Graphic Merchandise',
    category: 'Merchandise & Fashion',
    image: '/images/loui-tee.png',
    href: '/loui-tee',
    description:
      'Exclusive apparel collections featuring bold vintage sports graphics, heavy-weight cotton streetwear, and distinct cultural aesthetics.',
    year: '2025',
    tags: ['Streetwear', 'Apparel', 'Graphic T-Shirts', 'Merchandise'],
  },
];

export default function PortfolioGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeModalItem, setActiveModalItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const cards = gridRef.current?.querySelectorAll('.portfolio-card');
    if (!cards || cards.length === 0) return;

    const ctx = gsap.context(() => {
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 50,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, gridRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="work" ref={gridRef} className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-24 md:pb-36">
      {/* Masonry Columns Grid */}
      <div className="columns-1 md:columns-2 gap-5 sm:gap-6 md:gap-8 lg:gap-10">
        {portfolioItems.map((item, idx) => (
          <div
            key={item.id}
            className={`portfolio-card break-inside-avoid mb-6 md:mb-8 group relative w-full ${
              idx % 3 === 0 ? 'aspect-[4/5]' : idx % 3 === 1 ? 'aspect-[16/10]' : 'aspect-[1/1]'
            } rounded-[28px] sm:rounded-[36px] md:rounded-[44px] overflow-hidden bg-neutral-300 shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_24px_60px_rgba(0,0,0,0.18)] isolate`}
          >
            {/* Background Image with smooth zoom effect */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <Image
                src={item.image}
                alt={item.titleLines.join(' ')}
                fill
                priority={idx < 2}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
              />
            </div>

            {/* Dark Ambient Gradient for High Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5 opacity-80 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />

            {/* Top Bar with Category & Interactive Explore pill */}
            <div className="absolute top-5 sm:top-7 md:top-8 left-5 sm:left-7 md:left-8 right-5 sm:right-7 md:right-8 flex items-center justify-between z-10">
              <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-white/80 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                0{idx + 1} {'//'} {item.category}
              </span>

              <button
                onClick={() => setActiveModalItem(item)}
                className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-white/90 bg-white/20 hover:bg-white hover:text-black backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Quick preview"
              >
                <span>Preview</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Title & Action Area at Bottom */}
            <div className="absolute bottom-6 sm:bottom-8 md:bottom-10 left-6 sm:left-8 md:left-10 right-6 sm:right-8 md:right-10 flex flex-col justify-end z-10 pointer-events-none">
              <Link
                href={item.href}
                className="pointer-events-auto block group/title text-left transition-transform duration-300 group-hover:translate-x-1"
              >
                <div className="font-heading font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.88] text-[#edeced] uppercase tracking-[-0.03em] editorial-text-shadow">
                  {item.titleLines.map((line, i) => (
                    <div key={i} className="block">
                      {line}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 text-white/80 text-xs sm:text-sm font-medium tracking-wide opacity-90 group-hover/title:text-white group-hover/title:opacity-100 transition-all">
                  <span>View Project Details</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5" />
                </div>
              </Link>
            </div>

            {/* Full Card Clickable Overlay for frictionless browsing */}
            <Link
              href={item.href}
              className="absolute inset-0 z-0"
              aria-label={`Open ${item.titleLines.join(' ')}`}
            />
          </div>
        ))}
      </div>

      {/* Interactive Quick Preview Modal */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#141414] text-[#edeced] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center backdrop-blur-md transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image Header */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
              <Image
                src={activeModalItem.image}
                alt={activeModalItem.titleLines.join(' ')}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-neutral-400 mb-2">
                <span>{activeModalItem.category}</span>
                <span>{activeModalItem.year}</span>
              </div>

              <h2 className="font-heading font-bold text-4xl sm:text-5xl uppercase tracking-tight text-white mb-3">
                {activeModalItem.titleLines.join(' ')}
              </h2>

              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                {activeModalItem.description}
              </p>

              {activeModalItem.tags && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {activeModalItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 text-neutral-200 px-3 py-1 rounded-full border border-white/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Link
                  href={activeModalItem.href}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#edeced] text-black font-semibold py-3.5 px-6 rounded-full hover:bg-white transition-all hover:scale-[1.02]"
                >
                  <span>Open Full Collection Page</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="px-6 py-3.5 rounded-full border border-white/20 text-neutral-300 hover:text-white hover:border-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
