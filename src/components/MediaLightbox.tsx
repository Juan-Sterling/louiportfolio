'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Film,
  MapPin,
  Calendar,
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
    // Prevent background scrolling while lightbox is active
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-2xl transition-all duration-300 select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-12 py-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            {currentItem.type === 'video' ? 'Video Project' : 'Photography Work'}
          </span>
          <span className="text-xs font-mono text-white/50 tracking-wider">
            {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15"
          aria-label="Close Lightbox (Esc)"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 md:left-8 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
            aria-label="Previous item (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 md:right-8 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
            aria-label="Next item (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Central Media Container */}
      <div
        className="relative max-w-6xl w-full max-h-[85vh] mx-4 md:mx-16 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {currentItem.type === 'video' ? (
          /* Video Modal Player */
          <div className="relative w-full aspect-video max-h-[70vh] rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 group">
            <iframe
              src={currentItem.videoUrl || 'https://www.youtube.com/@GeraldyLouis'}
              title={currentItem.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full object-cover"
            />
            {/* Quick Watch on YouTube External Action */}
            <div className="absolute top-4 right-4 z-20 pointer-events-auto">
              <a
                href="https://www.youtube.com/@GeraldyLouis"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>YouTube Channel</span>
                <Film className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          /* Fullscreen Photo View */
          <div className="relative max-w-4xl max-h-[70vh] w-full h-[65vh] md:h-[70vh] rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center">
            <Image
              src={currentItem.image}
              alt={currentItem.title}
              fill
              priority
              sizes="(max-width: 1280px) 90vw, 1200px"
              className="object-contain"
            />
          </div>
        )}

        {/* Bottom Metadata & Info Bar */}
        <div className="w-full max-w-3xl mt-4 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight text-white">
                  {currentItem.title}
                </h3>
                {currentItem.duration && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    {currentItem.duration}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-neutral-300 font-sans">
                {currentItem.subtitle}
              </p>
            </div>

            {/* Spec metadata badge */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
              {currentItem.specs && (
                <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-[11px]">
                  {currentItem.type === 'video' ? (
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  {currentItem.specs}
                </span>
              )}

              {currentItem.location && (
                <span className="flex items-center gap-1 text-neutral-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {currentItem.location}
                </span>
              )}

              {currentItem.year && (
                <span className="flex items-center gap-1 text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentItem.year}
                </span>
              )}
            </div>
          </div>

          <p className="mt-2.5 text-xs text-neutral-400 leading-relaxed font-sans line-clamp-2">
            {currentItem.description}
          </p>
        </div>
      </div>
    </div>
  );
}
