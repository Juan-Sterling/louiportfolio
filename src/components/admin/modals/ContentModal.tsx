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
} from 'lucide-react';
import { AdminCategory, ContentFormData } from '@/types/admin';
import { MediaItem, getYouTubeThumbnail, isYouTubeUrl } from '@/data/portfolioData';
import { resolveVideoPlayUrl } from '@/lib/r2';

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
                            <span>Cover Thumbnail (Cloudflare)</span>
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
                                Stored on Cloudflare R2
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
                            <span>Upload Custom Cover Thumbnail (Cloudflare)</span>
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
                  Image File (Upload to Cloudinary) *
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
                      {c.label}
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
                      {sub.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

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
