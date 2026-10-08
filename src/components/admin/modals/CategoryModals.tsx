'use client';

import React from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Folder,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import {
  AdminCategory,
  AdminSubCategory,
  CategoryFormData,
  SubcategoryFormData,
} from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface CategoryModalsProps {
  // Category Modal
  isCategoryModalOpen: boolean;
  categoryModalMode: 'create' | 'edit';
  categoryFormData: CategoryFormData;
  setCategoryFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  onCloseCategoryModal: () => void;
  onSaveCategory: (e: React.FormEvent) => void;

  // Subcategory Modal
  isSubcategoryModalOpen: boolean;
  subcategoryModalMode: 'create' | 'edit';
  subcategoryFormData: SubcategoryFormData;
  setSubcategoryFormData: React.Dispatch<React.SetStateAction<SubcategoryFormData>>;
  categoriesList: AdminCategory[];
  onCloseSubcategoryModal: () => void;
  onSaveSubcategory: (e: React.FormEvent) => void;

  // Delete Category Confirm Modal
  deletingCategory: AdminCategory | null;
  onCloseDeleteCategory: () => void;
  onConfirmDeleteCategory: () => void;

  // Delete Subcategory Confirm Modal
  deletingSubcategory: {
    categoryId: string;
    subcategory: AdminSubCategory;
  } | null;
  onCloseDeleteSubcategory: () => void;
  onConfirmDeleteSubcategory: () => void;

  items?: MediaItem[];
}

