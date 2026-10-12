'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Video,
  Image as ImageIcon,
  Play,
  RefreshCw,
  Trash2,
  UploadCloud,
  ArrowLeft,
  Film,
  Layers,
  Plus,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';
import { AdminCategory, ContentFormData } from '@/types/admin';
import { MediaItem, MediaSlide, getYouTubeThumbnail, isYouTubeUrl } from '@/data/portfolioData';
import {
  resolveVideoPlayUrl,
  uploadToR2,
  captureVideoFrame,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
} from '@/lib/r2';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface ContentModalProps {
  isOpen: boolean;
  editingItem: MediaItem | null;
  contentFormData: ContentFormData;
  setContentFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  categoriesList: AdminCategory[];
  uploadingMedia: boolean;
  isSaving?: boolean;
  isContentFormValid: boolean;
  uploadProgress?: number | null;
  uploadStatusText?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUploadNewImage: (file: File) => void;
  onRemoveImage: () => void;
  onTriggerReplaceImage: () => void;
  onUploadNewVideo?: (file: File) => void;
  onRemoveVideo?: () => void;
  onTriggerReplaceVideo?: () => void;
}

export default function ContentModal({
  isOpen,
  editingItem,
  contentFormData,
  setContentFormData,
  categoriesList,
  uploadingMedia,
  isSaving = false,
  isContentFormValid,
  uploadProgress,
  uploadStatusText,
  onClose,
  onSubmit,
  onUploadNewImage,
  onRemoveImage,
  onTriggerReplaceImage,
  onUploadNewVideo,
  onRemoveVideo,
}: ContentModalProps) {
  const [videoSourceType, setVideoSourceType] = useState<'youtube' | 'r2'>('youtube');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  // Carousel Slides management state
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);
  const [showAddVideoSlideModal, setShowAddVideoSlideModal] = useState(false);
  const [slideVideoSourceType, setSlideVideoSourceType] = useState<'youtube' | 'device'>('youtube');
  const [slideVideoInputUrl, setSlideVideoInputUrl] = useState('');
  const [slideVideoCaption, setSlideVideoCaption] = useState('');
  const [isUploadingSlideVideo, setIsUploadingSlideVideo] = useState(false);
  const [slideVideoUploadProgress, setSlideVideoUploadProgress] = useState<number | null>(null);
  const [slideVideoStatusText, setSlideVideoStatusText] = useState<string>('');
  const [uploadedSlideVideoUrl, setUploadedSlideVideoUrl] = useState<string>('');
  const [uploadedSlideVideoThumb, setUploadedSlideVideoThumb] = useState<string>('');
  const [isDragOverSlideVideo, setIsDragOverSlideVideo] = useState(false);
  const slideVideoFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadSlidePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingSlide(true);
    try {
      const newSlides: MediaSlide[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const res = await uploadToCloudinary(file);
        newSlides.push({
          id: `slide-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'photo',
          image: res.url,
          caption: '',
        });
      }
      setContentFormData((prev) => ({
        ...prev,
        slides: [...(prev.slides || []), ...newSlides],
      }));
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || 'Failed to upload slide images');
    } finally {
      setIsUploadingSlide(false);
    }
  };

  const handleUploadSlideVideoFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i)) {
      alert('Only video files (MP4, WebM, MOV, M4V, MKV) are allowed.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File size (${sizeInMb}MB) exceeds the ${MAX_VIDEO_SIZE_MB}MB limit for video upload.`);
      return;
    }

    setIsUploadingSlideVideo(true);
    setSlideVideoUploadProgress(0);
    setSlideVideoStatusText('Uploading video from device...');

    try {
      // 1. Direct storage upload
      const res = await uploadToR2(file, (percent) => {
        setSlideVideoUploadProgress(percent);
      });

      setUploadedSlideVideoUrl(res.url);

      // 2. Auto-extract cover thumbnail frame from video
      setSlideVideoStatusText('Generating cover thumbnail...');
      try {
        const thumbFile = await captureVideoFrame(file, 1);
        setSlideVideoStatusText('Uploading thumbnail...');
        const thumbRes = await uploadToR2(thumbFile);
        setUploadedSlideVideoThumb(thumbRes.url);
      } catch (frameErr) {
        console.warn('Auto cover capture skipped for slide video:', frameErr);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || 'Failed to upload video from device');
      setUploadedSlideVideoUrl('');
      setUploadedSlideVideoThumb('');
    } finally {
      setIsUploadingSlideVideo(false);
      setSlideVideoUploadProgress(null);
      setSlideVideoStatusText('');
    }
  };

  const handleAddVideoSlide = () => {
    let videoUrl = '';
    let thumbUrl = '';

    const fallbackThumb =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23141419"/></svg>';

    if (slideVideoSourceType === 'youtube') {
      const url = slideVideoInputUrl.trim();
      if (!url) return;
      videoUrl = url;
      thumbUrl = getYouTubeThumbnail(url) || fallbackThumb;
    } else {
      if (!uploadedSlideVideoUrl) return;
      videoUrl = uploadedSlideVideoUrl;
      thumbUrl = uploadedSlideVideoThumb || fallbackThumb;
    }

    const newSlide: MediaSlide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'video',
      image: thumbUrl,
      videoUrl: videoUrl,
      caption: slideVideoCaption.trim() || undefined,
    };

    setContentFormData((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), newSlide],
    }));

    handleCloseSlideVideoModal();
  };

  const handleCloseSlideVideoModal = () => {
    setSlideVideoSourceType('youtube');
    setSlideVideoInputUrl('');
    setSlideVideoCaption('');
    setUploadedSlideVideoUrl('');
    setUploadedSlideVideoThumb('');
    setSlideVideoUploadProgress(null);
    setSlideVideoStatusText('');
    setShowAddVideoSlideModal(false);
  };

  const handleRemoveSlide = (index: number) => {
    setContentFormData((prev) => ({
      ...prev,
      slides: (prev.slides || []).filter((_, i) => i !== index),
    }));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const currentSlides = [...(contentFormData.slides || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSlides.length) return;
    const temp = currentSlides[index];
    currentSlides[index] = currentSlides[targetIndex];
    currentSlides[targetIndex] = temp;
    setContentFormData((prev) => ({
      ...prev,
      slides: currentSlides,
    }));
  };

  const handleUpdateSlideCaption = (index: number, caption: string) => {
    setContentFormData((prev) => ({
      ...prev,
      slides: (prev.slides || []).map((s, i) => (i === index ? { ...s, caption } : s)),
    }));
  };

  // Auto-detect video source type on modal open or URL change
  useEffect(() => {
    if (contentFormData.type === 'video') {
      if (contentFormData.videoUrl) {
        if (isYouTubeUrl(contentFormData.videoUrl)) {
          setVideoSourceType('youtube');
        } else {
          setVideoSourceType('r2');
        }
      }
    }
  }, [contentFormData.type, contentFormData.videoUrl]);

  const sortedCategories = useMemo(() => {
    return [...categoriesList].sort(
      (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
    );
  }, [categoriesList]);

  const currentCategoryObj = categoriesList.find((c) => c.id === contentFormData.categoryId);
  const availableSubcategories = useMemo(() => {
    return [...(currentCategoryObj?.subcategories || [])].sort(
      (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
    );
  }, [currentCategoryObj]);

  const isDirectVideo =
    contentFormData.type === 'video' &&
    Boolean(contentFormData.videoUrl && !isYouTubeUrl(contentFormData.videoUrl));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploadingMedia) {
          onClose();
        }
      }}
    >
      {/* Hidden file inputs for programmatic triggers */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadNewVideo) onUploadNewVideo(file);
          if (e.target) e.target.value = '';
        }}
      />
      <input
        ref={posterInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadNewImage(file);
          if (e.target) e.target.value = '';
        }}
      />

      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Modal Header */}
        <div className="sticky -top-6 sm:-top-8 bg-[#16161b] z-20 pt-1 pb-4 border-b border-white/10 mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-2xl uppercase tracking-tight">
              {editingItem ? 'Edit Portfolio Work' : 'Add New Portfolio Work'}
            </h3>
            <span className="text-xs text-neutral-400 font-sans">
              {editingItem
                ? `Editing: ${editingItem.subcategoryLabel}`
                : 'Add photos or videos to the showcase gallery'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadingMedia || isSaving}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Media Type */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Media Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setContentFormData((prev) => ({
                    ...prev,
                    type: 'video',
                  }))
                }
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  contentFormData.type === 'video'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1e1e26] text-neutral-400 border-white/10 hover:border-white/20'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setContentFormData((prev) => ({
                    ...prev,
                    type: 'photo',
                  }))
                }
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  contentFormData.type === 'photo'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1e1e26] text-neutral-400 border-white/10 hover:border-white/20'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo / Art</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIDEO SECTION: Supports YouTube & Cloudflare R2 Direct    */}
          {/* ========================================================= */}
          {contentFormData.type === 'video' ? (
            <div className="space-y-4">
              {/* Video Source Tabs */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Video Source *
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#121216] p-1.5 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('youtube');
                      // If current videoUrl is a direct R2 video, clear it so user can input youtube link
                      if (contentFormData.videoUrl && !isYouTubeUrl(contentFormData.videoUrl)) {
                        setContentFormData((prev) => ({ ...prev, videoUrl: '', image: '' }));
                      }
                    }}
                    className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                      videoSourceType === 'youtube'
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>YouTube Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('r2');
                      // If current videoUrl is youtube, clear it so user can upload video file
                      if (contentFormData.videoUrl && isYouTubeUrl(contentFormData.videoUrl)) {
                        setContentFormData((prev) => ({ ...prev, videoUrl: '', image: '' }));
                      }
                    }}
                    className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                      videoSourceType === 'r2'
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Upload Video File</span>
                  </button>
                </div>
              </div>

              {/* A. YOUTUBE OPTION */}
              {videoSourceType === 'youtube' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                      YouTube Video Link *
                    </label>
                    <input
                      type="text"
                      required={videoSourceType === 'youtube'}
                      value={contentFormData.videoUrl}
                      onChange={(e) =>
                        setContentFormData({ ...contentFormData, videoUrl: e.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  {/* YouTube Live Preview Box */}
                  {contentFormData.videoUrl && isYouTubeUrl(contentFormData.videoUrl) && (
                    <div className="rounded-2xl border border-white/15 bg-[#121216] p-4 space-y-3">
                      <div className="w-full min-h-[160px] max-h-[360px] flex items-center justify-center p-3 rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                        <div className="relative max-h-[330px] max-w-full flex items-center justify-center rounded-lg overflow-hidden shadow-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              getYouTubeThumbnail(contentFormData.videoUrl) ||
                              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200'
                            }
                            alt="Preview"
                            className="max-h-[330px] max-w-full w-auto h-auto object-contain rounded-lg block"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-current translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* B. DIRECT VIDEO UPLOAD OPTION */}
              {videoSourceType === 'r2' && (
                <div className="space-y-4">
                  {/* If direct video file is already present */}
                  {isDirectVideo ? (
                    <div className="rounded-2xl border border-white/15 bg-[#121216] p-4 space-y-4">
                      {/* Video Player Preview with download protection */}
                      <div
                        className="w-full min-h-[180px] max-h-[360px] flex items-center justify-center p-2 rounded-xl bg-black border border-white/10 overflow-hidden"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <video
                          src={resolveVideoPlayUrl(contentFormData.videoUrl)}
                          controls
                          controlsList="nodownload noplaybackrate"
                          disablePictureInPicture
                          onContextMenu={(e) => e.preventDefault()}
                          preload="metadata"
                          poster={
                            contentFormData.image
                              ? resolveVideoPlayUrl(contentFormData.image)
                              : undefined
                          }
                          className="max-h-[340px] max-w-full w-auto h-auto object-contain rounded-lg shadow-xl block"
                        />
                      </div>

                      {/* Video Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingMedia}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${uploadingMedia ? 'animate-spin' : ''}`}
                          />
                          <span>{uploadingMedia ? 'Uploading...' : 'Replace Video'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={onRemoveVideo}
                          disabled={uploadingMedia}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Video</span>
                        </button>
                      </div>

                      {/* Video Cover / Thumbnail Section (Cloudflare R2) */}
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Cover Thumbnail</span>
                          </label>
                          {contentFormData.image && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              Thumbnail Set
                            </span>
                          )}
                        </div>

                        {contentFormData.image ? (
                          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolveVideoPlayUrl(contentFormData.image)}
                                alt="Video thumbnail preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-neutral-300 font-medium truncate">
                                Cover poster for video playback
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono">
                                Custom thumbnail image
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => posterInputRef.current?.click()}
                                disabled={uploadingMedia}
                                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white text-neutral-300 hover:text-black text-xs font-medium transition-all disabled:opacity-50"
                                title="Replace thumbnail with custom image"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={onRemoveImage}
                                disabled={uploadingMedia}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all disabled:opacity-50"
                                title="Remove thumbnail"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => posterInputRef.current?.click()}
                            disabled={uploadingMedia}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            <UploadCloud className="w-4 h-4 text-neutral-400" />
                            <span>Upload Custom Cover Thumbnail</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Video Upload Dropzone when no direct video is uploaded */
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-6 text-center transition-all bg-[#121216]">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadNewVideo) onUploadNewVideo(file);
                            if (e.target) e.target.value = '';
                          }}
                          disabled={uploadingMedia}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-2">
                            {uploadingMedia ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <UploadCloud className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {uploadingMedia
                              ? uploadStatusText || 'Uploading video...'
                              : 'Click or Drag a Video File Here (.MP4, .WEBM, .MOV)'}
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-1 font-mono">
                            Max 100MB • Auto-extracted Cover Poster
                          </span>

                          {/* Upload Progress Bar */}
                          {uploadingMedia && uploadProgress !== null && uploadProgress !== undefined && (
                            <div className="w-full max-w-xs mt-3">
                              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all duration-200"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-neutral-400 mt-1 block">
                                {uploadProgress}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* PHOTO SECTION: Cloudinary Image Upload Only               */
            /* ========================================================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Image File *
                </label>
                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Max 10MB
                </span>
              </div>

              {/* Preview Box if image exists */}
              {contentFormData.image ? (
                <div className="rounded-2xl border border-white/15 bg-[#121216] p-4 space-y-3">
                  {/* Visual Preview */}
                  <div className="w-full min-h-[160px] max-h-[360px] flex items-center justify-center p-3 rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contentFormData.image}
                      alt="Preview"
                      className="max-h-[330px] max-w-full w-auto h-auto object-contain rounded-lg shadow-xl block"
                    />
                  </div>

                  {/* Action Buttons: Replace Image & Remove Image */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onTriggerReplaceImage}
                      disabled={uploadingMedia}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${uploadingMedia ? 'animate-spin' : ''}`}
                      />
                      <span>{uploadingMedia ? 'Uploading...' : 'Replace Image'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRemoveImage}
                      disabled={uploadingMedia}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Image</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone & Input when no image is present */
                <div className="space-y-3">
                  <div className="relative border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-6 text-center transition-all bg-[#121216]">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadNewImage(file);
                        if (e.target) e.target.value = '';
                      }}
                      disabled={uploadingMedia}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-2">
                        {uploadingMedia ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white">
                        {uploadingMedia
                          ? 'Uploading image...'
                          : 'Click or Drag an Image Here from Your Computer'}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1 font-mono">
                        Maximum size: 10MB (PNG, JPG, WEBP, AVIF)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* CAROUSEL SLIDES MANAGER SECTION                           */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-neutral-400" />
                  <span>Slides Sequence (Lightbox Carousel)</span>
                </label>
                <p className="text-[11px] text-neutral-500 font-sans mt-0.5">
                  Slide #1 is the primary cover media above. Visitors can browse additional slides using carousel arrows.
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                {1 + (contentFormData.slides || []).length} Slides Total
              </span>
            </div>

            {/* Hidden file input for slide images */}
            <input
              ref={slideFileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                handleUploadSlidePhotos(e.target.files);
                if (e.target) e.target.value = '';
              }}
            />

            {/* Slide action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => slideFileInputRef.current?.click()}
                disabled={isUploadingSlide || uploadingMedia}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUploadingSlide ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Image...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photo Slide</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAddVideoSlideModal(true)}
                disabled={isUploadingSlide || uploadingMedia}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Add Video Slide</span>
              </button>
            </div>

            {/* Add Video Slide inline modal */}
            {showAddVideoSlideModal && (
              <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/15 space-y-4 animate-fadeIn shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-200 flex items-center gap-2 font-semibold">
                    <Film className="w-4 h-4 text-amber-300" />
                    <span>Add Video Slide</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCloseSlideVideoModal}
                    className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Source Selection Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-[#121216] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setSlideVideoSourceType('youtube')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      slideVideoSourceType === 'youtube'
                        ? 'bg-white text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>YouTube Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlideVideoSourceType('device')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      slideVideoSourceType === 'device'
                        ? 'bg-white text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload from Device</span>
                  </button>
                </div>

                {/* Tab 1: YouTube Link */}
                {slideVideoSourceType === 'youtube' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                        YouTube Video URL
                      </label>
                      <input
                        type="text"
                        placeholder="Paste YouTube link (e.g. https://youtu.be/... or https://youtube.com/watch?v=...)"
                        value={slideVideoInputUrl}
                        onChange={(e) => setSlideVideoInputUrl(e.target.value)}
                        className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                    </div>

                    {/* Live YouTube Preview */}
                    {slideVideoInputUrl.trim() && (
                      <div className="p-2.5 rounded-xl bg-[#141418] border border-white/10 flex items-center gap-3">
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-black relative shrink-0 border border-white/10 flex items-center justify-center">
                          {getYouTubeThumbnail(slideVideoInputUrl) ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getYouTubeThumbnail(slideVideoInputUrl)}
                              alt="YouTube Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="w-5 h-5 text-neutral-600" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                            YouTube Video
                          </span>
                          <p className="text-[11px] text-neutral-400 truncate mt-1">
                            {slideVideoInputUrl}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Upload from Device */}
                {slideVideoSourceType === 'device' && (
                  <div className="space-y-3">
                    {/* Hidden video file input */}
                    <input
                      ref={slideVideoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.m4v,.mkv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadSlideVideoFile(file);
                        e.target.value = '';
                      }}
                    />

                    {isUploadingSlideVideo ? (
                      /* Upload Progress Card */
                      <div className="p-6 rounded-xl border border-white/15 bg-[#141419] flex flex-col items-center justify-center text-center space-y-3">
                        <RefreshCw className="w-7 h-7 text-amber-300 animate-spin" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-white">
                            {slideVideoStatusText || 'Uploading video...'}
                          </p>
                          {slideVideoUploadProgress !== null && (
                            <p className="text-[11px] font-mono text-neutral-400">
                              {slideVideoUploadProgress}% completed
                            </p>
                          )}
                        </div>
                        {slideVideoUploadProgress !== null && (
                          <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-1.5 rounded-full transition-all duration-200"
                              style={{ width: `${slideVideoUploadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : uploadedSlideVideoUrl ? (
                      /* Uploaded Video Preview */
                      <div className="p-3.5 rounded-xl bg-[#141419] border border-white/15 space-y-3">
                        <div className="relative rounded-lg overflow-hidden bg-black border border-white/10 max-h-48 flex items-center justify-center">
                          <video
                            src={resolveVideoPlayUrl(uploadedSlideVideoUrl)}
                            poster={resolveVideoPlayUrl(uploadedSlideVideoThumb)}
                            controls
                            className="w-full max-h-48 object-contain"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              <span>Video Ready</span>
                            </span>
                            {uploadedSlideVideoThumb && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                Auto-Cover Captured
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => slideVideoFileInputRef.current?.click()}
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black text-[11px] font-semibold uppercase tracking-wider transition-all"
                          >
                            Replace Video
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Area */
                      <div
                        onClick={() => slideVideoFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverSlideVideo(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDragOverSlideVideo(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverSlideVideo(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleUploadSlideVideoFile(file);
                        }}
                        className={`p-6 sm:p-8 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                          isDragOverSlideVideo
                            ? 'border-white bg-white/10 scale-[0.99]'
                            : 'border-white/15 hover:border-white/30 bg-[#141419] hover:bg-[#18181f]'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-neutral-300">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-white mb-1">
                          Click to browse or drag & drop video from device
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Supports MP4, WebM, MOV up to 100MB
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Slide Caption */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                    Slide Caption (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description or title for this slide..."
                    value={slideVideoCaption}
                    onChange={(e) => setSlideVideoCaption(e.target.value)}
                    className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleCloseSlideVideoModal}
                    disabled={isUploadingSlideVideo}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVideoSlide}
                    disabled={
                      isUploadingSlideVideo ||
                      (slideVideoSourceType === 'youtube' && !slideVideoInputUrl.trim()) ||
                      (slideVideoSourceType === 'device' && !uploadedSlideVideoUrl)
                    }
                    className="px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Video Slide</span>
                  </button>
                </div>
              </div>
            )}

            {/* Complete Slides Sequence List */}
            <div className="space-y-2 pt-1">
              {/* Pinned Slide #1: Primary Cover Media */}
              {(() => {
                const coverThumb =
                  contentFormData.type === 'video'
                    ? contentFormData.videoUrl && isYouTubeUrl(contentFormData.videoUrl)
                      ? getYouTubeThumbnail(contentFormData.videoUrl)
                      : contentFormData.image
                    : contentFormData.image;

                return (
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-amber-400/5 border border-amber-400/25">
                    <span className="text-[11px] font-mono font-bold text-amber-400 w-6 text-center shrink-0">
                      #1
                    </span>

                    <div className="w-14 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-amber-400/30 shrink-0 relative flex items-center justify-center">
                      {coverThumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={resolveVideoPlayUrl(coverThumb)}
                          alt="Cover Slide"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-neutral-500 font-mono">No Media</span>
                      )}
                      {contentFormData.type === 'video' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold">
                          Cover • {contentFormData.type === 'video' ? 'Video' : 'Photo'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">(First Slide)</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5 truncate">
                        {contentFormData.description ||
                          (contentFormData.type === 'video'
                            ? contentFormData.videoUrl || 'Main video work'
                            : 'Main cover image')}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10 shrink-0">
                      Primary
                    </span>
                  </div>
                );
              })()}

              {/* Additional Slides (#2, #3, ...) */}
              {contentFormData.slides && contentFormData.slides.length > 0 ? (
                contentFormData.slides.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#121216] border border-white/10 hover:border-white/20 transition-all"
                  >
                    <span className="text-[11px] font-mono font-bold text-neutral-400 w-6 text-center shrink-0">
                      #{idx + 2}
                    </span>

                    {/* Thumbnail preview */}
                    <div className="w-14 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0 relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveVideoPlayUrl(slide.image)}
                        alt={`Slide ${idx + 2}`}
                        className="w-full h-full object-cover"
                      />
                      {slide.type === 'video' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    {/* Slide info & caption input */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            slide.type === 'video'
                              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                              : 'bg-blue-400/10 text-blue-300 border border-blue-400/20'
                          }`}
                        >
                          Slide #{idx + 2} • {slide.type === 'video' ? (slide.videoUrl && isYouTubeUrl(slide.videoUrl) ? 'Video (YouTube)' : 'Video (Device)') : 'Photo'}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-sans truncate">
                          {slide.caption || (slide.type === 'video' ? (slide.videoUrl && isYouTubeUrl(slide.videoUrl) ? 'YouTube Video' : 'Device Video') : 'Photo Slide')}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Caption for this slide..."
                        value={slide.caption || ''}
                        onChange={(e) => handleUpdateSlideCaption(idx, e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                    </div>

                    {/* Re-order & Delete actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(idx, 'down')}
                        disabled={idx === (contentFormData.slides?.length || 0) - 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlide(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400"
                        title="Remove Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-white/10 text-center">
                  <span className="text-xs text-neutral-500 font-sans">
                    No additional slides yet. Click &quot;Add Photo Slide&quot; or &quot;Add Video Slide&quot; above to create a multi-slide carousel.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Main Category *
              </label>
              <select
                value={contentFormData.categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  const parentObj = categoriesList.find((c) => c.id === newCatId);
                  const newSubId = parentObj?.subcategories[0]?.id || '';
                  setContentFormData({
                    ...contentFormData,
                    categoryId: newCatId,
                    subcategoryId: newSubId,
                  });
                }}
                className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                {sortedCategories.length === 0 ? (
                  <option value="">(No categories available)</option>
                ) : (
                  sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.status === 'archived' ? '(Hidden)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Subcategory *
              </label>
              <select
                value={contentFormData.subcategoryId}
                onChange={(e) =>
                  setContentFormData({ ...contentFormData, subcategoryId: e.target.value })
                }
                className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                {availableSubcategories.length === 0 ? (
                  <option value="">(No subcategories available)</option>
                ) : (
                  availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label} {sub.status === 'archived' ? '(Hidden)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Warning if category or subcategory is hidden */}
          {(() => {
            const selectedCat = categoriesList.find((c) => c.id === contentFormData.categoryId);
            const selectedSub = selectedCat?.subcategories.find(
              (s) => s.id === contentFormData.subcategoryId
            );
            const isCatArchived = selectedCat?.status === 'archived';
            const isSubArchived = selectedSub?.status === 'archived';

            if (isCatArchived || isSubArchived) {
              return (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>
                    Perhatian: {isCatArchived ? `Kategori "${selectedCat?.label}"` : `Subkategori "${selectedSub?.label}"`} sedang disembunyikan (hide). Karya ini akan ikut tersembunyi dari website utama.
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* Description */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Work Description / Notes
            </label>
            <textarea
              rows={3}
              value={contentFormData.description}
              onChange={(e) =>
                setContentFormData({ ...contentFormData, description: e.target.value })
              }
              placeholder="Brief project details, camera/software used, or background story..."
              className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Publication Status */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Publication Status
            </label>
            <select
              value={contentFormData.status}
              onChange={(e) =>
                setContentFormData({
                  ...contentFormData,
                  status: e.target.value as 'draft' | 'published' | 'archived',
                })
              }
              className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            >
              <option value="published">Published (Visible on Website)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sticky Submit / Cancel Buttons */}
          <div className="sticky -bottom-6 sm:-bottom-8 bg-[#16161b] z-20 pt-4 pb-2 border-t border-white/10 mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadingMedia || isSaving}
              className="px-6 py-3 rounded-xl border border-white/15 text-neutral-300 hover:text-white hover:border-white/30 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel / Back</span>
            </button>
            <button
              type="submit"
              disabled={!isContentFormValid || isSaving || uploadingMedia}
              title={
                !isContentFormValid
                  ? 'Please fill in all mandatory fields (category, subcategory, and valid media)'
                  : undefined
              }
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{editingItem ? 'Saving Changes...' : 'Creating Work...'}</span>
                </>
              ) : (
                editingItem ? 'Save Changes' : 'Create Work'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
