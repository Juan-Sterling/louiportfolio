'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { MediaItem } from '@/data/portfolioData';

interface DeleteContentModalProps {
  deletingItem: MediaItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteContentModal({
  deletingItem,
  onClose,
  onConfirm,
}: DeleteContentModalProps) {
  if (!deletingItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-red-500/20 shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
          Delete This Work?
        </h3>

        <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
          Are you sure you want to delete{' '}
          <strong className="text-white">&quot;{deletingItem.subcategoryLabel}&quot;</strong>?
          Associated media in storage will also be purged. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Delete Work
          </button>
        </div>
      </div>
    </div>
  );
}
