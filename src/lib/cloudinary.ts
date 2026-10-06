export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.includes('your_cloud_name')
  ),
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_MB = 10;

/**
 * Uploads an image or video directly to Cloudinary into the 'louiportfolio' folder.
 * Validates maximum file size limit of 10MB.
 */
export async function uploadToCloudinary(file: File): Promise<{
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
}> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size exceeds the 10MB limit (${sizeInMb}MB). Please upload a file smaller than 10MB.`
    );
  }

  if (!cloudinaryConfig.cloudName) {
    throw new Error('Cloud storage configuration is missing in .env.local');
  }

  const preset = cloudinaryConfig.uploadPreset || 'ml_default';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  // Store neatly inside the 'louiportfolio' folder
  formData.append('folder', 'louiportfolio');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message ||
      'Upload failed. Please ensure your Cloudinary Upload Preset is set to "Unsigned".'
    );
  }

  const data = await res.json();
  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    format: data.format,
    resourceType: data.resource_type,
  };
}

/**
 * Extracts Cloudinary public_id from a URL or returns the ID if already clean.
 * Correctly captures folder paths (e.g. 'louiportfolio/sample').
 */
export function extractCloudinaryPublicId(url?: string): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com')) {
    // If not a full Cloudinary URL, but already a public_id (e.g. 'louiportfolio/xyz')
    return url.includes('/') ? url : null;
  }

  try {
    const cleanUrl = url.split('?')[0];
    const uploadIndex = cleanUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    const afterUpload = cleanUrl.substring(uploadIndex + 8);
    const segments = afterUpload.split('/');

    let startIndex = 0;
    for (let i = 0; i < segments.length; i++) {
      if (/^v\d+$/.test(segments[i])) {
        startIndex = i + 1;
        break;
      }
    }

    if (
      startIndex === 0 &&
      segments.length > 1 &&
      (segments[0].includes(',') || segments[0].includes('_'))
    ) {
      startIndex = 1;
    }

    const relevantSegments = segments.slice(startIndex);
    if (relevantSegments.length === 0) return null;

    const joined = decodeURIComponent(relevantSegments.join('/'));
    const lastDotIndex = joined.lastIndexOf('.');
    return lastDotIndex !== -1 ? joined.substring(0, lastDotIndex) : joined;
  } catch {
    return null;
  }
}

/**
 * Deletes media from Cloudinary storage via backend API.
 * Accepts either a full URL or a public_id.
 */
export async function deleteCloudinaryMedia(
  publicIdOrUrl: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<boolean> {
  if (!publicIdOrUrl) return false;
  const publicId = publicIdOrUrl.startsWith('http')
    ? extractCloudinaryPublicId(publicIdOrUrl)
    : publicIdOrUrl;

  if (!publicId) return false;

  try {
    const res = await fetch('/api/media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, resourceType }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete media from cloud storage:', err);
    return false;
  }
}

