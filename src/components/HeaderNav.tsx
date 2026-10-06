'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export default function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Floating Dynamic Navbar that smoothly appears when scrolling down */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${scrolled
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
      >
        <div className="flex items-center gap-6 px-6 py-2.5 rounded-full bg-white/75 backdrop-blur-xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <a
            href="#hero"
            onClick={(e) => scrollToSection(e, 'hero')}
            className="flex items-center gap-2 pr-2 border-r border-black/10 group"
          >
            <div className="w-7 h-7 relative">
              <Image
                src="/images/loui-logo.png"
                alt="LOUI"
                fill
                sizes="28px"
                className="object-contain transition-transform group-hover:scale-110"
              />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-neutral-900">
              LOUI
            </span>
          </a>

          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-neutral-700">
            <a
              href="#work"
              onClick={(e) => scrollToSection(e, 'work')}
              className="hover:text-black transition-colors"
            >
              Work
            </a>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              className="flex items-center gap-1 bg-black text-[#edeced] px-3.5 py-1.5 rounded-full hover:bg-neutral-800 transition-colors"
            >
              <span>Contact</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
