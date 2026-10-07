'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  ExternalLink,
  User,
  KeyRound,
} from 'lucide-react';
import { TabType, AdminCategory } from '@/types/admin';
import { MediaItem } from '@/data/portfolioData';

interface AdminSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: { email?: string; id?: string } | null;
  items: MediaItem[];
  categoriesList: AdminCategory[];
  onOpenChangePassword: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  items,
  categoriesList,
  onOpenChangePassword,
}: AdminSidebarProps) {
  return (
    <aside className="w-full md:w-64 bg-[#131317] border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-6 shrink-0">
      <div>
        {/* Logo & Platform Name */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black font-bold flex items-center justify-center font-heading text-lg">
              L
            </div>
            <div>
              <h1 className="font-heading font-black text-lg tracking-tight uppercase">
                LOUI PORTFOLIO
              </h1>
              <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
                Admin Platform
              </span>
            </div>
          </div>
        </div>

        {/* User Auth Info */}
        {currentUser && (
          <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span
                className="text-xs font-mono text-neutral-300 truncate"
                title={currentUser.email}
              >
                {currentUser.email}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="text-neutral-400 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-lg shrink-0"
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Clean Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contents')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'contents'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Portfolio Works</span>
            <span className="ml-auto text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'categories'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories & Subcategories</span>
            <span className="ml-auto text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
              {categoriesList.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="pt-6 border-t border-white/10 flex flex-col gap-2.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
        >
          <span>View Live Website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
