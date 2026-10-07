'use client';

import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import {
  AdminCategory,
  AdminSubCategory,
  CategoryFormData,
  SubcategoryFormData,
} from '@/types/admin';

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
      {deletingCategory && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={onCloseDeleteCategory}
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
              Delete Category &quot;{deletingCategory.label}&quot;?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
              Deleting this category will also remove all its subcategories and associated portfolio works. Are you sure you want to proceed?
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
                Delete Category & Contents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Subcategory Confirm Modal */}
      {deletingSubcategory && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={onCloseDeleteSubcategory}
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
              Delete Subcategory &quot;{deletingSubcategory.subcategory.label}&quot;?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
              This subcategory and its associated works will be permanently removed from your portfolio.
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
        </div>
      )}
    </>
  );
}
