'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Plus,
  Layers,
  FileCheck,
} from 'lucide-react';
import { AdminCategory } from '@/types/admin';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadToCloudinary, deleteCloudinaryMedia } from '@/lib/cloudinary';
import { uploadToR2, deleteR2Media, captureVideoFrame, isCloudflareR2Url } from '@/lib/r2';

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'photo' | 'video';
  previewUrl?: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

interface BulkInsertModalProps {
  isOpen: boolean;
  categoriesList: AdminCategory[];
  onClose: () => void;
  onSuccess: (insertedCount: number) => Promise<void>;
  showToast: (msg: string) => void;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function BulkInsertModal({
  isOpen,
  categoriesList,
  onClose,
  onSuccess,
  showToast,
}: BulkInsertModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [defaultDescription, setDefaultDescription] = useState<string>('');

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [overallStatusText, setOverallStatusText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedCategories = useMemo(() => {
    return [...categoriesList].sort(
      (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
    );
  }, [categoriesList]);

  // Sync initial category & subcategory on modal open
  useEffect(() => {
    if (isOpen) {
      if (categoriesList.length > 0) {
        const sorted = [...categoriesList].sort(
          (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
        );
        const firstCat = sorted[0];
        const sortedSubs = [...(firstCat?.subcategories || [])].sort(
          (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
        );
        setSelectedCategoryId(firstCat.id);
        setSelectedSubcategoryId(sortedSubs[0]?.id || '');
      }
      setQueue([]);
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
      setOverallStatusText('');
      setDefaultDescription('');
      setStatus('published');
    }
  }, [isOpen, categoriesList]);

  // Clean up object URLs on unmount / queue clear
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [queue]);

  const activeCategory = categoriesList.find((c) => c.id === selectedCategoryId);
  const availableSubcategories = useMemo(() => {
    return [...(activeCategory?.subcategories || [])].sort(
      (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
    );
  }, [activeCategory]);

  if (!isOpen) return null;

  // Determine if active category is a Video category
  const isVideoCategory = Boolean(
    activeCategory &&
      (activeCategory.label.toLowerCase().includes('video') ||
        activeCategory.id.toLowerCase().includes('video'))
  );

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categoriesList.find((c) => c.id === catId);
    const sortedSubs = [...(cat?.subcategories || [])].sort(
      (a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)
    );
    const firstSub = sortedSubs[0]?.id || '';
    setSelectedSubcategoryId(firstSub);

    // If changing category changes media suitability, clear or alert
    const newIsVideo = Boolean(
      cat &&
        (cat.label.toLowerCase().includes('video') ||
          cat.id.toLowerCase().includes('video'))
    );

    if (!newIsVideo) {
      // Remove any video files already queued if switching to non-video category
      setQueue((prev) => {
        const kept = prev.filter((item) => item.type === 'photo');
        if (kept.length !== prev.length) {
          showToast('Removed queued videos because this category only accepts images.');
        }
        return kept;
      });
    }
  };

  // Add files to queue with strict validation
  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    if (!selectedCategoryId || !selectedSubcategoryId) {
      showToast('Please select Category and Subcategory first.');
      return;
    }

    const newItems: QueuedFile[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      // 1. Disallow GIF completely
      if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
        errors.push(`"${file.name}": GIF files are not allowed.`);
        return;
      }

      const isVideoFile =
        file.type.startsWith('video/') ||
        Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i));

      // 2. Enforce Category Constraints: ONLY video categories can accept videos
      if (isVideoFile && !isVideoCategory) {
        errors.push(
          `"${file.name}": Category "${activeCategory?.label}" only accepts images. Videos are only allowed in Video categories.`
        );
        return;
      }

      // 3. Size constraints
      if (isVideoFile) {
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          errors.push(
            `"${file.name}": Exceeds the 100MB video limit (${formatBytes(file.size)}).`
          );
          return;
        }
      } else {
        if (!file.type.startsWith('image/')) {
          errors.push(`"${file.name}": Unsupported file format.`);
          return;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          errors.push(
            `"${file.name}": Exceeds the 10MB image limit (${formatBytes(file.size)}).`
          );
          return;
        }
      }

      // 4. Valid file -> create QueuedFile
      let previewUrl: string | undefined;
      if (!isVideoFile) {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          // Fallback if object URL creation fails
        }
      }

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: isVideoFile ? 'video' : 'photo',
        previewUrl,
        status: 'idle',
        progress: 0,
      });
    });

    if (errors.length > 0) {
      showToast(errors[0]);
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} file(s) to queue.`);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    if (isProcessing) return;
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearQueue = () => {
    if (isProcessing) return;
    queue.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueue([]);
  };

  // Start Batch Upload & Insert
  const handleStartBulkInsert = async () => {
    if (queue.length === 0) {
      showToast('No files in queue to upload.');
      return;
    }
    if (!selectedSubcategoryId) {
      showToast('Please select a valid subcategory.');
      return;
    }

    // Resolve final subcategory UUID for database
    let finalSubcatId = selectedSubcategoryId;
    if (isSupabaseConfigured && supabase) {
      const isSubcatUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId);
      if (!isSubcatUuid) {
        const subLabel = availableSubcategories.find((s) => s.id === finalSubcatId)?.label;
        if (subLabel) {
          const { data: foundDbSub } = await supabase
            .from('subcategories')
            .select('id')
            .eq('label', subLabel)
            .limit(1)
            .maybeSingle();
          if (foundDbSub?.id) finalSubcatId = foundDbSub.id;
        }
      }
    }

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'success') {
        successCount++;
        continue; // Skip already succeeded items
      }

      setCurrentProcessingIndex(i);
      setOverallStatusText(
        `Uploading (${i + 1}/${queue.length}): ${item.name}...`
      );

      // Update status to uploading
      setQueue((prev) =>
        prev.map((q, idx) =>
          idx === i ? { ...q, status: 'uploading', progress: 5 } : q
        )
      );

      let uploadedImageUrl = '';
      let uploadedVideoUrl: string | null = null;

      try {

        if (item.type === 'video') {
          // 1. Upload Video to Cloudflare R2
          const r2Res = await uploadToR2(item.file, (percent) => {
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i ? { ...q, progress: Math.min(85, Math.round(percent * 0.85)) } : q
              )
            );
          });
          uploadedVideoUrl = r2Res.url;

          // 2. Auto extract frame as cover poster and upload to Cloudflare R2
          setOverallStatusText(`Extracting thumbnail for ${item.name}...`);
          try {
            const posterFile = await captureVideoFrame(item.file, 1);
            setOverallStatusText(`Uploading thumbnail for ${item.name} to Cloudflare...`);
            const posterRes = await uploadToR2(posterFile);
            uploadedImageUrl = posterRes.url;
          } catch (frameErr) {
            console.warn('Frame capture skipped for video:', frameErr);
            uploadedImageUrl = '';
          }
        } else {
          // Upload Image to Cloudinary
          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, progress: 40 } : q))
          );
          const cldRes = await uploadToCloudinary(item.file);
          uploadedImageUrl = cldRes.url;
        }

        // 3. Insert record into Supabase
        const payload = {
          subcategory_id: finalSubcatId,
          image_url: uploadedImageUrl,
          type: item.type,
          video_url: uploadedVideoUrl,
          description: defaultDescription.trim() || null,
          status: status,
        };

        if (isSupabaseConfigured && supabase) {
          const { error: insertError } = await supabase.from('contents').insert(payload);
          if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`);
          }
        }

        // Mark item succeeded
        successCount++;
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'success',
                  progress: 100,
                  previewUrl: uploadedImageUrl || q.previewUrl,
                }
              : q
          )
        );
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`Error processing ${item.name}:`, error);

        // Clean up any uploaded media on failure so nothing is orphaned in storage
        if (uploadedVideoUrl && isCloudflareR2Url(uploadedVideoUrl)) {
          try {
            await deleteR2Media(uploadedVideoUrl);
          } catch (cleanErr) {
            console.warn('Failed to clean up video on error:', cleanErr);
          }
        }
        if (uploadedImageUrl) {
          try {
            if (isCloudflareR2Url(uploadedImageUrl)) {
              await deleteR2Media(uploadedImageUrl);
            } else if (uploadedImageUrl.includes('res.cloudinary.com')) {
              await deleteCloudinaryMedia(uploadedImageUrl);
            }
          } catch (cleanErr) {
            console.warn('Failed to clean up image/thumbnail on error:', cleanErr);
          }
        }

        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'error',
                  progress: 0,
                  errorMessage: error.message || 'Upload failed',
                }
              : q
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);
    setOverallStatusText('');

    if (successCount > 0) {
      showToast(
        `Successfully bulk inserted ${successCount} item(s) into ${activeCategory?.label}!`
      );
      await onSuccess(successCount);
      // Close modal if all succeeded
      if (successCount === queue.length) {
        onClose();
      }
    } else {
      showToast('Bulk insert encountered errors. Please check the items.');
    }
  };

  const idleCount = queue.filter((i) => i.status === 'idle').length;
  const successCount = queue.filter((i) => i.status === 'success').length;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky -top-6 sm:-top-8 bg-[#16161b] z-20 pt-1 pb-4 border-b border-white/10 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-2xl uppercase tracking-tight">
                Bulk Insert Works
              </h3>
              <span className="text-xs text-neutral-400 font-sans">
                Upload multiple photos or videos to a category at once
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-6">
          {/* STEP 1: Select Category & Subcategory */}
          <div className="bg-[#121216] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                Target Destination
              </span>

              {/* Category Mode Badge */}
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                  isVideoCategory
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isVideoCategory ? 'Video Category (Max 100MB)' : 'Image Category (Max 10MB)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category Picker */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category *
                </label>
                <select
                  disabled={isProcessing}
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer disabled:opacity-50"
                >
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.label.toLowerCase().includes('video') ? '(Video)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Picker */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Subcategory *
                </label>
                <select
                  disabled={isProcessing || availableSubcategories.length === 0}
                  value={selectedSubcategoryId}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer disabled:opacity-50"
                >
                  {availableSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Default Description (Optional)
                </label>
                <input
                  type="text"
                  disabled={isProcessing}
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  placeholder="e.g. KARBIDA FC Match Day, Studio Session..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Status
                </label>
                <select
                  disabled={isProcessing}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer disabled:opacity-50"
                >
                  <option value="published">Published (Live)</option>
                  <option value="draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Dropzone & Multi-file Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                Select Files ({queue.length} in queue)
              </span>

              {queue.length > 0 && !isProcessing && (
                <button
                  type="button"
                  onClick={handleClearQueue}
                  className="text-[11px] text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1 font-mono"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>

            {/* Dropzone Area */}
            <div
              className="relative border-2 border-dashed border-white/15 hover:border-white/35 rounded-2xl p-6 sm:p-8 text-center transition-all bg-[#121216] cursor-pointer group overflow-hidden"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isProcessing) handleAddFiles(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                disabled={isProcessing}
                accept={
                  isVideoCategory
                    ? 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/*'
                    : 'image/png,image/jpeg,image/webp,image/avif'
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  if (e.target) e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white text-white group-hover:text-black flex items-center justify-center mb-3 transition-all">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-white">
                  Click to Browse or Drag Multiple Files Here
                </span>
                <span className="text-xs text-neutral-400 mt-1 font-sans">
                  {isVideoCategory
                    ? 'Only Video files (.MP4, .WEBM, .MOV) • Max 100MB per file'
                    : 'Only Image files (.PNG, .JPG, .WEBP, .AVIF) • Max 10MB • No GIFs'}
                </span>
              </div>
            </div>
          </div>

          {/* QUEUE LIST */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      idx === currentProcessingIndex
                        ? 'bg-blue-500/10 border-blue-500/40'
                        : item.status === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : item.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-[#121216] border-white/10'
                    }`}
                  >
                    {/* Thumbnail / Icon */}
                    <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : item.type === 'video' ? (
                        <Film className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    {/* File Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate block">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                          {formatBytes(item.size)}
                        </span>
                      </div>

                      {/* Progress or Error */}
                      {item.status === 'uploading' && (
                        <div className="w-full mt-1.5">
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-blue-400 mt-0.5 block">
                            Uploading... {item.progress}%
                          </span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <span className="text-[10px] text-red-400 block truncate mt-0.5 font-mono">
                          {item.errorMessage || 'Failed'}
                        </span>
                      )}

                      {item.status === 'success' && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                          <FileCheck className="w-3 h-3" />
                          Inserted into database
                        </span>
                      )}
                    </div>

                    {/* Item Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      {item.status === 'success' ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : item.status === 'error' ? (
                        <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      ) : !isProcessing ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveQueueItem(item.id)}
                          className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/5 flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Summary & Start Button */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-neutral-400 font-sans">
              {isProcessing ? (
                <span className="flex items-center gap-2 text-blue-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {overallStatusText || 'Uploading batch...'}
                </span>
              ) : queue.length > 0 ? (
                <span>
                  Ready to insert{' '}
                  <strong className="text-white font-mono">{queue.length}</strong> work(s) into{' '}
                  <strong className="text-white">
                    {activeCategory?.label} -{' '}
                    {availableSubcategories.find((s) => s.id === selectedSubcategoryId)?.label ||
                      'Selected'}
                  </strong>
                </span>
              ) : (
                <span>Add files above to begin bulk upload</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartBulkInsert}
                disabled={isProcessing || queue.length === 0 || !selectedSubcategoryId}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>
                      Upload & Insert ({queue.length})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
