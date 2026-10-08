'use client';

import React from 'react';
import Image from 'next/image';
import { X, Edit3, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminCategory, BulkEditFormData } from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface BulkModalsProps {
  // Bulk Edit
  isBulkEditModalOpen: boolean;
  bulkEditData: BulkEditFormData;
  setBulkEditData: React.Dispatch<React.SetStateAction<BulkEditFormData>>;
  selectedItemIds: string[];
  categoriesList: AdminCategory[];
  isBulkSaving: boolean;
  onCloseBulkEdit: () => void;
  onSaveBulkEdit: (e: React.FormEvent) => void;

  // Bulk Delete
  isBulkDeleteModalOpen: boolean;
  items: MediaItem[];
  isBulkDeleting: boolean;
  onCloseBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
}

export default function BulkModals({
  isBulkEditModalOpen,
  bulkEditData,
  setBulkEditData,
  selectedItemIds,
  categoriesList,
  isBulkSaving,
  onCloseBulkEdit,
  onSaveBulkEdit,
  isBulkDeleteModalOpen,
  items,
  isBulkDeleting,
  onCloseBulkDelete,
  onConfirmBulkDelete,
}: BulkModalsProps) {
  const bulkCategoryObj = categoriesList.find((c) => c.id === bulkEditData.categoryId);
  const bulkAvailableSubcategories = bulkCategoryObj?.subcategories || [];

  return (
    <>
      {/* 1. Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={() => !isBulkSaving && onCloseBulkEdit()}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="w-full max-w-lg my-auto bg-[#16161b] text-white rounded-3xl border border-white/15 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                  <span>Bulk Edit ({selectedItemIds.length} Works)</span>
                </h3>
                <span className="text-xs text-neutral-400 font-sans mt-0.5 block">
                  Update category, subcategory, and status for all selected works
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseBulkEdit}
                disabled={isBulkSaving}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveBulkEdit} className="space-y-6">
              {/* Field 1: Category & Subcategory */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkEditData.updateCategory}
                    onChange={(e) =>
                      setBulkEditData({ ...bulkEditData, updateCategory: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                      Update Category & Subcategory
                    </span>
                    <span className="text-[11px] text-neutral-400 block font-sans">
                      Move all selected works to a new category / subcategory
                    </span>
                  </div>
                </label>

                {bulkEditData.updateCategory && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                        New Main Category
                      </label>
                      <select
                        value={bulkEditData.categoryId}
                        onChange={(e) => {
                          const newCatId = e.target.value;
                          const parentObj = categoriesList.find((c) => c.id === newCatId);
                          const newSubId = parentObj?.subcategories[0]?.id || '';
                          setBulkEditData({
                            ...bulkEditData,
                            categoryId: newCatId,
                            subcategoryId: newSubId,
                          });
                        }}
                        className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {categoriesList.length === 0 ? (
                          <option value="">(No categories available)</option>
                        ) : (
                          categoriesList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                        New Subcategory
                      </label>
                      <select
                        value={bulkEditData.subcategoryId}
                        onChange={(e) =>
                          setBulkEditData({ ...bulkEditData, subcategoryId: e.target.value })
                        }
                        className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {bulkAvailableSubcategories.length === 0 ? (
                          <option value="">(No subcategories)</option>
                        ) : (
                          bulkAvailableSubcategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 2: Status */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkEditData.updateStatus}
                    onChange={(e) =>
                      setBulkEditData({ ...bulkEditData, updateStatus: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                      Update Publication Status
                    </span>
                    <span className="text-[11px] text-neutral-400 block font-sans">
                      Change visibility for all selected works
                    </span>
                  </div>
                </label>

                {bulkEditData.updateStatus && (
                  <div className="pt-2 border-t border-white/5 animate-fadeIn">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                      New Publication Status
                    </label>
                    <select
                      value={bulkEditData.status}
                      onChange={(e) =>
                        setBulkEditData({
                          ...bulkEditData,
                          status: e.target.value as 'draft' | 'published' | 'archived',
                        })
                      }
                      className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="published">Published (Visible on Website)</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onCloseBulkEdit}
                  disabled={isBulkSaving}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isBulkSaving ||
                    (!bulkEditData.updateCategory && !bulkEditData.updateStatus)
                  }
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isBulkSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isBulkSaving ? 'Updating...' : `Apply to ${selectedItemIds.length} Works`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Confirm Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={() => !isBulkDeleting && onCloseBulkDelete()}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-red-500/20 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
              Delete {selectedItemIds.length} Selected Works?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-4 font-sans">
              Are you sure you want to delete these{' '}
              <strong className="text-white">{selectedItemIds.length} works</strong>? All
              associated images stored in cloud storage will be permanently purged. This action
              cannot be undone.
            </p>

            {/* Thumbnail preview list */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 border-b border-white/10">
              {items
                .filter((i) => selectedItemIds.includes(i.id))
                .slice(0, 6)
                .map((item) => (
                  <div
                    key={item.id}
                    className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10"
                    title={item.subcategoryLabel}
                  >
                    <Image
                      src={item.image}
                      alt={item.subcategoryLabel}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ))}
              {selectedItemIds.length > 6 && (
                <div className="w-12 h-12 rounded-lg bg-white/10 text-neutral-300 text-xs font-mono flex items-center justify-center shrink-0 border border-white/10">
                  +{selectedItemIds.length - 6}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCloseBulkDelete}
                disabled={isBulkDeleting}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isBulkDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isBulkDeleting
                    ? 'Deleting...'
                    : `Delete ${selectedItemIds.length} Works`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
