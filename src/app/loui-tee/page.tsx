import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, ExternalLink } from 'lucide-react';
import ContactSection from '@/components/ContactSection';

export const metadata = {
  title: 'Loui Tee — Official Apparel & Merchandise',
  description: 'Exclusive streetwear and graphic tees by LOUI. Available on Tokopedia and Shopee.',
};

export default function LouiTeePage() {
  const products = [
    {
      name: 'CRISTIANO RONALDO VINTAGE TEE',
      color: 'Washed Charcoal Black',
      material: '24s Heavyweight Premium Cotton',
      print: 'High-Density Vintage Screen Print',
      status: 'Available Now',
    },
    {
      name: 'LEGENDS SIGNATURE DROP',
      color: 'Off-White Cream',
      material: '24s Heavyweight Premium Cotton',
      print: 'Editorial Typography & Graphics',
      status: 'Limited Edition',
    },
    {
      name: 'BANDUNG PRIDE EDITORIAL TEE',
      color: 'Pitch Black',
      material: '20s Heavy Oversized Fit',
      print: 'Silkscreen Archival Graphic',
      status: 'Best Seller',
    },
  ];

  return (
    <main className="min-h-screen bg-[#edeced] flex flex-col">
      {/* Top Bar with Back Link */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-800 hover:text-black transition-transform hover:-translate-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO HOME</span>
        </Link>

        <div className="w-8 h-8 relative">
          <Image src="/images/loui-logo.png" alt="LOUI" fill className="object-contain" />
        </div>
      </header>

      {/* Hero Header */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-16">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold block mb-3">
          COLLECTION // 04
        </span>
        <h1 className="font-heading font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tight text-neutral-900 leading-[0.88] mb-6">
          LOUI
          <br />
          TEE
        </h1>
        <p className="max-w-2xl text-neutral-700 text-base md:text-lg leading-relaxed font-sans mb-8">
          Heavyweight graphic apparel blending football iconography, 90s vintage bootleg aesthetics, and contemporary streetwear culture.
        </p>

        {/* Quick Purchase CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="https://www.tokopedia.com/louiofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-black text-[#edeced] font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-neutral-800 transition-all hover:scale-105"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shop on Tokopedia</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          <a
            href="https://shopee.co.id/shop/236299427"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-white text-black border border-black/15 font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-black hover:text-white transition-all hover:scale-105"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shop on Shopee</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>

        {/* Featured Showcase Hero Image */}
        <div className="mt-12 relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[32px] md:rounded-[44px] overflow-hidden shadow-2xl bg-neutral-900">
          <Image
            src="/images/loui-tee.png"
            alt="Loui Tee Model"
            fill
            priority
            className="object-cover object-top"
          />
        </div>
      </section>

      {/* Product Spec Cards */}
      <section className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl uppercase tracking-tight text-neutral-900 mb-8">
          COLLECTION SPECIFICATIONS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((item, idx) => (
            <div
              key={idx}
              className="bg-white/70 backdrop-blur-sm border border-black/5 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between hover:bg-white transition-all duration-300 hover:shadow-xl"
            >
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full inline-block mb-4">
                  {item.status}
                </span>

                <h3 className="font-heading font-bold text-2xl uppercase tracking-tight text-neutral-900 mb-4">
                  {item.name}
                </h3>

                <ul className="space-y-2 text-sm text-neutral-600 font-sans mb-8">
                  <li>
                    <strong className="text-neutral-900">Colorway:</strong> {item.color}
                  </li>
                  <li>
                    <strong className="text-neutral-900">Material:</strong> {item.material}
                  </li>
                  <li>
                    <strong className="text-neutral-900">Print:</strong> {item.print}
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-black/5">
                <a
                  href="https://www.tokopedia.com/louiofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 px-4 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                >
                  Buy Tokopedia
                </a>
                <a
                  href="https://shopee.co.id/shop/236299427"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 px-4 rounded-full border border-neutral-300 text-neutral-800 text-xs font-semibold hover:border-black transition-colors"
                >
                  Buy Shopee
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Contact */}
      <ContactSection />
    </main>
  );
}
