'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // UJI COBA OPSI B: Nonaktifkan Lenis sementara untuk menguji Native Hardware Scroll
  // Untuk mengaktifkan kembali Lenis kapan saja, cukup ubah nilai ini menjadi true!
  const ENABLE_LENIS = false;

  useEffect(() => {
    // Jangan jalankan Lenis jika dinonaktifkan atau di area admin
    if (!ENABLE_LENIS || isAdmin) return;

    const lenis = new Lenis({
      duration: 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
    });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [ENABLE_LENIS, isAdmin]);

  return <>{children}</>;
}
