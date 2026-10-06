'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { MediaItem, getYouTubeEmbedUrl } from '@/data/portfolioData';

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

  // Zoom & Pan states
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when navigating or closing
  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const handlePrev = useCallback(() => {
    resetZoom();
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(items.length - 1);
    }
  }, [currentIndex, items.length, onNavigate, resetZoom]);

  const handleNext = useCallback(() => {
    resetZoom();
    if (currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, items.length, onNavigate, resetZoom]);

  useEffect(() => {
    resetZoom();
  }, [currentIndex, isOpen, resetZoom]);

  // Zoom step handlers
  const handleZoomIn = useCallback(() => {
    if (currentItem?.type === 'video') return;
    setScale((prev) => Math.min(4, Number((prev + 0.5).toFixed(2))));
  }, [currentItem]);

  const handleZoomOut = useCallback(() => {
    if (currentItem?.type === 'video') return;
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, [currentItem]);

  // Double click toggles between 1x and 2x
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentItem?.type === 'video') return;
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  // Mouse wheel zoom in/out
  const handleWheel = (e: React.WheelEvent) => {
    if (currentItem?.type === 'video') return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    setScale((prev) => {
      const next = Math.min(4, Math.max(1, Number((prev + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Mouse drag handlers for panning when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || currentItem?.type === 'video') return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    const container = containerRef.current;
    const boundX = container ? (container.clientWidth * (scale - 1)) / 1.5 : 500;
    const boundY = container ? (container.clientHeight * (scale - 1)) / 1.5 : 500;

    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;

    setPan({
      x: Math.min(boundX, Math.max(-boundX, rawX)),
      y: Math.min(boundY, Math.max(-boundY, rawY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || currentItem?.type === 'video') return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1) return;
    if (e.touches.length === 1) {
      const container = containerRef.current;
      const boundX = container ? (container.clientWidth * (scale - 1)) / 1.5 : 500;
      const boundY = container ? (container.clientHeight * (scale - 1)) / 1.5 : 500;

      const rawX = e.touches[0].clientX - dragStartRef.current.x;
      const rawY = e.touches[0].clientY - dragStartRef.current.y;

      setPan({
        x: Math.min(boundX, Math.max(-boundX, rawX)),
        y: Math.min(boundY, Math.max(-boundY, rawY)),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Keyboard navigation and zoom shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
      if (e.key === '0' || e.key === 'r' || e.key === 'R') resetZoom();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handlePrev, handleNext, handleZoomIn, handleZoomOut, resetZoom, onClose]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl transition-all duration-300 select-none animate-fadeIn p-3 sm:p-6 md:p-8 overflow-hidden"
      onClick={onClose}
    >
      {/* Top Header Toolbar — positioned cleanly above media with safe margin */}
      <div
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-12 py-3.5 sm:py-4 md:py-5 text-white pointer-events-auto bg-gradient-to-b from-black/80 via-black/30 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Category Badge & Counter */}
        <div className="flex flex-col gap-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/90 bg-white/10 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-white/15 backdrop-blur-md truncate max-w-[180px] sm:max-w-none">
              <span className="hidden sm:inline">{currentItem.categoryLabel} • </span>
              <span>{currentItem.subcategoryLabel}</span>
            </span>
            <span className="text-[11px] sm:text-xs font-mono text-white/50 tracking-wider shrink-0">
              {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          </div>

          {currentItem.description && (
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] text-neutral-400 font-sans pl-1 line-clamp-1 hidden md:block">
              {currentItem.description}
            </p>
          )}
        </div>

        {/* Right: Zoom Controls & Close Button (Safe from overlapping artwork) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Zoom Controls Pill for Photos */}
          {currentItem.type !== 'video' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 transition-all text-white">
              {/* Zoom Out Button */}
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Current Zoom Percentage & Reset */}
              <button
                onClick={resetZoom}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-medium tracking-wider hover:bg-white/20 transition-all flex items-center gap-1 active:scale-95"
                title="Reset Zoom (0 / Double-click)"
              >
                <span>{Math.round(scale * 100)}%</span>
                {scale > 1 && <RotateCcw className="w-3 h-3 text-neutral-300" />}
              </button>

              {/* Zoom In Button */}
              <button
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 shrink-0"
            aria-label="Close Preview"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Left */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 sm:left-4 md:left-8 z-40 w-10 h-10 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Navigation Right */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 sm:right-4 md:right-8 z-40 w-10 h-10 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Central Media Container: Clean Photo or Video Preview with Safe Padding */}
      <div
        className="relative w-full max-w-5xl h-[calc(100vh-140px)] flex items-center justify-center my-auto pt-14 pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {currentItem.type === 'video' ? (
          /* Video Modal Player */
          <div
            className={`relative w-full ${
              currentItem.videoUrl?.includes('/shorts/')
                ? 'aspect-[9/16] max-w-sm'
                : 'aspect-video max-w-5xl'
            } max-h-full rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10`}
          >
            <iframe
              src={getYouTubeEmbedUrl(currentItem.videoUrl) || 'https://www.youtube-nocookie.com/embed/XyLoPRmUR3s?autoplay=1'}
              title={currentItem.subcategoryLabel || currentItem.title || 'YouTube Video Player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          /* Pure Fullscreen Photo View with Interactive Zoom & Pan */
          <div
            ref={containerRef}
            className={`relative w-full h-full max-w-5xl rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center select-none ${
              scale > 1
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-zoom-in'
            }`}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            title={scale > 1 ? 'Drag to pan • Double click to reset' : 'Double click or scroll to zoom'}
          >
            <div
              className="relative w-full h-full flex items-center justify-center will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Image
                src={currentItem.image}
                alt={currentItem.subcategoryLabel}
                fill
                priority
                sizes="(max-width: 1280px) 95vw, 1600px"
                className="object-contain pointer-events-none select-none"
                draggable={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
