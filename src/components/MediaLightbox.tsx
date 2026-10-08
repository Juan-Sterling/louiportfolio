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
  Play,
  Pause,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import {
  MediaItem,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  isYouTubeUrl,
} from '@/data/portfolioData';
import { resolveVideoPlayUrl } from '@/lib/r2';

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Flag to prevent programmatic history.back() from closing subsequent modal sessions
let isProgrammaticBackActive = false;

export default function MediaLightbox({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: MediaLightboxProps) {
  const currentItem = items[currentIndex];

  // Stable loaded image buffer: Holds the previously loaded image so transitions never flash black
  const [activeLoadedSrc, setActiveLoadedSrc] = useState<string>(
    currentItem && currentItem.type !== 'video' ? currentItem.image : ''
  );
  const prevItemRef = useRef<MediaItem | null>(currentItem);

  // Bottom thumbnail strip visibility toggle
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Overall overlay controls visibility (toggled on single click/tap on screen)
  const [showOverlayControls, setShowOverlayControls] = useState<boolean>(true);

  // Video playback ref & state for mobile touch gestures and direct video
  const videoIframeRef = useRef<HTMLIFrameElement>(null);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const isVideoPlayingRef = useRef<boolean>(true);
  const [playPauseFeedback, setPlayPauseFeedback] = useState<'play' | 'pause' | null>(null);

  // Single-click timer ref to cleanly separate single-click (toggle UI) from double-click (zoom)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchToggleTimeRef = useRef<number>(0);

  // Zoom & Pan states
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Refs for rock-solid event handling without stale closure issues
  const scaleRef = useRef<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Guard against accidental backdrop close when dragging
  const backdropMouseDownRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const dragStartCoordRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  // Touch gesture refs
  const touchStartPos = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  // Sync refs with state
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Reset zoom & pan when navigating or closing
  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  // Toggle video playback via postMessage for YouTube or direct video element
  const toggleVideoPlayback = useCallback(() => {
    if (!currentItem || currentItem.type !== 'video') return;

    if (isYouTubeUrl(currentItem.videoUrl)) {
      const iframe = videoIframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      const nextState = !isVideoPlayingRef.current;
      isVideoPlayingRef.current = nextState;
      setIsVideoPlaying(nextState);

      const command = nextState ? 'playVideo' : 'pauseVideo';
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: '' }),
        '*'
      );
      if (nextState) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
          '*'
        );
      }

      setPlayPauseFeedback(nextState ? 'play' : 'pause');
      setTimeout(() => {
        setPlayPauseFeedback(null);
      }, 650);
    } else {
      const video = directVideoRef.current;
      if (!video) return;

      if (video.paused) {
        video.play().catch(() => {});
        isVideoPlayingRef.current = true;
        setIsVideoPlaying(true);
        setPlayPauseFeedback('play');
      } else {
        video.pause();
        isVideoPlayingRef.current = false;
        setIsVideoPlaying(false);
        setPlayPauseFeedback('pause');
      }

      setTimeout(() => {
        setPlayPauseFeedback(null);
      }, 650);
    }
  }, [currentItem]);

  // Reset video play state on item or open change
  useEffect(() => {
    setIsVideoPlaying(true);
    isVideoPlayingRef.current = true;
    setPlayPauseFeedback(null);
  }, [currentIndex, isOpen]);

  // Sync active loaded image buffer when lightbox opens or closes
  useEffect(() => {
    if (!isOpen) {
      setActiveLoadedSrc('');
      prevItemRef.current = null;
      setShowOverlayControls(true);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    } else if (currentItem && currentItem.type !== 'video' && !activeLoadedSrc) {
      setActiveLoadedSrc(currentItem.image);
      prevItemRef.current = currentItem;
    }
  }, [isOpen, currentItem, activeLoadedSrc]);

  // Navigation handlers with instant response and zoom reset
  const handlePrev = useCallback(() => {
    resetZoom();
    const newIdx = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    onNavigate(newIdx);
  }, [currentIndex, items, onNavigate, resetZoom]);

  const handleNext = useCallback(() => {
    resetZoom();
    const newIdx = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIdx);
  }, [currentIndex, items, onNavigate, resetZoom]);

  // Reset zoom on item or open status change
  useEffect(() => {
    resetZoom();
  }, [currentIndex, isOpen, resetZoom]);

  // Proactive preloading of adjacent images (Next 4, Prev 2)
  useEffect(() => {
    if (!isOpen || !items || items.length === 0) return;

    const indicesToPreload = [
      (currentIndex + 1) % items.length,
      (currentIndex + 2) % items.length,
      (currentIndex + 3) % items.length,
      (currentIndex + 4) % items.length,
      (currentIndex + 5) % items.length,
      (currentIndex + 6) % items.length,
      (currentIndex - 1 + items.length) % items.length,
      (currentIndex - 2 + items.length) % items.length,
      (currentIndex - 3 + items.length) % items.length,
      (currentIndex - 4 + items.length) % items.length,
    ];

    indicesToPreload.forEach((idx) => {
      const it = items[idx];
      if (!it) return;
      const targetUrl =
        it.type === 'video' && it.videoUrl
          ? getYouTubeThumbnail(it.videoUrl)
          : it.image;

      if (targetUrl) {
        const img = new window.Image();
        img.src = targetUrl;
        if ('decode' in img) {
          img.decode().catch(() => {});
        }
      }
    });
  }, [currentIndex, isOpen, items]);

  // Auto-scroll active thumbnail into center of bottom filmstrip
  useEffect(() => {
    if (!showThumbnails || !thumbnailScrollRef.current) return;
    const activeEl = thumbnailScrollRef.current.querySelector(
      `[data-thumb-index="${currentIndex}"]`
    ) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex, showThumbnails]);

  // Scroll wheel on filmstrip navigates to Next / Previous photo smoothly
  const lastFilmstripWheelTime = useRef<number>(0);

  useEffect(() => {
    const strip = thumbnailScrollRef.current;
    if (!strip || !showThumbnails || !items || items.length <= 1) return;

    const onFilmstripWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      // Throttle wheel navigation to 200ms per step
      if (now - lastFilmstripWheelTime.current < 200) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

      if (Math.abs(delta) > 8) {
        lastFilmstripWheelTime.current = now;
        if (delta > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    strip.addEventListener('wheel', onFilmstripWheel, { passive: false });
    return () => {
      strip.removeEventListener('wheel', onFilmstripWheel);
    };
  }, [showThumbnails, items, handleNext, handlePrev]);

  // Drag-to-scroll for horizontal filmstrip
  const isStripDraggingRef = useRef<boolean>(false);
  const stripStartXRef = useRef<number>(0);
  const stripScrollLeftRef = useRef<number>(0);
  const stripHasMovedRef = useRef<boolean>(false);

  const handleStripMouseDown = (e: React.MouseEvent) => {
    const strip = thumbnailScrollRef.current;
    if (!strip) return;
    isStripDraggingRef.current = true;
    stripStartXRef.current = e.pageX - strip.offsetLeft;
    stripScrollLeftRef.current = strip.scrollLeft;
    stripHasMovedRef.current = false;
  };

  useEffect(() => {
    const handleStripMouseMove = (e: MouseEvent) => {
      if (!isStripDraggingRef.current || !thumbnailScrollRef.current) return;
      e.preventDefault();
      const strip = thumbnailScrollRef.current;
      const x = e.pageX - strip.offsetLeft;
      const walk = (x - stripStartXRef.current) * 1.5;
      if (Math.abs(walk) > 4) {
        stripHasMovedRef.current = true;
      }
      strip.scrollLeft = stripScrollLeftRef.current - walk;
    };

    const handleStripMouseUp = () => {
      if (isStripDraggingRef.current) {
        isStripDraggingRef.current = false;
        setTimeout(() => {
          stripHasMovedRef.current = false;
        }, 100);
      }
    };

    window.addEventListener('mousemove', handleStripMouseMove);
    window.addEventListener('mouseup', handleStripMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleStripMouseMove);
      window.removeEventListener('mouseup', handleStripMouseUp);
    };
  }, []);

  // Zoom step handlers
  const handleZoomIn = useCallback(() => {
    if (currentItem?.type === 'video') return;
    setScale((prev) => {
      const next = Math.min(4, Number((prev + 0.5).toFixed(2)));
      scaleRef.current = next;
      return next;
    });
  }, [currentItem]);

  const handleZoomOut = useCallback(() => {
    if (currentItem?.type === 'video') return;
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(2)));
      scaleRef.current = next;
      if (next === 1) {
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
      } else {
        const container = containerRef.current;
        if (container) {
          const maxPanX = Math.max(0, ((next - 1) * container.clientWidth) / 2);
          const maxPanY = Math.max(0, ((next - 1) * container.clientHeight) / 2);
          setPan((curPan) => {
            const clamped = {
              x: Math.min(maxPanX, Math.max(-maxPanX, curPan.x)),
              y: Math.min(maxPanY, Math.max(-maxPanY, curPan.y)),
            };
            panRef.current = clamped;
            return clamped;
          });
        }
      }
      return next;
    });
  }, [currentItem]);

  const lastToggleTimestampRef = useRef<number>(0);

  // Toggle overlay controls (filmstrip & navigation arrows) with strict 350ms throttle
  const toggleOverlayControls = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTimestampRef.current < 350) {
      return;
    }
    lastToggleTimestampRef.current = now;
    setShowOverlayControls((prev) => !prev);
  }, []);

  // Single-click / tap on media to toggle filmstrip & navigation arrows
  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Prevent mobile touch ghost-click from toggling twice within 700ms
    if (Date.now() - lastTouchToggleTimeRef.current < 700) {
      return;
    }

    // Never toggle if user was dragging or panning
    if (hasDraggedRef.current || isDraggingRef.current) {
      return;
    }

    if (currentItem?.type === 'video') {
      toggleOverlayControls();
      return;
    }

    // Debounce single-click slightly so double-click zoom doesn't trigger UI toggle on photos
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        toggleOverlayControls();
      }, 220);
    }
  };

  // Double click toggles between 1x and 2.2x zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (currentItem?.type === 'video') return;

    if (scale > 1) {
      resetZoom();
    } else {
      const container = containerRef.current;
      const targetScale = 2.2;
      scaleRef.current = targetScale;
      setScale(targetScale);

      if (container) {
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - (rect.left + rect.width / 2);
        const clickY = e.clientY - (rect.top + rect.height / 2);

        const maxPanX = Math.max(0, ((targetScale - 1) * rect.width) / 2);
        const maxPanY = Math.max(0, ((targetScale - 1) * rect.height) / 2);

        const targetPanX = -clickX * (targetScale - 1);
        const targetPanY = -clickY * (targetScale - 1);

        const clamped = {
          x: Math.min(maxPanX, Math.max(-maxPanX, targetPanX)),
          y: Math.min(maxPanY, Math.max(-maxPanY, targetPanY)),
        };
        panRef.current = clamped;
        setPan(clamped);
      }
    }
  };

  // Dedicated non-passive wheel zoom listener on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      if (currentItem?.type === 'video') return;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setScale((prev) => {
        const next = Math.min(4, Math.max(1, Number((prev + delta).toFixed(2))));
        scaleRef.current = next;

        if (next === 1) {
          setPan({ x: 0, y: 0 });
          panRef.current = { x: 0, y: 0 };
        } else {
          const maxPanX = Math.max(0, ((next - 1) * container.clientWidth) / 2);
          const maxPanY = Math.max(0, ((next - 1) * container.clientHeight) / 2);

          setPan((curPan) => {
            const clamped = {
              x: Math.min(maxPanX, Math.max(-maxPanX, curPan.x)),
              y: Math.min(maxPanY, Math.max(-maxPanY, curPan.y)),
            };
            panRef.current = clamped;
            return clamped;
          });
        }
        return next;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [isOpen, currentItem]);

  // Start mouse drag on container
  const handleMouseDown = (e: React.MouseEvent) => {
    backdropMouseDownRef.current = false;
    if (currentItem?.type === 'video') return;
    if (scale <= 1) return;
    if (e.button !== 0) return; // Only left click

    e.preventDefault();
    e.stopPropagation();
    hasDraggedRef.current = false;
    dragStartCoordRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - panRef.current.x,
      y: e.clientY - panRef.current.y,
    };
  };

  // Global window listeners for drag movement & release
  // Guarantees dragging never drops, freezes, or accidentally closes the modal
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || scaleRef.current <= 1) return;
      e.preventDefault();

      // Check if mouse actually moved (distinguishes drag from click)
      const dx = Math.abs(e.clientX - dragStartCoordRef.current.x);
      const dy = Math.abs(e.clientY - dragStartCoordRef.current.y);
      if (dx > 3 || dy > 3) {
        hasDraggedRef.current = true;
      }

      const container = containerRef.current;
      const currentScale = scaleRef.current;
      const maxPanX = container
        ? Math.max(0, ((currentScale - 1) * container.clientWidth) / 2)
        : 600;
      const maxPanY = container
        ? Math.max(0, ((currentScale - 1) * container.clientHeight) / 2)
        : 600;

      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;

      const clamped = {
        x: Math.min(maxPanX, Math.max(-maxPanX, rawX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, rawY)),
      };

      panRef.current = clamped;
      setPan(clamped);
    };

    const handleWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        // Retain hasDraggedRef flag for 200ms to block any synthetic/bubbling clicks
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 200);
      }
      backdropMouseDownRef.current = false;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  // Backdrop click guards — ensures dragging never accidentally closes the lightbox
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      backdropMouseDownRef.current = true;
    } else {
      backdropMouseDownRef.current = false;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!backdropMouseDownRef.current) return;
    backdropMouseDownRef.current = false;

    // Never close if any drag just occurred
    if (hasDraggedRef.current || isDraggingRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Touch handlers for mobile (Single-finger pan when zoomed, Pinch-to-zoom, Swipe when 1x, Single-tap toggle)
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();

    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };

      if (currentItem?.type !== 'video' && scale > 1) {
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX - panRef.current.x,
          y: e.touches[0].clientY - panRef.current.y,
        };
      }
    } else if (e.touches.length === 2 && currentItem?.type !== 'video') {
      // 2 fingers: Start pinch-to-zoom
      setIsDragging(true);
      isDraggingRef.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scaleRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (currentItem?.type === 'video') return;

    // Pinch-to-zoom handling
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      const nextScale = Math.min(
        4,
        Math.max(1, Number((pinchStartScaleRef.current * ratio).toFixed(2)))
      );

      scaleRef.current = nextScale;
      setScale(nextScale);

      if (nextScale === 1) {
        panRef.current = { x: 0, y: 0 };
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    // Single finger pan when zoomed in
    if (e.touches.length === 1 && scale > 1 && isDraggingRef.current) {
      const container = containerRef.current;
      const currentScale = scaleRef.current;
      const maxPanX = container
        ? Math.max(0, ((currentScale - 1) * container.clientWidth) / 2)
        : 600;
      const maxPanY = container
        ? Math.max(0, ((currentScale - 1) * container.clientHeight) / 2)
        : 600;

      const rawX = e.touches[0].clientX - dragStartRef.current.x;
      const rawY = e.touches[0].clientY - dragStartRef.current.y;

      const clamped = {
        x: Math.min(maxPanX, Math.max(-maxPanX, rawX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, rawY)),
      };

      panRef.current = clamped;
      setPan(clamped);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();

    if (pinchStartDistRef.current) {
      pinchStartDistRef.current = null;
      setIsDragging(false);
      isDraggingRef.current = false;
      return;
    }

    if (scale > 1) {
      setIsDragging(false);
      isDraggingRef.current = false;
      return;
    }

    // Touch gesture detection (Swipe navigation & Single-tap toggle for BOTH photo and video)
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartPos.current.x;
      const deltaY = touchEndY - touchStartPos.current.y;
      const elapsedTime = Date.now() - touchStartPos.current.time;

      if (
        Math.abs(deltaX) > 35 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
        elapsedTime < 600
      ) {
        // Horizontal swipe gesture for photo AND video!
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
        lastTouchToggleTimeRef.current = Date.now();
      } else if (
        Math.abs(deltaX) < 25 &&
        Math.abs(deltaY) < 25 &&
        elapsedTime < 450
      ) {
        // Single tap on mobile screen (Photo and Video)
        lastTouchToggleTimeRef.current = Date.now();
        toggleOverlayControls();
      }
    }
  };

  // Body scroll lock (only toggles once when modal opens/closes)
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Keyboard navigation and shortcuts
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handlePrev, handleNext, handleZoomIn, handleZoomOut, resetZoom, onClose]);

  // Keep stable ref for onClose callback
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Intercept mobile hardware/gesture & browser back button to close modal instead of exiting website
  useEffect(() => {
    if (!isOpen) return;

    let isClosedByPopState = false;

    // Push state into browser history so mobile back button pops this entry first
    const currentHistoryState = window.history.state || {};
    window.history.pushState(
      { ...currentHistoryState, __lightboxModal: true },
      ''
    );

    const handlePopState = () => {
      if (isProgrammaticBackActive) {
        isProgrammaticBackActive = false;
        return;
      }
      isClosedByPopState = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // If user closed modal via UI (X button, backdrop click, Escape key) rather than phone back button,
      // revert the history entry we pushed so browser history remains completely clean.
      if (!isClosedByPopState) {
        if (window.history.state?.__lightboxModal) {
          isProgrammaticBackActive = true;
          window.history.back();
          setTimeout(() => {
            isProgrammaticBackActive = false;
          }, 150);
        }
      }
    };
  }, [isOpen]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-fadeIn p-1 sm:p-2 md:p-3 overflow-hidden"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      {/* Top Header Toolbar */}
      <div
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 md:px-10 py-2.5 sm:py-3.5 text-white pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-transparent"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          backdropMouseDownRef.current = false;
        }}
      >
        {/* Left: Category Badge & Counter */}
        <div className="flex flex-col gap-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/90 bg-white/10 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-white/15 backdrop-blur-md truncate max-w-[180px] sm:max-w-none">
              <span className="hidden sm:inline">{currentItem.categoryLabel} • </span>
              <span>{currentItem.subcategoryLabel}</span>
            </span>
            <span className="text-[11px] sm:text-xs font-mono text-white/60 tracking-wider shrink-0 font-medium">
              {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          </div>

          {currentItem.description && (
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] text-neutral-400 font-sans pl-1 line-clamp-1 hidden md:block">
              {currentItem.description}
            </p>
          )}
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Toggle Filmstrip Strip Button */}
          {items.length > 1 && (
            <button
              onClick={() => {
                setShowThumbnails((prev) => !prev);
                setShowOverlayControls(true);
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-all ${
                showThumbnails && showOverlayControls
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              title={showThumbnails && showOverlayControls ? 'Hide Filmstrip' : 'Show Filmstrip'}
              aria-label="Toggle Filmstrip"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Zoom Controls Pill for Photos */}
          {currentItem.type !== 'video' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 transition-all text-white">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={resetZoom}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-medium tracking-wider hover:bg-white/20 transition-all flex items-center gap-1 active:scale-95"
                title="Reset Zoom (0 / Double-click)"
              >
                <span>{Math.round(scale * 100)}%</span>
                {scale > 1 && <RotateCcw className="w-3 h-3 text-neutral-300" />}
              </button>

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

          {/* Open Link for Video: Only for YouTube */}
          {currentItem.type === 'video' &&
            currentItem.videoUrl &&
            isYouTubeUrl(currentItem.videoUrl) && (
              <a
                href={currentItem.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 shrink-0"
                title="Open in YouTube"
                aria-label="Open in YouTube"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-200 border border-white/15 shrink-0"
            aria-label="Close Preview"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Left Arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className={`absolute left-1.5 sm:left-3 md:left-6 z-40 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-90 active:bg-white active:text-black shadow-lg ${
            showOverlayControls
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 -translate-x-6 pointer-events-none'
          }`}
          aria-label="Previous Photo (Arrow Left)"
          title="Previous (←)"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Navigation Right Arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className={`absolute right-1.5 sm:right-3 md:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300 border border-white/15 backdrop-blur-md hover:scale-105 active:scale-90 active:bg-white active:text-black shadow-lg ${
            showOverlayControls
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 translate-x-6 pointer-events-none'
          }`}
          aria-label="Next Photo (Arrow Right)"
          title="Next (→)"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Central Media Stage */}
      <div
        className={`relative w-full max-w-[96vw] xl:max-w-[94vw] 2xl:max-w-[1650px] flex items-center justify-center my-auto transition-all duration-300 touch-pan-y ${
          showOverlayControls && showThumbnails && items.length > 1
            ? 'h-[calc(100vh-130px)] sm:h-[calc(100vh-140px)] min-h-[300px] pt-10 sm:pt-12 pb-1'
            : 'h-[calc(100vh-75px)] sm:h-[calc(100vh-85px)] min-h-[320px] pt-8 sm:pt-10 pb-1'
        }`}
        onClick={handleMediaClick}
        onMouseDown={(e) => {
          e.stopPropagation();
          backdropMouseDownRef.current = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentItem.type === 'video' ? (
          /* Video Modal Player (YouTube or Direct Cloudflare R2 / MP4) */
          <div
            key={currentItem.id || currentIndex}
            className={`relative w-full ${
              currentItem.videoUrl?.includes('/shorts/')
                ? 'aspect-[4/5] max-w-lg sm:max-w-xl md:max-w-2xl'
                : 'aspect-video max-w-6xl xl:max-w-7xl 2xl:max-w-[1450px]'
            } max-h-full rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center`}
          >
            {isYouTubeUrl(currentItem.videoUrl) ? (
              <>
                <iframe
                  ref={videoIframeRef}
                  src={
                    getYouTubeEmbedUrl(currentItem.videoUrl) ||
                    'https://www.youtube-nocookie.com/embed/XyLoPRmUR3s?autoplay=1&enablejsapi=1'
                  }
                  title={currentItem.subcategoryLabel || 'YouTube Video Player'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full object-cover"
                />

                {/* Gesture & Click Overlay for Video: enables horizontal swipe & single-click toggle on mobile and desktop */}
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none touch-pan-y"
                  onClick={handleMediaClick}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Play / Pause instant feedback animation */}
                  {playPauseFeedback && (
                    <div className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center pointer-events-none animate-fadeIn shadow-2xl border border-white/20">
                      {playPauseFeedback === 'play' ? (
                        <Play className="w-7 h-7 fill-current translate-x-0.5" />
                      ) : (
                        <Pause className="w-7 h-7 fill-current" />
                      )}
                    </div>
                  )}

                  {/* Show persistent play badge if video is paused */}
                  {!isVideoPlaying && !playPauseFeedback && (
                    <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center pointer-events-none shadow-2xl border border-white/20">
                      <Play className="w-7 h-7 fill-current translate-x-0.5" />
                    </div>
                  )}
                </div>

                {/* Dedicated Play/Pause Controller in bottom-left corner for YouTube */}
                {showOverlayControls && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideoPlayback();
                    }}
                    className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-medium border border-white/20 backdrop-blur-md shadow-lg transition-all active:scale-95"
                    title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {isVideoPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[11px] font-sans">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[11px] font-sans">Play</span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              /* Direct Video Player */
              <div
                className="relative w-full h-full flex items-center justify-center bg-black select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <video
                  ref={directVideoRef}
                  src={resolveVideoPlayUrl(currentItem.videoUrl)}
                  poster={currentItem.image || undefined}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
                  onPlay={() => {
                    isVideoPlayingRef.current = true;
                    setIsVideoPlaying(true);
                  }}
                  onPause={() => {
                    isVideoPlayingRef.current = false;
                    setIsVideoPlaying(false);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Pure Fullscreen Photo View */
          <div
            ref={containerRef}
            className={`relative w-full h-full max-w-[96vw] xl:max-w-[94vw] 2xl:max-w-[1650px] rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center select-none ${
              scale > 1
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-pointer'
            }`}
            onClick={handleMediaClick}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            title={
              scale > 1
                ? 'Drag to pan • Double-click or scroll wheel to reset'
                : 'Click to toggle controls • Double-click to zoom'
            }
          >
            {/* Dedicated Interactive Zoom & Pan stage (never unmounted to prevent visual flicker) */}
            <div
              className="relative w-full h-full flex items-center justify-center will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging
                  ? 'none'
                  : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Seamless Underlay: Previous image stays 100% visible underneath while incoming image paints */}
              {activeLoadedSrc &&
                activeLoadedSrc !== currentItem.image &&
                prevItemRef.current?.type !== 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <Image
                      src={activeLoadedSrc}
                      alt=""
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1280px) 96vw, 1920px"
                      className="object-contain pointer-events-none select-none"
                      draggable={false}
                    />
                  </div>
                )}

              {/* Active High-Performance Image */}
              <div className="relative w-full h-full flex items-center justify-center z-10">
                <Image
                  src={currentItem.image}
                  alt={currentItem.subcategoryLabel || 'Portfolio Image'}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 1280px) 96vw, 1920px"
                  className="object-contain pointer-events-none select-none"
                  draggable={false}
                  onLoad={() => {
                    setActiveLoadedSrc(currentItem.image);
                    prevItemRef.current = currentItem;
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip: Fully Scrollable & Interactive */}
      {items.length > 1 && (
        <div
          className={`absolute bottom-2 sm:bottom-3 left-0 right-0 z-40 flex justify-center px-2 sm:px-4 pointer-events-auto transition-all duration-300 ${
            showOverlayControls && showThumbnails
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 max-w-[96vw] sm:max-w-2xl md:max-w-3xl shadow-2xl">
            {/* Filmstrip Mini Left Chevron */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0 active:scale-90"
              title="Previous Photo (Scroll Up / ←)"
              aria-label="Previous Photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Thumbnails Container: Supports mouse wheel, mouse drag, and touch scroll */}
            <div
              ref={thumbnailScrollRef}
              onMouseDown={handleStripMouseDown}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 px-0.5 cursor-grab active:cursor-grabbing select-none"
            >
              {items.map((item, idx) => {
                const rawThumb =
                  item.type === 'video' && item.videoUrl
                    ? getYouTubeThumbnail(item.videoUrl) || item.image
                    : item.image;
                const thumb = resolveVideoPlayUrl(rawThumb);
                const isActive = idx === currentIndex;

                return (
                  <button
                    key={item.id || idx}
                    data-thumb-index={idx}
                    onClick={(e) => {
                      if (stripHasMovedRef.current) {
                        e.preventDefault();
                        return;
                      }
                      if (idx !== currentIndex) {
                        resetZoom();
                        onNavigate(idx);
                      }
                    }}
                    className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl overflow-hidden shrink-0 transition-all duration-200 group ${
                      isActive
                        ? 'ring-2 ring-white scale-105 opacity-100 shadow-md'
                        : 'opacity-40 hover:opacity-85 hover:scale-100 scale-95'
                    }`}
                    aria-label={`Jump to ${item.subcategoryLabel || `slide ${idx + 1}`}`}
                    title={`${idx + 1}. ${item.subcategoryLabel || 'Slide'}`}
                  >
                    <Image
                      src={
                        thumb ||
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%2322222a"/></svg>'
                      }
                      alt={item.subcategoryLabel || `Thumb ${idx + 1}`}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                        <Play className="w-3 h-3 text-white fill-current" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filmstrip Mini Right Chevron */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0 active:scale-90"
              title="Next Photo (Scroll Down / →)"
              aria-label="Next Photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