export default function CategoryModals({
  isCategoryModalOpen,
  categoryModalMode,
  categoryFormData,
  setCategoryFormData,
  onCloseCategoryModal,
  onSaveCategory,
  isSubcategoryModalOpen,
  subcategoryModalMode,
  subcategoryFormData,
  setSubcategoryFormData,
  categoriesList,
  onCloseSubcategoryModal,
  onSaveSubcategory,
  deletingCategory,
  onCloseDeleteCategory,
  onConfirmDeleteCategory,
  deletingSubcategory,
  onCloseDeleteSubcategory,
  onConfirmDeleteSubcategory,
  items = [],
}: CategoryModalsProps) {
  return (
    <>
      {/* 1. Category Modal (Add / Edit) */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
          onClick={onCloseCategoryModal}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="relative w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight">
                  {categoryModalMode === 'create' ? 'Add New Category' : 'Edit Category'}
                </h3>
                <span className="text-xs text-neutral-400 font-sans">
                  Main category for grouping portfolio works
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseCategoryModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.label}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  placeholder="e.g. Drone & Aerial / 3D Artwork"
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category Description
                </label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, description: e.target.value })
                  }
                  placeholder="Brief description of the works in this category..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseCategoryModal}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md"
                >
                  {categoryModalMode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Subcategory Modal (Add / Edit) */}
      {isSubcategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
          onClick={onCloseSubcategoryModal}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="relative w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight">
                  {subcategoryModalMode === 'create' ? 'Add Subcategory' : 'Edit Subcategory'}
                </h3>
                <span className="text-xs text-neutral-400 font-sans">
                  Specific sub-group under a main category
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseSubcategoryModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Select Parent Category *
                </label>
                <select
                  value={subcategoryFormData.categoryId}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      categoryId: e.target.value,
                    })
                  }
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={subcategoryFormData.label}
                  onChange={(e) =>
                    setSubcategoryFormData((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  placeholder="e.g. Graduation Shoot / Cinematic B-Roll"
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Subcategory Description
                </label>
                <textarea
                  rows={3}
                  value={subcategoryFormData.description}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description about this subcategory..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseSubcategoryModal}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md"
                >
                  {subcategoryModalMode === 'create' ? 'Add Subcategory' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Category Confirm Modal */}
      {deletingCategory && (() => {
        const childSubcategories = deletingCategory.subcategories || [];
        const linkedContentsForCategory = items.filter((i) => {
          if (i.category === deletingCategory.id) return true;
          if (i.categoryLabel && deletingCategory.label && i.categoryLabel.toLowerCase() === deletingCategory.label.toLowerCase()) return true;
          return childSubcategories.some(
            (s) =>
              s.id === i.subcategory ||
              (s.label && i.subcategoryLabel && s.label.toLowerCase() === i.subcategoryLabel.toLowerCase())
          );
        });
        const isCategoryInUse = childSubcategories.length > 0 || linkedContentsForCategory.length > 0;

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
            onClick={onCloseDeleteCategory}
          >
            {isCategoryInUse ? (
              // RESTRICTED: Category is in use -> Block deletion with clear warning
              <div
                data-lenis-prevent="true"
                onWheel={(e) => e.stopPropagation()}
                className="w-full max-w-lg my-auto bg-[#16161b] text-white rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      Cannot Delete: In Use
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseDeleteCategory}
                    className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
                  Cannot Delete Category &quot;{deletingCategory.label}&quot;
                </h3>

                <p className="text-xs text-neutral-300 leading-relaxed mb-4 font-sans">
                  This category cannot be deleted because it is currently in use by other data in the system. To preserve data integrity, you must delete or reassign associated items first.
                </p>

                {/* Dependency breakdown */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 mb-5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                    Associated Data (Dependencies):
                  </span>

                  {childSubcategories.length > 0 && (
                    <div className="flex items-start gap-3 text-xs text-neutral-200">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {childSubcategories.length} Active Subcategories
                        </p>
                        <p className="text-[11px] text-neutral-400 font-sans">
                          {childSubcategories.map((s) => s.label).slice(0, 4).join(', ')}
                          {childSubcategories.length > 4 ? ` (+${childSubcategories.length - 4} more)` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {linkedContentsForCategory.length > 0 && (
                    <div className="flex items-start gap-3 text-xs text-neutral-200">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {linkedContentsForCategory.length} Portfolio Works
                        </p>
                        <p className="text-[11px] text-neutral-400 font-sans">
                          Works or media are currently assigned to this category.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs flex items-start gap-2.5 mb-6">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                  <p className="leading-relaxed">
                    <strong>Notice:</strong> Please delete all <strong>works</strong> and <strong>subcategories</strong> under this category before deleting the main category.
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onCloseDeleteCategory}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider transition-all"
                  >
                    Understood &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              // ALLOWED: Category is empty -> Confirm delete
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
                  Delete Category &quot;{deletingCategory.label}&quot;?
                </h3>

                <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
                  This category has no subcategories or portfolio works attached to it. Are you sure you want to permanently delete this category?
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCloseDeleteCategory}
                    className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmDeleteCategory}
                    className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
                  >
                    Delete Category
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. Delete Subcategory Confirm Modal */}
      {deletingSubcategory && (() => {
        const sub = deletingSubcategory.subcategory;
        const linkedContentsForSubcategory = items.filter(
          (i) =>
            i.subcategory === sub.id ||
            (i.subcategoryLabel && sub.label && i.subcategoryLabel.toLowerCase() === sub.label.toLowerCase())
        );
        const isSubcategoryInUse = linkedContentsForSubcategory.length > 0;

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
            onClick={onCloseDeleteSubcategory}
          >
            {isSubcategoryInUse ? (
              // RESTRICTED: Subcategory is in use -> Block deletion with clear warning
              <div
                data-lenis-prevent="true"
                onWheel={(e) => e.stopPropagation()}
                className="w-full max-w-lg my-auto bg-[#16161b] text-white rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      Cannot Delete: In Use
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseDeleteSubcategory}
                    className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
                  Cannot Delete Subcategory &quot;{sub.label}&quot;
                </h3>

                <p className="text-xs text-neutral-300 leading-relaxed mb-4 font-sans">
                  This subcategory cannot be deleted because it is currently assigned to portfolio works.
                </p>

                {/* Dependency breakdown */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 mb-5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                    Associated Data (Dependencies):
                  </span>
                  <div className="flex items-start gap-3 text-xs text-neutral-200">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {linkedContentsForSubcategory.length} Portfolio Works
                      </p>
                      <p className="text-[11px] text-neutral-400 font-sans">
                        Works or media are currently assigned to this subcategory.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs flex items-start gap-2.5 mb-6">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                  <p className="leading-relaxed">
                    <strong>Notice:</strong> Please delete all <strong>portfolio works</strong> using this subcategory before deleting it.
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onCloseDeleteSubcategory}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider transition-all"
                  >
                    Understood &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              // ALLOWED: Subcategory is empty -> Confirm delete
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
                  Delete Subcategory &quot;{sub.label}&quot;?
                </h3>

                <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
                  This subcategory is not used by any portfolio works. Are you sure you want to permanently delete it?
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCloseDeleteSubcategory}
                    className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmDeleteSubcategory}
                    className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
                  >
                    Delete Subcategory
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
