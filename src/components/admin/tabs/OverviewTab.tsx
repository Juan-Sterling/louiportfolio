'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight, Play } from 'lucide-react';
import { AdminCategory } from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface OverviewTabProps {
  items: MediaItem[];
  categoriesList: AdminCategory[];
  onNavigateToContents: () => void;
  onEditItem: (item: MediaItem) => void;
}

export default function OverviewTab({
  items,
  categoriesList,
  onNavigateToContents,
  onEditItem,
}: OverviewTabProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metric Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
            Total Portfolio Works
          </span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-heading font-black text-5xl text-white">
              {items.length}
            </span>
            <span className="text-xs text-neutral-400 font-sans">Active Works</span>
          </div>
        </div>

        <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
            Video Works (YouTube)
          </span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-heading font-black text-5xl text-emerald-400">
              {items.filter((i) => i.type === 'video').length}
            </span>
            <span className="text-xs text-neutral-400 font-sans">Videos</span>
          </div>
        </div>

        <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
            Photos & Graphic Works
          </span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-heading font-black text-5xl text-white">
              {items.filter((i) => i.type === 'photo').length}
            </span>
            <span className="text-xs text-neutral-400 font-sans">Photos / Art</span>
          </div>
        </div>

        <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
            Main Categories
          </span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-heading font-black text-5xl text-white">
              {categoriesList.length}
            </span>
            <span className="text-xs text-neutral-400 font-sans">Categories</span>
          </div>
        </div>
      </div>

      {/* Works Distribution by Category & Subcategory */}
      <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white">
              Works Distribution by Category
            </h3>
            <p className="text-xs text-neutral-400">
              Total portfolio items for each category and its respective subcategories
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {items.length} Total Works Across {categoriesList.length} Categories
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categoriesList.map((cat) => {
            const catWorks = items.filter(
              (i) =>
                i.category === cat.id ||
                i.categoryLabel.toLowerCase() === cat.label.toLowerCase() ||
                cat.subcategories.some((s) => s.id === i.subcategory)
            );
            const percentage =
              items.length > 0 ? Math.round((catWorks.length / items.length) * 100) : 0;

            return (
              <div
                key={cat.id}
                className="bg-[#1a1a20] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-heading font-bold text-base uppercase text-white tracking-tight">
                        {cat.label}
                      </h4>
                      {cat.description && (
                        <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5 font-sans">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/10">
                        {catWorks.length} {catWorks.length === 1 ? 'work' : 'works'}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 block mt-1">
                        {percentage}% of total
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Subcategories Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">
                      Subcategories ({cat.subcategories.length})
                    </span>
                    {cat.subcategories.length === 0 ? (
                      <span className="text-xs text-neutral-500 italic block">
                        No subcategories added yet
                      </span>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.subcategories.map((sub) => {
                          const subCount = items.filter(
                            (i) =>
                              i.subcategory === sub.id ||
                              i.subcategoryLabel.toLowerCase() ===
                                sub.label.toLowerCase()
                          ).length;

                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                            >
                              <span className="text-xs text-neutral-300 font-medium truncate mr-2">
                                {sub.label}
                              </span>
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 shrink-0">
                                {subCount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Works Overview */}
      <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white">
              Recent Works
            </h3>
            <p className="text-xs text-neutral-400">
              Published works currently showcased on the live website
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToContents}
            className="text-xs uppercase font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>View All ({items.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="group bg-[#1a1a20] border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all flex flex-col"
            >
              <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.subcategoryLabel}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    </div>
                  </div>
                )}
                <span className="absolute top-2.5 left-2.5 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                  {item.categoryLabel}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm text-white uppercase tracking-tight line-clamp-1">
                    {item.subcategoryLabel}
                  </h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                    {item.description || 'No description provided'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Published
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
