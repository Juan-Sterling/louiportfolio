'use client';

import React from 'react';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative w-full max-w-7xl mx-auto px-6 md:px-12 pt-4 pb-12 md:pb-16 select-none"
    >
      {/* 3-Column Hero Layout matching Canva */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center justify-between gap-6 md:gap-4 w-full">
        {/* Left Column: Location */}
        <div className="text-left text-xs sm:text-sm md:text-[15px] font-medium leading-relaxed tracking-tight text-neutral-900 font-sans order-2 md:order-1">
          <p className="tracking-wide">BASED IN BANDUNG,</p>
          <p className="tracking-wide">WEST JAVA, INDONESIA</p>
        </div>

        {/* Center Column: Logo & Portfolio Title */}
        <div className="flex flex-col items-center justify-center text-center order-1 md:order-2">
          <div className="relative w-[200px] sm:w-[260px] md:w-[320px] lg:w-[360px] h-[90px] sm:h-[120px] md:h-[140px] lg:h-[160px] transition-transform duration-500 hover:scale-105">
            <Image
              src="/images/loui-logo.png"
              alt="LOUI"
              fill
              priority
              sizes="(max-width: 640px) 200px, (max-width: 1024px) 320px, 360px"
              className="object-contain"
            />
          </div>

          <h1 className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base font-semibold tracking-[0.25em] text-neutral-900 uppercase font-sans">
            PORTFOLIO
          </h1>
        </div>

        {/* Right Column: Copyright */}
        <div className="text-left md:text-right text-xs sm:text-sm md:text-[15px] font-medium tracking-wide text-neutral-900 font-sans order-3">
          <p>© 2025 LOUI</p>
        </div>
      </div>
    </section>
  );
}
