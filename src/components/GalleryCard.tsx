'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import {
  MediaItem,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from '@/data/portfolioData';

interface GalleryCardProps {
  item: MediaItem;
  idx: number;
  fullIndex: number;
  hasMounted: boolean;
  isInitialEntrance?: boolean;
  onOpenLightbox: (index: number) => void;
}

function GalleryCard({
  item,
  idx,
  fullIndex,
  hasMounted,
  isInitialEntrance = true,
  onOpenLightbox,
}: GalleryCardProps) {
  // Video preview states
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [isMediaReady, setIsMediaReady] = useState<boolean>(false);
  const [hasCompletedPreview, setHasCompletedPreview] = useState<boolean>(false);

  // Timers refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Staggered entrance animation delay
  // During first load: a clear, cinematic cascade so the user sees each card reveal
  // After initial load (when filtering): snappy 40ms stagger so filtering feels instant
  const baseDelay = isInitialEntrance ? 650 : 40;
  const stepDelay = isInitialEntrance ? 75 : 40;
  const maxDelay = isInitialEntrance ? 1650 : 480;
  const cardDelay = Math.min(idx * stepDelay + baseDelay, maxDelay);

  // Thumbnail source
  const itemThumbnail =
    item.type === 'video' && item.videoUrl
      ? getYouTubeThumbnail(item.videoUrl) || item.image
      : item.image;

  // Video helpers
  const isVideo = item.type === 'video' && Boolean(item.videoUrl);
  const youtubeId = isVideo && item.videoUrl ? getYouTubeVideoId(item.videoUrl) : null;
  const isYouTube = Boolean(youtubeId);

  // Clear all pending timers and reset video element
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {
        // Ignore video pause errors
      }
    }
  }, []);

  // Gracefully end the 10-second preview
  const handlePreviewEnd = useCallback(() => {
    clearTimers();
    setIsPreviewActive(false);
    setIsMediaReady(false);
    setHasCompletedPreview(true);
  }, [clearTimers]);

  // Mouse enter: trigger debounced 10s video preview
  const handleMouseEnter = () => {
    if (isVideo) {
      clearTimers();
      setHasCompletedPreview(false);

      // Debounce slightly (220ms) so fast mouse passes across the grid don't trigger iframes
      debounceTimerRef.current = setTimeout(() => {
        setIsPreviewActive(true);
        setIsMediaReady(false);

        // Strict 10-second preview limit (10,000 ms)
        durationTimerRef.current = setTimeout(() => {
          handlePreviewEnd();
        }, 10000);
      }, 220);
    }
  };

  // Mouse leave: Immediately cancel preview and clean up resources
  const handleMouseLeave = () => {
    clearTimers();
    setIsPreviewActive(false);
    setIsMediaReady(false);
    setHasCompletedPreview(false);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Click card to open lightbox
  const handleClick = () => {
    clearTimers();
    setIsPreviewActive(false);
    setIsMediaReady(false);
    setHasCompletedPreview(false);
    onOpenLightbox(fullIndex !== -1 ? fullIndex : idx);
  };

  return (
    <div
      className="break-inside-avoid mb-6 md:mb-7 animate-entrance-card"
      style={{
        animationDelay: `${cardDelay}ms`,
      }}
    >
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative cursor-pointer overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-200 shadow-[0_6px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 isolate select-none transform-gpu"
      >
        {/* Media Container */}
        <div className="relative w-full overflow-hidden">
          {/* Base Thumbnail Image (Always stays rendered for zero layout shift) */}
          <Image
            src={itemThumbnail}
            alt={item.subcategoryLabel || 'Portfolio Work'}
            width={1200}
            height={1200}
            priority={idx < 4}
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full h-auto block object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
          />

          {/* Ambient Gradient for Legibility (fades out during video preview) */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none transition-opacity duration-300 ${
              isPreviewActive ? 'opacity-0' : 'opacity-40 group-hover:opacity-60'
            }`}
          />

          {/* ========================================================= */}
          {/* 10-SECOND VIDEO HOVER PREVIEW LAYER                       */}
          {/* ========================================================= */}
          {isVideo && isPreviewActive && (
            <div
              className={`absolute inset-0 z-[6] overflow-hidden pointer-events-none transition-opacity duration-500 ${
                isMediaReady ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {isYouTube ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=0&start=0&end=10&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1`}
                  title={item.subcategoryLabel || 'Video Preview'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onLoad={() => setIsMediaReady(true)}
                  className="w-full h-full object-cover pointer-events-none scale-[1.04]"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={item.videoUrl}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onLoadedData={() => setIsMediaReady(true)}
                  onTimeUpdate={(e) => {
                    if (e.currentTarget.currentTime >= 10) {
                      e.currentTarget.pause();
                      handlePreviewEnd();
                    }
                  }}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 10-SECOND PROGRESS BAR INDICATOR                          */}
          {/* ========================================================= */}
          {isVideo && isPreviewActive && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40 z-20 pointer-events-none overflow-hidden">
              <div
                className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all ease-linear"
                style={{
                  width: isMediaReady ? '100%' : '0%',
                  transitionDuration: isMediaReady ? '10000ms' : '0ms',
                }}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* CENTRAL PLAY BUTTON INDICATOR                             */}
          {/* ========================================================= */}
          {item.type === 'video' && (
            <div
              className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-all duration-300 ${
                isPreviewActive
                  ? 'opacity-0 scale-75'
                  : 'opacity-100 scale-95 group-hover:scale-110'
              }`}
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl backdrop-blur-md transition-all duration-300 group-hover:bg-white">
                <Play className="w-6 h-6 md:w-7 md:h-7 fill-current translate-x-0.5" />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* BOTTOM-LEFT TAG: SUBCATEGORY PILL                         */}
          {/* Disembunyikan saat hover & play, muncul kembali saat idle/berhenti */}
          {/* ========================================================= */}
          <div
            className={`absolute bottom-4 left-4 z-10 pointer-events-none transition-all duration-300 ${
              isPreviewActive
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            }`}
          >
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/95 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm inline-block">
              {item.subcategoryLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(GalleryCard);
