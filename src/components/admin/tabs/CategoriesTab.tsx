'use client';

import React from 'react';
import {
  FolderPlus,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { AdminCategory, AdminSubCategory } from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface CategoriesTabProps {
  categoriesList: AdminCategory[];
  items: MediaItem[];
  onOpenCreateCategory: () => void;
  onOpenEditCategory: (category: AdminCategory) => void;
  onOpenDeleteCategory: (category: AdminCategory) => void;
  onOpenCreateSubcategory: (parentCategoryId?: string) => void;
  onOpenEditSubcategory: (categoryId: string, subcategory: AdminSubCategory) => void;
  onOpenDeleteSubcategory: (categoryId: string, subcategory: AdminSubCategory) => void;
}

export default function CategoriesTab({
  categoriesList,
  items,
  onOpenCreateCategory,
  onOpenEditCategory,
  onOpenDeleteCategory,
  onOpenCreateSubcategory,
  onOpenEditSubcategory,
  onOpenDeleteSubcategory,
}: CategoriesTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Box with Add Actions */}
      <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-1">
            Manage Categories & Subcategories
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans">
            Create, edit, or delete main categories and subcategories freely.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenCreateSubcategory()}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Add Subcategory</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateCategory}
            className="flex items-center gap-2 bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-neutral-200 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* Categories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categoriesList.map((cat) => {
          const itemCount = items.filter((i) => i.categoryLabel === cat.label).length;

          return (
            <div
              key={cat.id}
              className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono bg-white/10 text-white px-2.5 py-0.5 rounded-full">
                    {itemCount} Works
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenEditCategory(cat)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDeleteCategory(cat)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-2">
                  {cat.label}
                </h3>

                <p className="text-xs text-neutral-400 font-sans leading-relaxed mb-6">
                  {cat.description || 'No additional description provided.'}
                </p>
              </div>

              {/* Subcategories List */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Subcategories ({cat.subcategories.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenCreateSubcategory(cat.id)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subcategory</span>
                  </button>
                </div>

                {cat.subcategories.length === 0 ? (
                  <p className="text-xs text-neutral-500 font-mono py-2">
                    No subcategories yet. Click &quot;+ Add Subcategory&quot; above.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.map((sub) => {
                      return (
                        <div
                          key={sub.id}
                          className="group flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 pl-3 pr-2 py-1.5 rounded-xl text-neutral-200 transition-all"
                        >
                          <span>{sub.label}</span>
                          <button
                            type="button"
                            onClick={() => onOpenEditSubcategory(cat.id, sub)}
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                            title="Edit Subcategory"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDeleteSubcategory(cat.id, sub)}
                            className="p-1 text-red-400/70 hover:text-red-400 transition-colors"
                            title="Delete Subcategory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
