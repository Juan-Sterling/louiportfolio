'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { TabType } from '@/types/admin';

interface AdminHeaderProps {
  activeTab: TabType;
  onLogout: () => void;
}

export default function AdminHeader({ activeTab, onLogout }: AdminHeaderProps) {
  return (
    <header className="px-6 md:px-10 py-5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#111115]/60 backdrop-blur-md sticky top-0 z-30">
      <div>
        <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
          {activeTab === 'overview' && 'Portfolio Overview'}
          {activeTab === 'contents' && 'Manage Portfolio Works'}
          {activeTab === 'categories' && 'Categories & Subcategories'}
        </h2>
        <p className="text-xs text-neutral-400 font-sans mt-0.5">
          LOUI Portfolio Content Management
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
