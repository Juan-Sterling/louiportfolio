'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Layers } from 'lucide-react';
import {
  MediaItem,
  getNormalizedSlides,
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
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [previewDuration, setPreviewDuration] = useState<number>(10);
  const previewDurationRef = useRef<number>(10);

  // Timers and element refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const youtubeStartTimeRef = useRef<number | null>(null);

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

  // Safe helper to dispatch commands to embedded YouTube player
  const sendYouTubeCommand = useCallback((func: string, args: unknown[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
      } catch {
        // Ignore cross-origin errors
      }
    }
  }, []);

  // Clear all pending timers and reset media elements
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    youtubeStartTimeRef.current = null;
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {
        // Ignore video pause errors
      }
    }
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleX(0)';
    }
  }, []);

  // Gracefully end preview if needed
  const handlePreviewEnd = useCallback(() => {
    clearTimers();
    setIsPreviewActive(false);
    setIsMediaReady(false);
    setIsBuffering(false);
  }, [clearTimers]);

  // YouTube 10-second preview loop animation (Only runs when YouTube is actually playing)
  const startYouTubeProgress = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    youtubeStartTimeRef.current = performance.now();

    const loopDur = 10; // Exactly 10 seconds max preview!

    const tick = () => {
      if (!youtubeStartTimeRef.current) return;
      const now = performance.now();
      const elapsed = (now - youtubeStartTimeRef.current) / 1000;

      if (elapsed >= loopDur) {
        // 10s reached: Loop YouTube back to 0:00!
        sendYouTubeCommand('seekTo', [0, true]);
        sendYouTubeCommand('playVideo', []);
        youtubeStartTimeRef.current = performance.now();
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = 'scaleX(0)';
        }
      } else {
        const ratio = Math.min(1, Math.max(0, elapsed / loopDur));
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${ratio})`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [sendYouTubeCommand]);

  // Direct video (Cloudflare / R2) preview loop animation (Max 10s or video duration if shorter)
  const startDirectVideoProgress = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const tick = () => {
      if (videoRef.current && progressBarRef.current) {
        const cur = videoRef.current.currentTime;
        const maxDur = previewDurationRef.current || 10;

        if (cur >= maxDur) {
          // Preview limit reached: rewind video to 0:00 and continue looping!
          videoRef.current.currentTime = 0;
          progressBarRef.current.style.transform = 'scaleX(0)';
        } else {
          const ratio = Math.min(1, Math.max(0, cur / maxDur));
          progressBarRef.current.style.transform = `scaleX(${ratio})`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Listen to YouTube player state changes to know EXACTLY when video starts playing
  useEffect(() => {
    if (!isPreviewActive || !isYouTube) return;

    const handleWindowMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) {
        return;
      }

      let data: any;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }

      if (!data) return;

      if (data.event === 'onReady') {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
        } catch {}
      }

      // 1 = PLAYING, 3 = BUFFERING, 0 = ENDED
      if (data.event === 'onStateChange') {
        if (data.info === 1) {
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setIsMediaReady(true);
          setIsBuffering(false);
          startYouTubeProgress();
        } else if (data.info === 3) {
          setIsBuffering(true);
        } else if (data.info === 0) {
          // If video finishes before 10s: rewind immediately
          sendYouTubeCommand('seekTo', [0, true]);
          sendYouTubeCommand('playVideo', []);
          youtubeStartTimeRef.current = performance.now();
          if (progressBarRef.current) {
            progressBarRef.current.style.transform = 'scaleX(0)';
          }
        }
      }

      if (data.event === 'infoDelivery' && data.info) {
        if (data.info.playerState === 1) {
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setIsMediaReady(true);
          setIsBuffering(false);
          startYouTubeProgress();
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [isPreviewActive, isYouTube, sendYouTubeCommand, startYouTubeProgress]);

  // Mouse enter: trigger debounced video preview
  const handleMouseEnter = () => {
    if (isVideo) {
      clearTimers();
      previewDurationRef.current = 10;
      setPreviewDuration(10);

      // Debounce slightly (220ms) so fast mouse passes across the grid don't trigger iframes
      debounceTimerRef.current = setTimeout(() => {
        setIsPreviewActive(true);
        setIsMediaReady(false);
        setIsBuffering(true);
      }, 220);
    }
  };

  // Mouse leave: Immediately cancel preview and clean up resources
  const handleMouseLeave = () => {
    clearTimers();
    setIsPreviewActive(false);
    setIsMediaReady(false);
    setIsBuffering(false);
    previewDurationRef.current = 10;
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
    setIsBuffering(false);
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
                    ref={iframeRef}
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}&widgetid=1`}
                    title={item.subcategoryLabel || 'Video Preview'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    onLoad={() => {
                      try {
                        iframeRef.current?.contentWindow?.postMessage(
                          JSON.stringify({ event: 'listening' }),
                          '*'
                        );
                      } catch {}

                      // Fallback timer: if onStateChange isn't delivered within 1200ms, start playback
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                      fallbackTimerRef.current = setTimeout(() => {
                        setIsMediaReady((prevReady) => {
                          if (!prevReady) {
                            setIsBuffering(false);
                            startYouTubeProgress();
                            return true;
                          }
                          return prevReady;
                        });
                      }, 1200);
                    }}
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
                        previewDurationRef.current = effective;
                        setPreviewDuration(effective);
                      }
                    }}
                    onWaiting={() => {
                      setIsBuffering(true);
                      if (rafRef.current) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                      }
                    }}
                    onPlaying={() => {
                      setIsMediaReady(true);
                      setIsBuffering(false);
                      startDirectVideoProgress();
                    }}
                    onEnded={(e) => {
                      try {
                        e.currentTarget.currentTime = 0;
                        e.currentTarget.play().catch(() => {});
                      } catch {}
                    }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* VIDEO BUFFERING / LOADING INDICATOR                       */}
            {/* ========================================================= */}
            {isVideo && isPreviewActive && (!isMediaReady || isBuffering) && (
              <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px] transition-all animate-fadeIn">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center shadow-2xl border border-white/20">
                  <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* DYNAMIC PROGRESS BAR INDICATOR (MAX 10S LOOPING)          */}
            {/* ========================================================= */}
            {isVideo && isPreviewActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40 z-20 pointer-events-none overflow-hidden">
                <div
                  ref={progressBarRef}
                  className="h-full w-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] origin-left will-change-transform"
                  style={{
                    transform: 'scaleX(0)',
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
            {/* MULTI-SLIDE CAROUSEL INDICATOR PILL                      */}
            {/* ========================================================= */}
            {(() => {
              const totalSlides = getNormalizedSlides(item).length;
              if (totalSlides <= 1) return null;
              return (
                <div
                  className={`absolute top-3.5 right-3.5 z-20 pointer-events-none transition-all duration-300 ${
                    isPreviewActive ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-white/95 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-md">
                    <Layers className="w-3 h-3 text-white/90" />
                    <span>{totalSlides}</span>
                  </span>
                </div>
              );
            })()}

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
