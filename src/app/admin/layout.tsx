import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin CMS — LOUI Portfolio',
  description: 'Manage contents, categories, media, and publications for LOUI portfolio.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#f1f1f3] antialiased">
      {children}
    </div>
  );
}
