"use client";

/**
 * Archive: the v4 landing page.
 *
 * v4 was the dark, antigravity-hero direction that briefly shipped as the
 * storefront's front door. The site has since reverted to the v3 layout, and
 * this is kept as the record of what v4 composed - the components it uses all
 * still live under components/v4.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { V4Header } from "@/components/v4/v4-header";
import { HeroAntigravity } from "@/components/v4/hero-antigravity";
import { TierLadderVisualizer } from "@/components/v4/tier-ladder-visualizer";
import { ProductCard3D, CatalogueProduct } from "@/components/v4/product-card-3d";
import { RunnerRequestFlow } from "@/components/v4/runner-request-flow";
import { SupplierRadar } from "@/components/v4/supplier-radar";
import { V4Footer } from "@/components/v4/v4-footer";
import { Grid } from "lucide-react";

// Real AfriDeal Catalogue Items with photographs and published tier prices
const CATALOGUE_PRODUCTS: CatalogueProduct[] = [
  {
    id: "p014",
    name: "HD Lace Frontal 13×4 (Virgin Hair)",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p014-frontal.jpg",
    supplierCost: 715,
    retailPrice: 1144,
    bulkPrice: 1030,
    stockStatus: "In Stock",
    supplierCity: "Gaborone",
    supplierCountry: "BW",
    leadTimeDays: 1,
  },
  {
    id: "p001",
    name: "Brazilian Virgin Hair 3-Bundle Pack 24\"",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p001-bundles.jpg",
    supplierCost: 1250,
    retailPrice: 2000,
    bulkPrice: 1800,
    stockStatus: "In Stock",
    supplierCity: "Gaborone",
    supplierCountry: "BW",
    leadTimeDays: 1,
  },
  {
    id: "p002",
    name: "Raw Cambodian Straight Weave 28\"",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p002-cambodian.jpg",
    supplierCost: 950,
    retailPrice: 1520,
    bulkPrice: 1368,
    stockStatus: "In Stock",
    supplierCity: "Johannesburg",
    supplierCountry: "ZA",
    leadTimeDays: 3,
  },
  {
    id: "p003",
    name: "Full Lace Bob Wig 12\" Natural Black",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p003-bob-wig.jpg",
    supplierCost: 1100,
    retailPrice: 1760,
    bulkPrice: 1584,
    stockStatus: "In Stock",
    supplierCity: "Gaborone",
    supplierCountry: "BW",
    leadTimeDays: 1,
  },
  {
    id: "p008",
    name: "Commercial Hair Salon Dryer Chair",
    category: "Beauty & Personal Care",
    image: "/unsplash/assets/p008-salon-chair.jpg",
    supplierCost: 3200,
    retailPrice: 5120,
    bulkPrice: 4608,
    stockStatus: "Low Stock",
    supplierCity: "Johannesburg",
    supplierCountry: "ZA",
    leadTimeDays: 4,
  },
  {
    id: "p011",
    name: "Solar Hybrid Inverter 5.5kVA",
    category: "Electronics",
    image: "/unsplash/assets/p011-solar-inverter.jpg",
    supplierCost: 4800,
    retailPrice: 7680,
    bulkPrice: 6912,
    stockStatus: "In Stock",
    supplierCity: "Gaborone",
    supplierCountry: "BW",
    leadTimeDays: 2,
  }
];

export default function V4Page() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Hair Weaves & Extensions", "Beauty & Personal Care", "Electronics"];

  const filteredProducts = selectedCategory === "All"
    ? CATALOGUE_PRODUCTS
    : CATALOGUE_PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <main className="min-h-screen bg-[#18181B] text-gray-100 selection:bg-[#E5A00D] selection:text-black">

      {/* Sticky Header */}
      <V4Header />

      {/* 3D Antigravity Floating Hero */}
      <HeroAntigravity />

      {/* Interactive Price Ladder Visualizer */}
      <TierLadderVisualizer />

      {/* Main Catalogue Section */}
      <section id="catalogue" className="py-20 px-4 sm:px-6 bg-[#070a08] relative">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Header & Category Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-3">
                <Grid className="w-3.5 h-3.5" />
                <span>Live Catalogue</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Curated Trade Goods
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-[#E5A00D] to-amber-500 text-black font-bold shadow-lg shadow-[#E5A00D]/5"
                      : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/5 hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Product Cards Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProducts.map((product) => (
              <ProductCard3D key={product.id} product={product} />
            ))}
          </motion.div>

        </div>
      </section>

      {/* Runner Sourcing Flow */}
      <RunnerRequestFlow />

      {/* Verified Supplier Reliability Radar */}
      <SupplierRadar />

      {/* Footer */}
      <V4Footer />

    </main>
  );
}
