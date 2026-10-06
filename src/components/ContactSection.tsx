'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowUp, Check, Copy } from 'lucide-react';

export default function ContactSection() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      id="contact"
      className="relative w-full bg-black text-[#edeced] pt-20 md:pt-28 pb-14 px-6 md:px-12 select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Section Heading */}
        <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider text-center mb-16 md:mb-24 text-[#edeced]">
          CONTACT
        </h2>

        {/* 3 Channels / Blocks Grid matching Canva */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-8 lg:gap-12 items-start justify-items-center text-center">
          {/* Block 1: Reach Me On */}
          <div className="flex flex-col items-center group">
            <h3 className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-neutral-300 mb-6 font-sans">
              YOU CAN REACH ME ON :
            </h3>
            <div className="flex items-center gap-6 sm:gap-8">
              {/* WhatsApp */}
              <a
                href="https://api.whatsapp.com/send/?phone=62895621072782&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 hover:scale-110 active:scale-95"
                title="Chat on WhatsApp (+62 895-6210-72782)"
                aria-label="WhatsApp"
              >
                <Image
                  src="/images/whatsapp.svg"
                  alt="WhatsApp"
                  fill
                  className="object-contain opacity-95 hover:opacity-100 transition-opacity"
                />
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/aldyloui/"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 hover:scale-110 active:scale-95"
                title="Follow on Instagram (@aldyloui)"
                aria-label="Instagram"
              >
                <Image
                  src="/images/instagram.svg"
                  alt="Instagram"
                  fill
                  className="object-contain opacity-95 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>

            {/* Quick action buttons */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => handleCopy('+62895621072782', 'wa')}
                className="text-[11px] font-sans tracking-wider text-neutral-400 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                {copiedText === 'wa' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy WA</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopy('@aldyloui', 'ig')}
                className="text-[11px] font-sans tracking-wider text-neutral-400 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                {copiedText === 'ig' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy IG</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Block 2: More Videos */}
          <div className="flex flex-col items-center group">
            <h3 className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-neutral-300 mb-6 font-sans">
              MORE VIDEOS AVAILABLE ON :
            </h3>
            <a
              href="https://www.youtube.com/@GeraldyLouis"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-24 h-16 sm:w-28 sm:h-20 transition-all duration-300 hover:scale-110 active:scale-95"
              title="Watch on YouTube (@GeraldyLouis)"
              aria-label="YouTube"
            >
              <Image
                src="/images/youtube.svg"
                alt="YouTube"
                fill
                className="object-contain opacity-95 hover:opacity-100 transition-opacity"
              />
            </a>

            <div className="mt-5">
              <a
                href="https://www.youtube.com/@GeraldyLouis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-sans tracking-wider text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/10 transition-colors inline-block"
              >
                @GeraldyLouis
              </a>
            </div>
          </div>

          {/* Block 3: Loui Tee Shop */}
          <div className="flex flex-col items-center group">
            <h3 className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-neutral-300 mb-6 font-sans">
              LOUI TEE CAN BE PURCHASED ON :
            </h3>
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Tokopedia */}
              <a
                href="https://www.tokopedia.com/louiofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center justify-center"
                title="Shop on Tokopedia (louiofficial)"
                aria-label="Tokopedia"
              >
                <div className="relative w-full h-full">
                  <Image
                    src="/images/tokopedia.png"
                    alt="Tokopedia"
                    fill
                    className="object-contain filter brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
                  />
                </div>
              </a>

              {/* Shopee */}
              <a
                href="https://shopee.co.id/shop/236299427"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 hover:scale-110 active:scale-95 flex flex-col items-center justify-center"
                title="Shop on Shopee"
                aria-label="Shopee"
              >
                <div className="relative w-full h-full">
                  <Image
                    src="/images/shopee.png"
                    alt="Shopee"
                    fill
                    className="object-contain filter brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
                  />
                </div>
              </a>
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href="https://www.tokopedia.com/louiofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-sans tracking-wider text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                Tokopedia
              </a>
              <a
                href="https://shopee.co.id/shop/236299427"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-sans tracking-wider text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                Shopee
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Divider & Copyright */}
        <div className="w-full mt-20 pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="text-neutral-500">Bandung, West Java, Indonesia</span>
            <span>•</span>
            <span className="text-neutral-500">All Rights Reserved</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-neutral-300 font-medium">© 2026 LOUI</span>

            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full"
              aria-label="Scroll to top"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
