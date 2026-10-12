'use client';

import React from 'react';
import {
  FolderPlus,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  LayoutGrid,
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
  onToggleCategoryStatus?: (category: AdminCategory) => void;
  onToggleSubcategoryStatus?: (categoryId: string, subcategory: AdminSubCategory) => void;
  onNavigateToLayout?: (subcategoryId: string) => void;
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
  onToggleCategoryStatus,
  onToggleSubcategoryStatus,
  onNavigateToLayout,
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
            Create, edit, hide (archive), or delete main categories and subcategories.
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
      {categoriesList.length === 0 ? (
        <div className="bg-[#15151a] border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <p className="text-sm text-neutral-400 font-sans mb-4">
            No categories found in the database.
          </p>
          <button
            type="button"
            onClick={onOpenCreateCategory}
            className="flex items-center gap-2 bg-white text-black font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-neutral-200 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoriesList.map((cat) => {
            const childSubcategoriesCount = cat.subcategories.length;
            const linkedContentsCount = items.filter((i) => {
              if (i.category === cat.id) return true;
              if (i.categoryLabel && cat.label && i.categoryLabel.toLowerCase() === cat.label.toLowerCase()) return true;
              return cat.subcategories.some(
                (s) =>
                  s.id === i.subcategory ||
                  (s.label && i.subcategoryLabel && s.label.toLowerCase() === i.subcategoryLabel.toLowerCase())
              );
            }).length;
            const isCatInUse = childSubcategoriesCount > 0 || linkedContentsCount > 0;
            const isCatArchived = cat.status === 'archived';

            return (
              <div
                key={cat.id}
                className={`border rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                  isCatArchived
                    ? 'bg-[#121216] border-white/5 opacity-90'
                    : 'bg-[#15151a] border-white/10'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-white/10 text-white px-2.5 py-0.5 rounded-full">
                        {linkedContentsCount} Works
                      </span>
                      {isCatArchived ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Eye className="w-3 h-3" />
                          Visible
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Hide / Unhide Category button */}
                      <button
                        type="button"
                        onClick={() => onToggleCategoryStatus?.(cat)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isCatArchived
                            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                            : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white'
                        }`}
                        title={
                          isCatArchived
                            ? 'Unhide Category (Make visible on main page)'
                            : 'Hide Category (Archive and hide from main page)'
                        }
                      >
                        {isCatArchived ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => onOpenEditCategory(cat)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                        title="Edit Category"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onOpenDeleteCategory(cat)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isCatInUse
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                        }`}
                        title={
                          isCatInUse
                            ? `Category in use (${linkedContentsCount} works, ${childSubcategoriesCount} subcategories) - Click for details`
                            : 'Delete Category'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-2 flex items-center gap-2">
                    <span className={isCatArchived ? 'text-neutral-300' : 'text-white'}>
                      {cat.label}
                    </span>
                  </h3>

                  {isCatArchived && (
                    <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 font-sans">
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Category is hidden. All contents in this category are automatically hidden (archived) from the main website.
                      </span>
                    </div>
                  )}

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
                        const subItemCount = items.filter(
                          (i) =>
                            i.subcategory === sub.id ||
                            (i.subcategoryLabel &&
                              sub.label &&
                              i.subcategoryLabel.toLowerCase() === sub.label.toLowerCase())
                        ).length;
                        const isSubInUse = subItemCount > 0;
                        const isSubArchived = sub.status === 'archived';

                        return (
                          <div
                            key={sub.id}
                            className={`group flex items-center gap-2 text-xs border pl-3 pr-2 py-1.5 rounded-xl transition-all ${
                              isSubArchived
                                ? 'bg-white/[0.03] border-white/5 text-neutral-400'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-200'
                            }`}
                          >
                            <span className={isSubArchived ? 'line-through text-neutral-500' : ''}>
                              {sub.label}
                            </span>
                            {isSubArchived ? (
                              <span className="text-[9px] font-mono uppercase bg-neutral-800 text-amber-400/90 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                                <EyeOff className="w-2.5 h-2.5" /> Hidden
                              </span>
                            ) : (
                              subItemCount > 0 && (
                                <span
                                  className="text-[10px] font-mono text-neutral-400 bg-black/40 px-1.5 py-0.5 rounded-md"
                                  title={`${subItemCount} works in this subcategory`}
                                >
                                  {subItemCount}
                                </span>
                              )
                            )}
                            <div className="flex items-center gap-0.5 ml-1">
                              {/* Open Custom Layout for this Subcategory */}
                              {onNavigateToLayout && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToLayout(sub.id)}
                                  className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
                                  title={`Atur Tata Letak Galeri untuk "${sub.label}"`}
                                >
                                  <LayoutGrid className="w-3 h-3" />
                                </button>
                              )}

                              {/* Toggle Subcategory Visibility */}
                              <button
                                type="button"
                                onClick={() => onToggleSubcategoryStatus?.(cat.id, sub)}
                                className={`p-1 transition-colors ${
                                  isSubArchived
                                    ? 'text-amber-400 hover:text-amber-300'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                                title={
                                  isSubArchived
                                    ? 'Unhide Subcategory (Make visible)'
                                    : 'Hide Subcategory (Archive)'
                                }
                              >
                                {isSubArchived ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
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
                                className={`p-1 transition-colors ${
                                  isSubInUse
                                    ? 'text-amber-400/80 hover:text-amber-400'
                                    : 'text-red-400/70 hover:text-red-400'
                                }`}
                                title={
                                  isSubInUse
                                    ? `Subcategory in use (${subItemCount} works) - Click for details`
                                    : 'Delete Subcategory'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}
    </div>
  );
}
