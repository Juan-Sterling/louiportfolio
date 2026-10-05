'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MediaItem } from '@/data/portfolioData';

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function MediaLightbox({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: MediaLightboxProps) {
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(items.length - 1);
    }
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl transition-all duration-300 select-none animate-fadeIn p-4 md:p-8"
      onClick={onClose}
    >
      {/* Top Minimal Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 py-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Category Badge & Description */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              <span>{currentItem.categoryLabel}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/90">{currentItem.subcategoryLabel}</span>
            </span>
            <span className="text-xs font-mono text-white/50 tracking-wider">
              {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          </div>

          {currentItem.description && (
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 font-sans pl-1 line-clamp-1">
              {currentItem.description}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15"
          aria-label="Close Preview"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Left */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-3 md:left-8 z-40 w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation Right */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-3 md:right-8 z-40 w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Central Media Container: Clean Photo or Video Preview */}
      <div
        className="relative max-w-5xl w-full max-h-[88vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {currentItem.type === 'video' ? (
          /* Video Modal Player */
          <div className="relative w-full aspect-video max-h-[82vh] rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10">
            <iframe
              src={currentItem.videoUrl || 'https://www.youtube.com/embed/XyLoPRmUR3s?autoplay=1'}
              title={currentItem.subcategoryLabel}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          /* Pure Fullscreen Photo View */
          <div className="relative w-full h-[75vh] md:h-[84vh] max-w-4xl rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center">
            <Image
              src={currentItem.image}
              alt={currentItem.subcategoryLabel}
              fill
              priority
              sizes="(max-width: 1280px) 90vw, 1200px"
              className="object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
