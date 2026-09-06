import React from "react";
import { V5Header } from "@/components/v5/v5-header";
import { HeroEditorial } from "@/components/v5/hero-editorial";
import { ReceiptLadder } from "@/components/v5/receipt-ladder";
import { BrutalistProductCard } from "@/components/v5/product-card-brutalist";
import { RunnerDossier } from "@/components/v5/runner-dossier";
import { V5Footer } from "@/components/v5/v5-footer";

import productsData from "@/data/products.json";

export default function V5Page() {
  // Grab a few products for the grid
  const showcaseProducts = productsData.slice(0, 4);

  return (
    <main className="bg-[#F4F4F5] min-h-screen">
      <V5Header />
      
      <HeroEditorial />

      {/* Tactile Trade Grid Section */}
      <section className="py-24 px-4 sm:px-8 border-b border-[#111111]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-4 border-b-2 border-[#111111]">
            <h2 className="font-serif text-4xl sm:text-5xl text-[#111111] leading-none">
              Market Index
            </h2>
            <p className="font-mono text-sm text-[#71717A] uppercase tracking-widest mt-4 md:mt-0">
              Live Trade Floor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {showcaseProducts.map((p: any) => (
              <BrutalistProductCard 
                key={p.id}
                id={p.id}
                name={p.name}
                category={p.category}
                price={p.price.toLocaleString()}
                moq={p.moq}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Runner Dossier Section */}
      <section className="py-24 px-4 sm:px-8 border-b border-[#111111] bg-white">
        <div className="max-w-7xl mx-auto">
           <RunnerDossier />
        </div>
      </section>

      {/* Receipt Ladder Section */}
      <section className="py-24 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#111111] leading-[0.9] mb-6">
              Institutional Pricing. <br/>
              <span className="italic font-light">Zero Obfuscation.</span>
            </h2>
            <p className="font-sans text-[#71717A] text-lg max-w-md">
              Our volume tiers are cryptographically verified and presented without sales-tactics. What you see is the executed trade value.
            </p>
          </div>
          <div className="lg:w-1/2 w-full flex justify-center lg:justify-end">
            <ReceiptLadder />
          </div>
        </div>
      </section>

      <V5Footer />
    </main>
  );
}
