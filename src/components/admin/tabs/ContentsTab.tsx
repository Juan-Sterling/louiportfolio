'use client';

import React from 'react';
import Image from 'next/image';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Play,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { AdminCategory } from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface ContentsTabProps {
  items: MediaItem[];
  filteredItems: MediaItem[];
  categoriesList: AdminCategory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedItemIds: string[];
  onToggleSelectItem: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenCreateContent: () => void;
  onOpenEditContent: (item: MediaItem) => void;
  onOpenDeleteContent: (item: MediaItem) => void;
  onOpenBulkEdit: () => void;
  onOpenBulkDelete: () => void;
  onDeselectAll: () => void;
}

export default function ContentsTab({
  items,
  filteredItems,
  categoriesList,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  selectedItemIds,
  onToggleSelectItem,
  onToggleSelectAll,
  onOpenCreateContent,
  onOpenEditContent,
  onOpenDeleteContent,
  onOpenBulkEdit,
  onOpenBulkDelete,
  onDeselectAll,
}: ContentsTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filter & Search Bar */}
      <div className="bg-[#15151a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by category, subcategory, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e24] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1e1e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#1e1e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Published (Live)</option>
            <option value="draft">Draft (Hidden)</option>
            <option value="archived">Archived</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateContent}
            className="bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-neutral-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Work</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {selectedItemIds.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-[#1a1a20] to-[#15151a] border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-emerald-500/30">
              {selectedItemIds.length}
            </div>
            <div>
              <span className="text-sm font-semibold text-white">
                {selectedItemIds.length} {selectedItemIds.length === 1 ? 'Work' : 'Works'} Selected
              </span>
              <span className="text-xs text-neutral-400 block font-sans">
                Apply bulk updates or deletion across all selected items
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={onOpenBulkEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-neutral-200 transition-all shadow"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bulk Edit</span>
            </button>

            <button
              type="button"
              onClick={onOpenBulkDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all border border-red-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>

            <button
              type="button"
              onClick={onDeselectAll}
              className="px-3 py-2 rounded-xl text-neutral-400 hover:text-white text-xs transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Contents Table */}
      <div className="bg-[#15151a] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-neutral-400 bg-[#121216]">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      filteredItems.every((item) => selectedItemIds.includes(item.id))
                    }
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    title={
                      filteredItems.length > 0 &&
                      filteredItems.every((item) => selectedItemIds.includes(item.id))
                        ? 'Deselect All'
                        : 'Select All'
                    }
                  />
                </th>
                <th className="py-4 px-6">Media</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs">
                    No portfolio works found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/[0.02] transition-colors group ${
                      selectedItemIds.includes(item.id) ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => onToggleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                      />
                    </td>

                    {/* Media */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                          <Image
                            src={item.image}
                            alt={item.subcategoryLabel}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                          {item.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-sm text-white uppercase tracking-tight line-clamp-1">
                            {item.subcategoryLabel}
                          </div>
                          <div className="text-xs text-neutral-400 line-clamp-1 font-sans">
                            {item.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Subcategory */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">
                          {item.categoryLabel}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {item.subcategoryLabel}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6">
                      {item.type === 'video' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                          <Video className="w-3 h-3" />
                          <span>Video</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                          <ImageIcon className="w-3 h-3" />
                          <span>Photo</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      {item.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Draft</span>
                        </span>
                      ) : item.status === 'archived' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 bg-neutral-500/10 border border-neutral-500/20 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                          <span>Archived</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Published</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEditContent(item)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                          title="Edit Work"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeleteContent(item)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                          title="Delete Work"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
