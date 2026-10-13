'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface AdminMediaThumbnailProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}

/**
 * High-performance, resilient thumbnail component for Admin dashboards.
 * Bypasses Next.js server-side image proxy bottleneck, loading directly from CDN edge.
 * Automatically falls back to raw URL if transformation fails, and renders a clean
 * placeholder UI rather than the browser's broken image icon.
 */
export default function AdminMediaThumbnail({
  src,
  fallbackSrc,
  alt,
  className,
}: AdminMediaThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    // If the optimized URL failed, attempt to fall back to the raw source URL
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !currentSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
        <ImageIcon className="w-4 h-4 opacity-40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={className || 'w-full h-full object-cover'}
    />
  );
}
