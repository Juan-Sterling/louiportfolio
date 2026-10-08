/**
 * Cloudflare R2 Storage Client Helper
 * Handles direct-to-R2 presigned uploads, client-side video frame capture,
 * and media deletion without passing heavy video streams through Vercel.
 */

export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024; // 100MB

/**
 * Checks if a given URL originates from Cloudflare R2 storage
 */
export function isCloudflareR2Url(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('.r2.dev') ||
    url.includes('.r2.cloudflarestorage.com') ||
    url.includes('cdn.justermp.my.id') ||
    Boolean(
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL &&
      url.startsWith(process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, ''))
    ) ||
    (url.includes('/louiportfolio/') && !url.includes('res.cloudinary.com'))
  );
}

/**
 * Extracts R2 object key from a full public URL or returns clean key
 */
export function extractR2Key(keyOrUrl?: string): string | null {
  if (!keyOrUrl) return null;
  const clean = keyOrUrl.split('?')[0];

  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
  if (publicUrl && clean.startsWith(publicUrl)) {
    return clean.replace(publicUrl, '').replace(/^\//, '');
  }

  // Fallback for custom cdn domain
  const cdnMatch = clean.match(/https?:\/\/cdn\.justermp\.my\.id\/(.+)$/);
  if (cdnMatch) {
    return decodeURIComponent(cdnMatch[1]);
  }

  // Fallback for r2.dev domain
  const r2DevMatch = clean.match(/https?:\/\/[^/]+\.r2\.dev\/(.+)$/);
  if (r2DevMatch) {
    return decodeURIComponent(r2DevMatch[1]);
  }

  // Fallback for full URLs: preserve folder hierarchy (e.g. louiportfolio/...)
  try {
    const urlObj = new URL(clean);
    return decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
  } catch {
    return clean.replace(/^\//, '');
  }
}

/**
 * Resolves the public URL for any media (videos and image thumbnails).
 * If the URL is hosted on *.r2.dev (which is filtered by Indonesian ISPs / Internet Positif),
 * it seamlessly streams via the internal Next.js streaming route (/api/media/r2/stream?key=...)
 * or rewrites to the configured custom domain (cdn.justermp.my.id) for direct edge delivery.
 */
export function resolveR2MediaUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('.r2.dev')) {
    const key = extractR2Key(url);
    if (key) {
      const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
      if (publicUrl && !publicUrl.includes('.r2.dev')) {
        return `${publicUrl}/${key}`;
      }
      return `/api/media/r2/stream?key=${encodeURIComponent(key)}`;
    }
  }
  return url;
}

export function resolveVideoPlayUrl(videoUrl?: string): string {
  return resolveR2MediaUrl(videoUrl);
}

/**
 * Checks if R2 backend API is fully configured
 */
export async function checkR2Status(): Promise<{ isConfigured: boolean; message?: string }> {
  try {
    const res = await fetch('/api/media/r2/presigned');
    if (!res.ok) return { isConfigured: false };
    const data = await res.json();
    return { isConfigured: Boolean(data.isConfigured), message: data.message };
  } catch {
    return { isConfigured: false };
  }
}

/**
 * Uploads a video file directly to Cloudflare R2 using a Presigned PUT URL.
 * Bypasses Vercel's 4.5MB request limit and zero egress bandwidth on Vercel.
 */
export async function uploadToR2(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; key: string }> {
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Video size (${sizeInMb}MB) exceeds the ${MAX_VIDEO_SIZE_MB}MB limit. Please upload a smaller video file.`
    );
  }

  // 1. Request presigned upload URL from our lightweight Next.js route
  const presignRes = await fetch('/api/media/r2/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'video/mp4',
      size: file.size,
    }),
  });

  if (!presignRes.ok) {
    const errorData = await presignRes.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
      'Failed to prepare Cloudflare R2 upload. Please verify R2 credentials in .env.local.'
    );
  }

  const { uploadUrl, publicUrl, key } = await presignRes.json();

  if (!uploadUrl || !publicUrl) {
    throw new Error('Invalid presigned upload response from server.');
  }

  // 2. Upload file directly from browser to Cloudflare R2 using XMLHttpRequest to monitor progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(
          new Error(
            `Cloudflare R2 rejected the upload (Status: ${xhr.status}). Please check bucket CORS configuration.`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Network error during upload to Cloudflare R2. Please check CORS settings on your R2 bucket.'
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudflare R2 upload timed out.'));
    };

    xhr.send(file);
  });

  return { url: publicUrl, key };
}

/**
 * Deletes a video file from Cloudflare R2 via serverless API
 */
export async function deleteR2Media(keyOrUrl: string): Promise<boolean> {
  const key = extractR2Key(keyOrUrl);
  if (!key) return false;

  try {
    const res = await fetch('/api/media/r2/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete media from Cloudflare R2:', err);
    return false;
  }
}

/**
 * Captures a representative snapshot frame from a video file or video URL in the browser
 * and returns it as a JPEG File, ready for upload as a poster / thumbnail.
 */
export async function captureVideoFrame(
  fileOrUrl: File | string,
  seekTimeSec: number = 1
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let objectUrl = '';
    if (typeof fileOrUrl === 'string') {
      video.src = resolveVideoPlayUrl(fileOrUrl);
    } else {
      objectUrl = URL.createObjectURL(fileOrUrl);
      video.src = objectUrl;
    }

    let isDone = false;
    const cleanup = () => {
      if (isDone) return;
      isDone = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      video.remove();
    };

    // Safety timeout: 8 seconds maximum for thumbnail extraction
    const timer = setTimeout(() => {
      if (!isDone) {
        cleanup();
        reject(new Error('Thumbnail extraction timed out'));
      }
    }, 8000);

    video.onloadedmetadata = () => {
      // Pick a reliable point (at least 0.5s or 1s) to avoid 0.0s black intro frames
      const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 0;
      let targetTime = seekTimeSec;
      if (dur > 2) {
        targetTime = Math.min(seekTimeSec, dur / 3);
      } else if (dur > 0) {
        targetTime = Math.min(0.5, dur / 2);
      } else {
        targetTime = 0.5;
      }
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if (isDone) return;
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return reject(new Error('Canvas context unavailable'));
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              const file = new File([blob], 'video_poster.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(file);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          'image/jpeg',
          0.88
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('Unable to extract thumbnail frame from video'));
    };
  });
}
