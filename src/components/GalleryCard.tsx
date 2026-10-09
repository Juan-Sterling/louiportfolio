'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import {
  MediaItem,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from '@/data/portfolioData';
import { resolveVideoPlayUrl } from '@/lib/r2';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface GalleryCardProps {
  item: MediaItem;
  idx: number;
  fullIndex: number;
  hasMounted: boolean;
  isInitialEntrance?: boolean;
  onOpenLightbox: (index: number) => void;
  aspectRatio?: number;
}

function GalleryCard({
  item,
  idx,
  fullIndex,
  hasMounted,
  isInitialEntrance = true,
  onOpenLightbox,
  aspectRatio,
}: GalleryCardProps) {
  // Video preview states
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [isMediaReady, setIsMediaReady] = useState<boolean>(false);
  const [hasCompletedPreview, setHasCompletedPreview] = useState<boolean>(false);
  const [previewDuration, setPreviewDuration] = useState<number>(10);

  // Timers refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Staggered entrance animation delay
  // Snappy delay so cards appear smoothly and stably together
  const baseDelay = 40;
  const stepDelay = 20;
  const maxDelay = 220;
  const cardDelay = Math.min(idx * stepDelay + baseDelay, maxDelay);

  // Lock animation class and delay at mount so cards NEVER flicker or restart animation mid-flight
  const [animationClass] = useState(() => (isInitialEntrance ? 'animate-entrance-card' : 'animate-fadeIn'));
  const [animationDelayStyle] = useState(() => (isInitialEntrance ? `${cardDelay}ms` : '0ms'));

  // Video helpers
  const isVideo = item.type === 'video' && Boolean(item.videoUrl);
  const isYouTube = isVideo && item.videoUrl ? Boolean(getYouTubeVideoId(item.videoUrl)) : false;
  const youtubeId = isYouTube && item.videoUrl ? getYouTubeVideoId(item.videoUrl) : null;
  const isShorts = isVideo && item.videoUrl ? item.videoUrl.includes('/shorts/') : false;

  // Thumbnail source with safe fallback for direct videos
  const fallbackThumbnail = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23141419"/></svg>';
  const rawThumbnail =
    (isYouTube && item.videoUrl ? getYouTubeThumbnail(item.videoUrl) || item.image : item.image) || fallbackThumbnail;
  // Compress and deliver optimized modern format (WebP/AVIF) at max width 1200 (~250KB instead of 10MB)
  const itemThumbnail = getOptimizedCloudinaryUrl(resolveVideoPlayUrl(rawThumbnail), {
    width: 1200,
  });


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

  // Mouse enter: trigger debounced video preview
  const handleMouseEnter = () => {
    if (isVideo) {
      clearTimers();
      setHasCompletedPreview(false);
      setPreviewDuration(10);

      // Debounce slightly (220ms) so fast mouse passes across the grid don't trigger iframes
      debounceTimerRef.current = setTimeout(() => {
        setIsPreviewActive(true);
        setIsMediaReady(false);

        // Preview limit fallback: 10s (disesuaikan otomatis jika durasi asli < 10s)
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
    setPreviewDuration(10);
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
    setPreviewDuration(10);
    onOpenLightbox(fullIndex !== -1 ? fullIndex : idx);
  };

  return (
    <div className="break-inside-avoid mb-6 md:mb-7 block w-full">
      <div
        className={animationClass}
        style={{
          animationDelay: animationDelayStyle,
        }}
      >
        <div
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="group relative cursor-pointer overflow-hidden rounded-[24px] md:rounded-[30px] bg-neutral-200 shadow-[0_6px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 select-none"
        >
          {/* Media Container (Locked to exact aspect ratio for 0 Cumulative Layout Shift) */}
          <div
            className={`relative w-full overflow-hidden ${isShorts ? 'aspect-[4/5]' : ''}`}
            style={aspectRatio && !isShorts ? { aspectRatio: `${aspectRatio}` } : undefined}
          >
            {/* Base Thumbnail Image (Always stays rendered for zero layout shift) */}
            <Image
              src={itemThumbnail}
              alt={item.subcategoryLabel || 'Portfolio Work'}
              width={1200}
              height={aspectRatio ? Math.round(1200 / aspectRatio) : 1200}
              priority={idx < 12}
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={`w-full ${
                isShorts ? 'h-full' : 'h-auto'
              } block object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105`}
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
                    src={resolveVideoPlayUrl(item.videoUrl)}
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      if (dur && isFinite(dur) && dur > 0) {
                        const effective = dur < 10 ? dur : 10;
                        setPreviewDuration(effective);
                        if (durationTimerRef.current) {
                          clearTimeout(durationTimerRef.current);
                          const remainingTime = Math.max(0, effective - e.currentTarget.currentTime) * 1000;
                          durationTimerRef.current = setTimeout(() => {
                            handlePreviewEnd();
                          }, remainingTime);
                        }
                      }
                    }}
                    onLoadedData={(e) => {
                      setIsMediaReady(true);
                      const dur = e.currentTarget.duration;
                      if (dur && isFinite(dur) && dur > 0) {
                        const effective = dur < 10 ? dur : 10;
                        setPreviewDuration(effective);
                        if (durationTimerRef.current) {
                          clearTimeout(durationTimerRef.current);
                          const remainingTime = Math.max(0, effective - e.currentTarget.currentTime) * 1000;
                          durationTimerRef.current = setTimeout(() => {
                            handlePreviewEnd();
                          }, remainingTime);
                        }
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const dur = e.currentTarget.duration;
                      const maxDur = dur && isFinite(dur) && dur > 0 && dur < 10 ? dur : 10;
                      if (e.currentTarget.currentTime >= maxDur) {
                        e.currentTarget.pause();
                        handlePreviewEnd();
                      }
                    }}
                    onEnded={handlePreviewEnd}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* DYNAMIC PROGRESS BAR INDICATOR (MAX 10S / DURASI ASLI)    */}
            {/* ========================================================= */}
            {isVideo && isPreviewActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40 z-20 pointer-events-none overflow-hidden">
                <div
                  className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all ease-linear"
                  style={{
                    width: isMediaReady ? '100%' : '0%',
                    transitionDuration: isMediaReady ? `${Math.round(previewDuration * 1000)}ms` : '0ms',
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
            {/* SEMENTARA DISEMBUNYIKAN (dapat diaktifkan kembali jika diperlukan) */}
            {/* ========================================================= */}
            {/*
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
            */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(GalleryCard);
